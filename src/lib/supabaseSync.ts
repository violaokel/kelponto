import { supabase, mapEmployeeToSupabase, mapEmployeeFromSupabase, mapRecordToSupabase, mapRecordFromSupabase, mapScheduleToSupabase, mapScheduleFromSupabase, toUUID } from './supabaseClient';
import { Employee, TimeRecord, WorkSchedule } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  errorDetail?: string;
  data?: {
    employees: Employee[];
    records: TimeRecord[];
    schedules: WorkSchedule[];
  };
}

// Function to push local data to Supabase
export async function pushLocalDataToSupabase(
  employees: Employee[],
  records: TimeRecord[],
  schedules: WorkSchedule[]
): Promise<SyncResult> {
  try {
    const localEmployeeIds = employees.map(e => toUUID(e.id));
    const localRecordIds = records.map(r => toUUID(r.id));
    const localScheduleIds = schedules.map(s => toUUID(s.id));

    // 1. Delete removed records from Supabase first (to prevent orphaned or conflict states)
    const { data: dbRecs, error: getRecErr } = await supabase.from('registros_ponto').select('id');
    if (!getRecErr && dbRecs) {
      const dbRecIds = dbRecs.map((d: any) => d.id);
      const toDeleteRecs = dbRecIds.filter((id: string) => !localRecordIds.includes(id));
      if (toDeleteRecs.length > 0) {
        await supabase.from('registros_ponto').delete().in('id', toDeleteRecs);
      }
    }

    // 2. Delete removed schedules from Supabase
    const { data: dbSchs, error: getSchErr } = await supabase.from('escalas').select('id');
    if (!getSchErr && dbSchs) {
      const dbSchIds = dbSchs.map((d: any) => d.id);
      const toDeleteSchs = dbSchIds.filter((id: string) => !localScheduleIds.includes(id));
      if (toDeleteSchs.length > 0) {
        await supabase.from('escalas').delete().in('id', toDeleteSchs);
      }
    }

    // 3. Delete removed employees from Supabase
    const { data: dbEmps, error: getEmpErr } = await supabase.from('funcionarios').select('id');
    if (!getEmpErr && dbEmps) {
      const dbEmpIds = dbEmps.map((d: any) => d.id);
      const toDeleteEmps = dbEmpIds.filter((id: string) => !localEmployeeIds.includes(id));
      if (toDeleteEmps.length > 0) {
        await supabase.from('funcionarios').delete().in('id', toDeleteEmps);
      }
    }

    // 4. Upsert Employees
    if (employees.length > 0) {
      const mappedEmps = employees.map(mapEmployeeToSupabase);
      const { error: empErr } = await supabase.from('funcionarios').upsert(mappedEmps, { onConflict: 'id' });
      if (empErr) {
        return {
          success: false,
          message: 'Erro ao enviar Funcionários para o Supabase.',
          errorDetail: empErr.message
        };
      }
    }

    // 5. Upsert Schedules (escalas)
    if (schedules.length > 0) {
      const mappedSchs = schedules.map(mapScheduleToSupabase);
      const { error: schErr } = await supabase.from('escalas').upsert(mappedSchs, { onConflict: 'id' });
      if (schErr) {
        return {
          success: false,
          message: 'Erro ao enviar Escalas de Trabalho para o Supabase.',
          errorDetail: schErr.message
        };
      }

      // Re-populate joint relations: escala_funcionarios
      // Collect relation rows
      const localEmployeeIdsSet = new Set(localEmployeeIds);
      const relationRows: { escala_id: string; funcionario_id: string }[] = [];
      schedules.forEach(sch => {
        if (sch.employeeIds && Array.isArray(sch.employeeIds)) {
          sch.employeeIds.forEach(empId => {
            const empUuid = toUUID(empId);
            if (localEmployeeIdsSet.has(empUuid)) {
              relationRows.push({
                escala_id: toUUID(sch.id),
                funcionario_id: empUuid
              });
            }
          });
        }
      });

      if (relationRows.length > 0) {
        // Clear old junction relations for these schedules to prevent ghost or obsolete relations
        const scheduleIds = schedules.map(s => toUUID(s.id));
        const { error: delErr } = await supabase
          .from('escala_funcionarios')
          .delete()
          .in('escala_id', scheduleIds);

        if (!delErr) {
          const { error: insErr } = await supabase
            .from('escala_funcionarios')
            .insert(relationRows);
          if (insErr) {
            console.error('Erro ao inserir associados escala_funcionarios:', insErr);
          }
        }
      }
    }

    // 6. Upsert Time Records (registros_ponto)
    if (records.length > 0) {
      const dbEmployeeIdsSet = new Set(localEmployeeIds);
      const validRecords = records.filter(r => dbEmployeeIdsSet.has(toUUID(r.employeeId)));
      if (validRecords.length > 0) {
        const mappedRecords = validRecords.map(mapRecordToSupabase);
        const { error: recErr } = await supabase.from('registros_ponto').upsert(mappedRecords, { onConflict: 'id' });
        if (recErr) {
          return {
            success: false,
            message: 'Erro ao enviar Registros de Ponto para o Supabase.',
            errorDetail: recErr.message
          };
        }
      }
    }

    return {
      success: true,
      message: 'Todos os dados foram enviados para o Supabase com sucesso!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro inesperado na sincronização.',
      errorDetail: err.message || String(err)
    };
  }
}

