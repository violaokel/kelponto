import { createClient } from '@supabase/supabase-js';
import { Employee, TimeRecord, WorkSchedule } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mtnrssxyqtsrzdvyownc.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zuA5b6VDjGcpOkAwBCP8mA_bpKP82Lb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to turn non-UUIDs (e.g., 'emp-1', 'rec-123') into valid deterministic UUIDs
export function toUUID(id: string): string {
  if (!id) return '';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  // Let's create a deterministic hash code
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const hexHash = Math.abs(hash).toString(16).padStart(12, '0');

  // Prefix based on the type of ID input
  let prefix = '11111111-1111-1111-1111-';
  if (id.startsWith('emp')) prefix = 'e1111111-1111-1111-1111-';
  else if (id.startsWith('rec')) prefix = 'r1111111-1111-1111-1111-';
  else if (id.startsWith('sch')) prefix = 's1111111-1111-1111-1111-';

  return prefix + hexHash;
}

// Interfaces or maps to convert between Supabase Table entities and our Application Models
export function mapEmployeeToSupabase(emp: Employee) {
  return {
    id: toUUID(emp.id),
    nome_completo: emp.fullName,
    funcao: emp.role,
    telefone: emp.phone,
    data_admissao: emp.admissionDate,
    observacoes: emp.notes,
    is_ativo: emp.isActive
  };
}

export function mapEmployeeFromSupabase(row: any): Employee {
  return {
    id: row.id,
    fullName: row.nome_completo,
    role: row.funcao,
    phone: row.telefone,
    admissionDate: row.data_admissao,
    notes: row.observacoes || '',
    isActive: row.is_ativo
  };
}

export function mapRecordToSupabase(rec: TimeRecord) {
  return {
    id: toUUID(rec.id),
    funcionario_id: toUUID(rec.employeeId),
    data: rec.date,
    hora: rec.time,
    tipo_registro: rec.type,
    responsavel: rec.responsible,
    created_at: rec.createdAt,
    historico: typeof rec.history === 'string' ? rec.history : JSON.stringify(rec.history || [])
  };
}

export function mapRecordFromSupabase(row: any): TimeRecord {
  let parsedHistory = [];
  try {
    parsedHistory = typeof row.historico === 'string' 
      ? JSON.parse(row.historico) 
      : (row.historico || []);
  } catch (e) {
    parsedHistory = [];
  }
  return {
    id: row.id,
    employeeId: row.funcionario_id,
    date: row.data,
    time: row.hora?.slice(0, 5) || row.hora, // HH:MM
    type: row.tipo_registro,
    responsible: row.responsavel,
    createdAt: row.created_at,
    history: parsedHistory
  };
}

export function mapScheduleToSupabase(sch: WorkSchedule) {
  return {
    id: toUUID(sch.id),
    titulo: sch.title,
    turno: sch.shiftType,
    data: sch.date,
    hora_inicio: sch.startTime,
    hora_fim: sch.endTime,
    is_evento_especial: sch.isSpecialEvent,
    notas: sch.notes
  };
}

export function mapScheduleFromSupabase(row: any, employeeIds: string[]): WorkSchedule {
  return {
    id: row.id,
    employeeIds,
    title: row.titulo,
    shiftType: row.turno,
    date: row.data,
    startTime: row.hora_inicio?.slice(0, 5) || row.hora_inicio,
    endTime: row.hora_fim?.slice(0, 5) || row.hora_fim,
    isSpecialEvent: row.is_evento_especial,
    notes: row.notas || ''
  };
}
