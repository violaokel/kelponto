/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Employee, TimeRecord, WorkSchedule } from './types';
import { getInitialData, saveToLocalStorage } from './data';

import FestiveHeader from './components/FestiveHeader';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import TimeClock from './components/TimeClock';
import ScheduleManager from './components/ScheduleManager';
import ReportGenerator from './components/ReportGenerator';
import DatabaseSync from './components/DatabaseSync';

export default function App() {
  // Authentication states
  const [adminName] = useState<string>('Admin FibraForte');

  // Core active states populated through offline initial seeds
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);

  // Navigation tab states
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Load initial states
  useEffect(() => {
    const { employees: e, records: r, schedules: s } = getInitialData();
    setEmployees(e);
    setRecords(r);
    setSchedules(s);
  }, []);

  // Sync state changes with localStorage
  const handleSaveAll = (updatedEmployees: Employee[], updatedRecords: TimeRecord[], updatedSchedules: WorkSchedule[]) => {
    setEmployees(updatedEmployees);
    setRecords(updatedRecords);
    setSchedules(updatedSchedules);
    saveToLocalStorage(updatedEmployees, updatedRecords, updatedSchedules);
  };

  // --- CRUD Operations for Employees ---
  const handleAddEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`
    };
    const nextList = [...employees, newEmp];
    handleSaveAll(nextList, records, schedules);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const nextList = employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    handleSaveAll(nextList, records, schedules);
  };

  const handleDeleteEmployee = (id: string) => {
    const nextList = employees.filter(e => e.id !== id);
    const filteredRecords = records.filter(r => r.employeeId !== id);
    const filteredSchedules = schedules.map(s => ({
      ...s,
      employeeIds: s.employeeIds.filter(eid => eid !== id)
    }));
    handleSaveAll(nextList, filteredRecords, filteredSchedules);

    // Proactively delete from Supabase in the background
    import('./lib/supabaseClient').then(({ supabase, toUUID }) => {
      supabase.from('funcionarios').delete().eq('id', toUUID(id)).then(({ error }) => {
        if (error) console.error('Erro ao excluir do Supabase:', error);
      });
    }).catch(e => console.error(e));
  };

  // --- Clock/Ponto Punching ---
  const handleAddRecord = (recordData: Omit<TimeRecord, 'id' | 'createdAt' | 'history'>) => {
    const newRecord: TimeRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Criação',
          details: `Registro inicial de ${recordData.type} lançado manualmente às ${recordData.time} por Admin.`,
          responsible: recordData.responsible
        }
      ]
    };
    const nextList = [...records, newRecord];
    handleSaveAll(employees, nextList, schedules);
  };

  const handleUpdateRecord = (updatedRec: TimeRecord) => {
    const nextList = records.map(r => r.id === updatedRec.id ? updatedRec : r);
    handleSaveAll(employees, nextList, schedules);
  };

  const handleDeleteRecord = (id: string) => {
    const nextList = records.filter(r => r.id !== id);
    handleSaveAll(employees, nextList, schedules);

    // Proactively delete from Supabase in the background
    import('./lib/supabaseClient').then(({ supabase, toUUID }) => {
      supabase.from('registros_ponto').delete().eq('id', toUUID(id)).then(({ error }) => {
        if (error) console.error('Erro ao excluir registro no Supabase:', error);
      });
    }).catch(e => console.error(e));
  };

  // --- Work Schedules / Escalas ---
  const handleAddSchedule = (scheduleData: Omit<WorkSchedule, 'id'>) => {
    const newSchedule: WorkSchedule = {
      ...scheduleData,
      id: `sch-${Date.now()}`
    };
    const nextList = [...schedules, newSchedule];
    handleSaveAll(employees, records, nextList);
  };

  const handleDeleteSchedule = (id: string) => {
    const nextList = schedules.filter(s => s.id !== id);
    handleSaveAll(employees, records, nextList);

    // Proactively delete from Supabase in the background
    import('./lib/supabaseClient').then(({ supabase, toUUID }) => {
      supabase.from('escalas').delete().eq('id', toUUID(id)).then(({ error }) => {
        if (error) console.error('Erro ao excluir escala no Supabase:', error);
      });
    }).catch(e => console.error(e));
  };

  // --- Full Backup JSON Overwriting/Importation ---
  const handleImportBackup = (imported: { employees: Employee[]; records: TimeRecord[]; schedules: WorkSchedule[] }) => {
    handleSaveAll(imported.employees, imported.records, imported.schedules);
  };

  const handleClearAllData = () => {
    handleSaveAll([], [], []);
  };

  // Redirect handles for helpful action buttons
  const navigateToPonto = () => setActiveTab('ponto');
  const navigateToEquipe = () => setActiveTab('employees');

  // Active panel router
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            employees={employees} 
            records={records} 
            schedules={schedules}
            onNavigateToPonto={navigateToPonto}
            onNavigateToEquipe={navigateToEquipe}
          />
        );
      case 'employees':
        return (
          <EmployeeManager 
            employees={employees} 
            onAddEmployee={handleAddEmployee} 
            onUpdateEmployee={handleUpdateEmployee} 
            onDeleteEmployee={handleDeleteEmployee}
          />
        );
      case 'ponto':
        return (
          <TimeClock 
            employees={employees} 
            records={records} 
            schedules={schedules}
            adminName={adminName}
            onAddRecord={handleAddRecord}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        );
      case 'schedules':
        return (
          <ScheduleManager 
            employees={employees} 
            schedules={schedules}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
          />
        );
      case 'reports':
        return (
          <ReportGenerator 
            employees={employees} 
            records={records} 
            schedules={schedules} 
          />
        );
      case 'database':
        return (
          <DatabaseSync 
            employees={employees} 
            records={records} 
            schedules={schedules}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAllData}
          />
        );
      default:
        return (
          <Dashboard 
            employees={employees} 
            records={records} 
            schedules={schedules}
            onNavigateToPonto={navigateToPonto}
            onNavigateToEquipe={navigateToEquipe}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg text-bento-navy flex flex-col font-sans antialiased selection:bg-bento-red selection:text-white relative pb-16">
      
      {/* Decorative background paper texture details or subtle glowing festive lanterns */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 overflow-hidden z-0 no-print">
        <div className="absolute top-24 right-10 w-96 h-96 rounded-full bg-bento-yellow/30 blur-[130px]" />
        <div className="absolute bottom-40 left-10 w-96 h-96 rounded-full bg-bento-blue/20 blur-[150px]" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-bento-red/10 blur-[180px]" />
      </div>

      <FestiveHeader 
        adminName={adminName} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {renderActiveComponent()}
      </main>

      {/* Decorative Flags at bottom transition before footer */}
      <div className="w-full flex justify-between px-12 pointer-events-none relative z-10 -mb-2 overflow-hidden h-10 max-w-7xl mx-auto no-print">
        <div className="w-8 h-10 bg-bento-red clip-flag"></div>
        <div className="w-8 h-10 bg-bento-yellow clip-flag translate-y-2"></div>
        <div className="w-8 h-10 bg-bento-blue clip-flag"></div>
        <div className="w-8 h-10 bg-bento-red clip-flag translate-y-1"></div>
        <div className="w-8 h-10 bg-bento-yellow clip-flag"></div>
        <div className="w-8 h-10 bg-bento-blue clip-flag translate-y-2"></div>
        <div className="w-8 h-10 bg-bento-red clip-flag"></div>
        <div className="w-8 h-10 bg-bento-yellow clip-flag translate-y-1"></div>
        <div className="w-8 h-10 bg-bento-blue clip-flag"></div>
        <div className="w-8 h-10 bg-bento-red clip-flag"></div>
        <div className="w-8 h-10 bg-bento-yellow clip-flag translate-y-2"></div>
        <div className="w-8 h-10 bg-bento-blue clip-flag"></div>
        <div className="w-8 h-10 bg-bento-red clip-flag"></div>
      </div>

      <footer className="bg-bento-navy border-t-8 border-bento-yellow py-8 text-center text-xs text-stone-300 font-medium relative z-10 w-full rounded-t-[40px] shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-display text-sm font-black text-white uppercase tracking-wider">
            ★ Arraiá Fibra Forte - Controle Administrativo de Ponto ★
          </p>
          <p className="text-gray-400">© 2026 Todos os direitos reservados • Ambiente de Monitoramento de Cozinha Estável</p>
          <p className="text-bento-yellow/80 mt-1 italic font-semibold">
            "Sabor arretado, horário controlado!" - Tradição e fibra forte no festejo junino.
          </p>
        </div>
      </footer>

    </div>
  );
}