// Function to pull data from Supabase
export async function pullDataFromSupabase(): Promise<SyncResult> {
  try {
    // 1. Fetch Employees
    const { data: emps, error: empErr } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome_completo');

    if (empErr) {
      return {
        success: false,
        message: 'Erro ao buscar Funcionários no Supabase. Por favor verifique se executou o script SQL no painel de controle.',
        errorDetail: empErr.message
      };
    }

    // 2. Fetch Time Records
    const { data: recs, error: recErr } = await supabase
      .from('registros_ponto')
      .select('*')
      .order('data', { ascending: false })
      .order('hora', { ascending: false });

    if (recErr) {
      return {
        success: false,
        message: 'Erro ao buscar Registros de Ponto no Supabase.',
        errorDetail: recErr.message
      };
    }

    // 3. Fetch Schedules and junctions
    const { data: schs, error: schErr } = await supabase
      .from('escalas')
      .select('*')
      .order('data');

    if (schErr) {
      return {
        success: false,
        message: 'Erro ao buscar Escalas de Trabalho no Supabase.',
        errorDetail: schErr.message
      };
    }

    const { data: junctions, error: jncErr } = await supabase
      .from('escala_funcionarios')
      .select('*');

    if (jncErr) {
      return {
        success: false,
        message: 'Erro ao buscar dependências auxiliares de Escala no Supabase.',
        errorDetail: jncErr.message
      };
    }

    // Build schedules with their employee relations mapped
    const parsedEmployees = (emps || []).map(mapEmployeeFromSupabase);
    const parsedRecords = (recs || []).map(mapRecordFromSupabase);
    
    const parsedSchedules = (schs || []).map(row => {
      // Find related employee ids
      const matchedEmpIds = (junctions || [])
        .filter(jStr => jStr.escala_id === row.id)
        .map(jStr => jStr.funcionario_id);
      return mapScheduleFromSupabase(row, matchedEmpIds);
    });

    return {
      success: true,
      message: 'Dados baixados do Supabase com sucesso!',
      data: {
        employees: parsedEmployees,
        records: parsedRecords,
        schedules: parsedSchedules
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro inesperado ao puxar dados do banco.',
      errorDetail: err.message || String(err)
    };
  }
}

// Function to wipe all data from Supabase tables
export async function wipeAllSupabaseData(): Promise<SyncResult> {
  try {
    // 1. Delete junctions
    const { error: errJnc } = await supabase.from('escala_funcionarios').delete().neq('funcionario_id', '00000000-0000-0000-0000-000000000000');
    // 2. Delete registers
    const { error: errRec } = await supabase.from('registros_ponto').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // 3. Delete schedules
    const { error: errSch } = await supabase.from('escalas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // 4. Delete employees
    const { error: errEmp } = await supabase.from('funcionarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (errJnc || errRec || errSch || errEmp) {
      return {
        success: false,
        message: 'Algumas tabelas do Supabase não puderam ser limpas, verifique suas permissões.',
        errorDetail: (errJnc?.message || errRec?.message || errSch?.message || errEmp?.message)
      };
    }

    return {
      success: true,
      message: 'Todos os registros do Supabase foram excluídos com sucesso!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Não foi possível limpar os registros remotos no Supabase.',
      errorDetail: err.message || String(err)
    };
  }
}

