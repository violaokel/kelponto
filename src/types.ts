/**
 * Types and interfaces for Arraiá Fibra Forte - Controle de Ponto
 */

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  admissionDate: string;
  notes: string;
  isActive: boolean; // Active or Inactive
}

export type TimeRecordType = 'Entrada' | 'Início Intervalo' | 'Retorno Intervalo' | 'Saída';

export interface HistoryLog {
  id: string;
  timestamp: string;
  action: 'Criação' | 'Edição' | 'Exclusão';
  details: string;
  responsible: string;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: TimeRecordType;
  responsible: string;
  createdAt: string;
  history: HistoryLog[];
}

export interface WorkSchedule {
  id: string;
  employeeIds: string[]; // Can assign to multiple employees
  title: string;
  shiftType: 'Manhã' | 'Tarde' | 'Noite' | 'Especial';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isSpecialEvent: boolean;
  notes?: string;
}

export interface AdminUser {
  loggedIn: boolean;
  username: string;
}
