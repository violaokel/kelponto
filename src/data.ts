import { Employee, TimeRecord, WorkSchedule } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [];

// Current date for simulation is '2026-06-10', as matching the metadata
export const INITIAL_RECORDS: TimeRecord[] = [];

export const INITIAL_SCHEDULES: WorkSchedule[] = [];

export function getInitialData() {
  const localEmp = localStorage.getItem('arraiaponto_employees');
  const localRec = localStorage.getItem('arraiaponto_records');
  const localSch = localStorage.getItem('arraiaponto_schedules');

  return {
    employees: localEmp ? JSON.parse(localEmp) : INITIAL_EMPLOYEES,
    records: localRec ? JSON.parse(localRec) : INITIAL_RECORDS,
    schedules: localSch ? JSON.parse(localSch) : INITIAL_SCHEDULES,
  };
}

export function saveToLocalStorage(employees: Employee[], records: TimeRecord[], schedules: WorkSchedule[]) {
  localStorage.setItem('arraiaponto_employees', JSON.stringify(employees));
  localStorage.setItem('arraiaponto_records', JSON.stringify(records));
  localStorage.setItem('arraiaponto_schedules', JSON.stringify(schedules));
}
