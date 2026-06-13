import React, { useState } from 'react';
import { Employee, WorkSchedule } from '../types';
import { Calendar as CalendarIcon, List, Plus, Trash2, Clock, Sparkles, Filter, Check, Heart, X, Printer } from 'lucide-react';

interface ScheduleManagerProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  onAddSchedule: (schedule: Omit<WorkSchedule, 'id'>) => void;
  onDeleteSchedule: (id: string) => void;
}

const getWeekDays = (baseDateStr: string) => {
  const d = new Date(baseDateStr + "T12:00:00");
  const dayOfWeek = d.getDay();
  // Monday is 1st day of the week in standard PT calendars. If Sunday (0), shift to -6
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const weekDays = [];
  const daysShort = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const daysFull = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    weekDays.push({
      dateStr,
      dayNum: current.getDate(),
      dayOfWeekStrShort: daysShort[i],
      dayOfWeekStrFull: daysFull[i],
    });
  }
  return weekDays;
};

export default function ScheduleManager({ employees, schedules, onAddSchedule, onDeleteSchedule }: ScheduleManagerProps) {
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }); // Synchronized with current computer date
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Adding form parameters state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [shiftType, setShiftType] = useState<'Manhã' | 'Tarde' | 'Noite' | 'Especial'>('Especial');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('23:00');
  const [isSpecialEvent, setIsSpecialEvent] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Simple dynamic calendar representation for current month and year of computer
  const juneDays = (() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthStr = String(currentMonthNum).padStart(2, '0');
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();

    return Array.from({ length: daysInMonth }).map((_, idx) => {
      const dayNum = idx + 1;
      const dayStr = `${currentYear}-${currentMonthStr}-${String(dayNum).padStart(2, '0')}`;
      // Count schedules working on this day
      const schedulesCount = schedules.filter(s => s.date === dayStr).length;
      return {
        dayNum,
        dayStr,
        schedulesCount
      };
    });
  })();

  const handleDaySelect = (dayStr: string) => {
    setSelectedDayStr(dayStr);
  };

  const toggleEmployeeSelection = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(empId => empId !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Por favor digite o título da escala.');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      alert('Selecione pelo menos um funcionário para atuar nesta escala.');
      return;
    }

    onAddSchedule({
      employeeIds: selectedEmployeeIds,
      title,
      shiftType,
      date: selectedDayStr,
      startTime,
      endTime,
      isSpecialEvent,
      notes
    });

    // Reset Form
    setTitle('');
    setNotes('');
    setSelectedEmployeeIds([]);
    setIsFormOpen(false);
  };

  // Filter schedules to display depending on view types
  const daySchedules = schedules.filter(s => s.date === selectedDayStr);

  const activeEmployees = employees.filter(e => e.isActive);

  // Dynamic calculations for printing the full week containing selectedDayStr
  const weekDays = getWeekDays(selectedDayStr);
  const weekSchedules = schedules.filter(s => weekDays.some(w => w.dateStr === s.date));

  return (
    <div className="space-y-6">
      
      {/* Title block with view selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-[32px] border-2 border-b-8 border-r-8 border-bento-navy shadow-[4px_4px_0px_#1D1B20] text-bento-navy">
        <div>
          <h2 className="text-xl font-display font-black uppercase tracking-tight">
            Escalas e Turnos da Cozinha
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Planeje turnos, adicione escalas de pico de demanda para os dias de São João e relacione profissionais.
          </p>
        </div>

        {/* Action Panel: View switches and Print control button */}
        <div className="flex flex-wrap gap-3 items-center self-start">
          {/* Calendar vs List switches */}
          <div className="flex bg-bento-bg p-1 rounded-2xl border-2 border-bento-navy">
            <button
              onClick={() => setViewType('calendar')}
              className={`flex items-center space-x-1.5 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer uppercase ${
                viewType === 'calendar' 
                  ? 'bg-bento-yellow text-bento-navy border border-bento-navy shadow' 
                  : 'text-bento-navy hover:bg-stone-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-bento-red" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`flex items-center space-x-1.5 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer uppercase ${
                viewType === 'list' 
                  ? 'bg-bento-yellow text-bento-navy border border-bento-navy shadow' 
                  : 'text-bento-navy hover:bg-stone-200'
              }`}
            >
              <List className="w-4 h-4 text-bento-navy" />
              <span>Lista ({schedules.length})</span>
            </button>
          </div>

          {/* Print Weekly Schedules Button */}
          <button
            id="btn-print-weekly-schedule"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center space-x-1.5 py-2.5 px-4 bg-white border-2 border-bento-navy hover:bg-stone-100 text-bento-navy text-xs font-black rounded-2xl transition-all cursor-pointer shadow-[2px_2px_0_#1d1b20]"
            title="Visualizar e Imprimir a Escala da Semana atual"
          >
            <Printer className="w-4 h-4 text-bento-blue" />
            <span>Imprimir Escala Semanal</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {viewType === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Calendar Month View representation for June 2026 */}
          <div className="lg:col-span-2 bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 text-bento-navy shadow-[4px_4px_0px_#1D1B20]">
            <div className="flex items-center justify-between mb-5 border-b-2 border-dashed border-stone-200 pb-4">
              <h3 className="text-md font-display font-black text-bento-navy uppercase tracking-tight flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-bento-red" />
                <span className="capitalize">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              </h3>
              <div className="flex items-center space-x-2 text-xs font-black uppercase text-bento-navy">
                <span className="w-3 h-3 rounded-md bg-bento-red border border-bento-navy" />
                <span>Escalas Agendadas</span>
              </div>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-bento-navy text-[10px] font-black uppercase tracking-wider mb-2 bg-bento-bg py-2 rounded-xl border border-bento-navy">
              <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
            </div>

            {/* Month Day grids */}
            <div className="grid grid-cols-7 gap-2">
              {juneDays.map((day) => {
                const isSelected = day.dayStr === selectedDayStr;
                return (
                  <button
                    key={day.dayStr}
                    id={`calendar-day-${day.dayNum}`}
                    onClick={() => handleDaySelect(day.dayStr)}
                    className={`h-16 rounded-xl flex flex-col justify-between p-2 text-left relative transition-all cursor-pointer border-2 ${
                      isSelected 
                        ? 'bg-bento-yellow border-bento-navy text-bento-navy font-black scale-[1.03] z-10 shadow-[2px_2px_0_#1d1b20]' 
                        : 'bg-bento-bg border-bento-navy/15 text-bento-navy hover:border-bento-navy'
                    }`}
                  >
                    <span className="text-xs font-mono font-black">{day.dayNum}</span>
                    
                    {/* Schedule Count tags */}
                    {day.schedulesCount > 0 && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase text-center w-full leading-none truncate border border-bento-navy ${
                        isSelected ? 'bg-white text-bento-navy' : 'bg-bento-red text-white'
                      }`}>
                        {day.schedulesCount} {day.schedulesCount === 1 ? 'Escala' : 'Escalas'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active filtered day scales list */}
          <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 flex flex-col justify-between text-bento-navy shadow-[4px_4px_0px_#1D1B20]">
            <div className="space-y-4">
              <div className="border-b-2 border-dashed border-stone-200 pb-3.5 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-display font-black text-bento-navy uppercase tracking-tight capitalize">
                    Dia {new Date(selectedDayStr + "T12:00:00").getDate()} de {new Date(selectedDayStr + "T12:00:00").toLocaleDateString('pt-BR', { month: 'long' })}
                  </h3>
                  <p className="text-[10px] text-stone-500 font-extrabold uppercase mt-0.5">{selectedDayStr}</p>
                </div>
                <button
                  id="btn-open-create-schedule"
                  onClick={() => setIsFormOpen(true)}
                  className="p-2 bg-bento-yellow hover:bg-[#e1a201] text-bento-navy rounded-xl border-2 border-bento-navy transition-all cursor-pointer shadow-[2px_2px_0_#1d1b20]"
                  title="Criar nova escala para este dia"
                >
                  <Plus className="w-4 h-4 text-bento-navy" />
                </button>
              </div>

              {/* Day Schedules scrollable block */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {daySchedules.map((sch) => (
                  <div key={sch.id} className="p-4 bg-bento-bg border-2 border-bento-navy rounded-2xl relative">
                    <button
                      onClick={() => onDeleteSchedule(sch.id)}
                      title="Excluir Escala"
                      className="absolute top-3.5 right-3.5 text-stone-400 hover:text-bento-red transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-1.5 font-black">
                      <span className="text-xs text-bento-red uppercase tracking-wide">
                        {sch.title}
                      </span>
                    </div>

                    <div className="flex gap-2.5 items-center mt-3 text-xs text-stone-605">
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-white border border-bento-navy rounded uppercase text-bento-navy">
                        {sch.shiftType}
                      </span>
                      <span className="flex items-center space-x-1 font-mono text-bento-navy text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-bento-red" />
                        <span>{sch.startTime} - {sch.endTime}</span>
                      </span>
                    </div>

                    {/* Assigned Employees */}
                    <div className="mt-4 pt-3 border-t border-dotted border-stone-250">
                      <span className="text-[10px] text-stone-500 block uppercase font-extrabold tracking-wider mb-2">
                        Cozinheiros Escalados ({sch.employeeIds.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {sch.employeeIds.map(id => {
                          const emp = employees.find(e => e.id === id);
                          return (
                            <span key={id} className="text-[10px] bg-white border border-bento-navy max-w-full font-bold truncate text-bento-navy px-2 py-1 rounded-lg shadow-[1px_1px_0_#1d1b20]">
                              {emp ? emp.fullName : 'Removido'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {sch.notes && (
                      <p className="mt-3 text-[10px] text-stone-650 leading-relaxed border-l-2 border-bento-red pl-2 italic">
                        {sch.notes}
                      </p>
                    )}

                  </div>
                ))}

                {daySchedules.length === 0 && (
                  <div className="py-12 text-center text-xs text-stone-400 font-bold uppercase leading-normal">
                    🍲 Nenhuma escala de trabalho programada para este dia. Use o botão + para agendar!
                  </div>
                )}
              </div>
            </div>

            <button
              id="btn-trigger-schedule-create"
              onClick={() => setIsFormOpen(true)}
              className="mt-4 w-full py-3 bg-bento-bg border-2 border-bento-navy hover:bg-bento-yellow text-bento-navy font-black rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
            >
              <Plus className="w-4 h-4 text-bento-red" />
              <span>Programar Nova Escala</span>
            </button>
          </div>

        </div>
      ) : (
        /* Full flat list view of all schedules */
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 text-bento-navy shadow-[4px_4px_0px_#1D1B20]">
          <div className="flex justify-between items-center pb-4 border-b-2 border-dashed border-stone-200 mb-5">
            <h3 className="text-md font-display font-black uppercase tracking-tight">
              Cronograma Geral de Escalas Programadas
            </h3>
            <span className="text-[10px] bg-bento-bg border border-bento-navy text-bento-navy px-2.5 py-1 rounded-full font-black uppercase tracking-wide">Total: {schedules.length} escalas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((sch) => (
              <div key={sch.id} className="p-4 bg-bento-bg border-2 border-bento-navy rounded-2xl relative flex flex-col justify-between shadow-[2px_2px_0_#131B20]">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] bg-bento-yellow/25 border border-bento-navy text-bento-navy px-2 py-0.5 rounded-lg font-black block w-fit">{new Date(sch.date + "T12:00:00").toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <h4 className="text-sm font-black text-bento-red mt-2 uppercase tracking-wide">{sch.title}</h4>
                    </div>
                    <button
                      onClick={() => onDeleteSchedule(sch.id)}
                      className="p-1 px-1.5 bg-white border-2 border-bento-navy text-stone-400 hover:text-bento-red rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-3 items-center mt-3 text-xs text-bento-navy font-bold">
                    <span className="px-1.5 py-0.5 text-[9px] bg-white border border-bento-navy rounded font-black uppercase text-bento-navy">{sch.shiftType}</span>
                    <span className="flex items-center space-x-1 font-mono text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5 text-bento-red" />
                      <span>{sch.startTime} - {sch.endTime}</span>
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dotted border-stone-300">
                    <span className="text-[9px] text-stone-500 block font-black uppercase mb-1.5">Escalados ({sch.employeeIds.length}):</span>
                    <div className="flex flex-wrap gap-1">
                      {sch.employeeIds.map(eid => {
                        const em = employees.find(e => e.id === eid);
                        return (
                          <span key={eid} className="text-[9px] bg-white border border-bento-navy px-2 py-0.5 rounded-md text-bento-navy font-bold truncate max-w-[130px]" title={em?.fullName}>
                            {em ? em.fullName : 'Removido'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {sch.notes && (
                  <p className="mt-3.5 text-[10px] text-stone-605 border-l-2 border-bento-red pl-2 uppercase font-semibold tracking-wide leading-relaxed">
                    {sch.notes}
                  </p>
                )}

              </div>
            ))}

            {schedules.length === 0 && (
              <div className="col-span-full py-16 text-center text-stone-400 text-sm font-black uppercase">
                🥐 Nenhuma escala cadastrada no momento. Clique em "Calendário" no seletor para planejar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Adding Modal Form overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in">
            
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-display font-black text-bento-navy uppercase tracking-wide flex items-center space-x-2">
              <Plus className="w-5 h-5 text-bento-red" />
              <span>Programar Escala - Dia {new Date(selectedDayStr + "T12:00:00").getDate()}</span>
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Data selecionada no calendário: <strong className="text-bento-red font-black">{selectedDayStr}</strong>
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4 mt-5">
              
              {/* Title / Turn label */}
              <div>
                <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Título da Escala *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reforço Abertura ou Preparativos Salgados"
                  className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy text-xs font-black focus:outline-none focus:bg-white"
                  required
                />
              </div>

              {/* Grid 2-cols: Shift & Time limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Shift Type Selection */}
                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Tipo de Turno</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy font-black focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Especial">Especial São João</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col justify-end">
                  <span className="text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Prioridade de Evento</span>
                  <label className="flex items-center space-x-2 bg-bento-bg p-2 rounded-2xl border-2 border-bento-navy h-[42px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSpecialEvent}
                      onChange={(e) => setIsSpecialEvent(e.target.checked)}
                      className="w-4 h-4 accent-bento-red cursor-pointer"
                    />
                    <span className="text-xs text-bento-red font-black uppercase">Evento Especial 🔥</span>
                  </label>
                </div>

              </div>

              {/* Times (Start & End) */}
              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Início expediente</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-center font-black text-bento-navy focus:outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Final expediente</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-center font-black text-bento-navy focus:outline-none focus:bg-white"
                    required
                  />
                </div>

              </div>

              {/* Multiselect checkboxes for assigning employees */}
              <div>
                <label className="block text-xs font-black text-bento-navy mb-2 uppercase tracking-wider">
                  Selecionar Funcionários para Atuar nesta Escala *
                </label>
                
                <div className="max-h-[140px] overflow-y-auto border-2 border-bento-navy bg-bento-bg rounded-2xl p-3 space-y-2">
                  {activeEmployees.map((emp) => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label 
                        key={emp.id} 
                        className={`flex items-center space-x-2.5 p-2 rounded-xl transition-all cursor-pointer border-2 ${
                          isChecked 
                            ? 'bg-bento-yellow/30 border-bento-navy text-bento-navy font-black' 
                            : 'border-transparent text-bento-navy font-bold hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="w-4 h-4 accent-bento-red cursor-pointer animate-pulse"
                        />
                        <span className="text-xs">{emp.fullName} <span className="opacity-70 text-[10px]">({emp.role})</span></span>
                      </label>
                    );
                  })}

                  {activeEmployees.length === 0 && (
                    <div className="p-4 text-center text-xs text-stone-400 font-bold uppercase leading-normal">
                      Não há cozinheiros ativos disponíveis para escala.
                    </div>
                  )}
                </div>
              </div>

              {/* Work instructions / Notes */}
              <div>
                <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Instruções ou Escopo do Trabalho</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva as atribuições especiais de hoje (ex: Fritar pastéis das 18h às 21h, etc.)"
                  rows={2.5}
                  className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy outline-none focus:bg-white font-bold leading-normal font-sans"
                />
              </div>

              {/* Actions submit */}
              <div className="pt-4 flex gap-3 border-t-2 border-dashed border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 px-4 bg-bento-bg text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer border-2 border-bento-navy uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-schedule-save-confirm"
                  type="submit"
                  className="flex-grow py-3 px-6 bg-bento-yellow text-bento-navy hover:bg-[#e1a201] font-black rounded-xl text-xs cursor-pointer border-b-4 border-r-4 border-bento-dark uppercase tracking-wider shadow-md"
                >
                  Confirmar Agendamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Print Weekly Schedule Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 sm:p-8 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Close button - hidden under printing view */}
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform no-print"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="border-b-4 border-bento-navy pb-5 mb-6 no-print">
              <h3 className="text-xl font-display font-black text-bento-navy uppercase tracking-wide flex items-center space-x-2">
                <Printer className="w-6 h-6 text-bento-blue" />
                <span>Visualização de Impressão de Escala Semanal</span>
              </h3>
              <p className="text-xs text-stone-500 font-bold mt-1 leading-normal">
                Verifique a escala gerada abaixo para a semana pertencente ao dia <strong className="text-bento-red font-black">{new Date(selectedDayStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>. Clique em "Imprimir Escala" para imprimir fisicamente ou salvar em arquivo PDF.
              </p>
            </div>

            {/* Printable Area Card Wrapper */}
            <div className="printable-week-card bg-[#FEF9EC] border-2 border-bento-navy rounded-[24px] p-6 text-bento-navy space-y-6">
              
              {/* Print Only Title block */}
              <div className="border-b-4 border-double border-bento-navy pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-display font-black uppercase tracking-tight text-bento-navy">
                    Arraiá Fibra Forte - Escala Semanal da Cozinha
                  </h1>
                  <p className="text-xs text-bento-red font-black uppercase tracking-wider mt-1">
                    Operação e Monitoramento de Turnos de Trabalho • Paraty/São João 2026
                  </p>
                </div>
                <div className="bg-white border-2 border-bento-navy px-4 py-2 rounded-xl text-center md:text-right min-w-[200px]">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Período Selecionado</span>
                  <span className="text-sm font-mono font-black text-bento-navy">
                    {new Date(weekDays[0].dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {new Date(weekDays[6].dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Weekly Roster Grid layout */}
              <div className="space-y-4">
                {weekDays.map((day) => {
                  const daySchedules = schedules.filter(s => s.date === day.dateStr);
                  const isCurrentDay = day.dateStr === selectedDayStr;

                  return (
                    <div 
                      key={day.dateStr} 
                      className={`p-4 border-2 rounded-2xl bg-white ${
                        isCurrentDay ? 'border-bento-red ring-2 ring-bento-red/25 bg-red-50/10' : 'border-bento-navy/40'
                      }`}
                    >
                      {/* Day Label */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-dashed border-bento-navy/30 pb-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-black uppercase tracking-wider bg-bento-navy text-white px-2.5 py-0.5 rounded-lg">
                            {day.dayOfWeekStrFull}
                          </span>
                          <span className="text-xs font-mono font-black text-bento-navy capitalize">
                            {day.dayNum} de {new Date(day.dateStr + "T12:00:00").toLocaleDateString('pt-BR', { month: 'long' })}
                          </span>
                        </div>
                        {daySchedules.length > 0 && (
                          <span className="text-[10px] font-black uppercase text-bento-red">
                            {daySchedules.length} {daySchedules.length === 1 ? 'Escala Definida' : 'Escalas Definidas'}
                          </span>
                        )}
                      </div>

                      {/* Day's assigned schedules */}
                      {daySchedules.length > 0 ? (
                        <div className="space-y-3.5">
                          {daySchedules.map((sch) => (
                            <div key={sch.id} className="p-3 bg-[#fdfaf2] border border-bento-navy/20 rounded-xl">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-xs font-black text-bento-red uppercase tracking-wider">
                                  {sch.title}
                                </span>
                                <span className="px-1.5 py-0.5 text-[8.5px] font-black bg-white border border-bento-navy/30 rounded uppercase text-stone-605">
                                  {sch.shiftType}
                                </span>
                                <span className="flex items-center space-x-1 font-mono text-bento-navy text-xs font-bold ml-auto">
                                  <Clock className="w-3.5 h-3.5 text-bento-blue no-print" />
                                  <span>Horário: {sch.startTime} - {sch.endTime}</span>
                                </span>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-dotted border-stone-200">
                                <span className="text-[10px] text-stone-500 uppercase font-black block tracking-wider mb-1.5">
                                  Funcionários Escalados:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {sch.employeeIds.map(id => {
                                    const emp = employees.find(e => e.id === id);
                                    return (
                                      <span key={id} className="text-[10.5px] font-bold text-bento-navy bg-white border border-bento-navy/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                                        {emp ? emp.fullName : 'Removido'} <span className="text-[9px] font-semibold text-stone-550">({emp?.role})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              {sch.notes && (
                                <p className="mt-2 text-[10px] text-stone-650 leading-relaxed border-l-2 border-bento-red pl-2 italic col-span-full">
                                  Observação: {sch.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400 italic">
                          Folga programada / Nenhuma escala de serviço agendada.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Roster aggregation metrics inside printable area */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t-2 border-dashed border-bento-navy pt-4">
                <div className="p-3 bg-white border border-bento-navy/20 rounded-xl">
                  <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wide block">Total de Turnos</span>
                  <span className="text-lg font-mono font-black text-bento-navy">{weekSchedules.length} escalas</span>
                </div>
                <div className="p-3 bg-white border border-bento-navy/20 rounded-xl">
                  <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wide block">Profissionais Escalados</span>
                  <span className="text-lg font-mono font-black text-bento-navy">
                    {(() => {
                      const uniqueIds = new Set<string>();
                      weekSchedules.forEach(s => s.employeeIds.forEach(id => uniqueIds.add(id)));
                      return uniqueIds.size;
                    })()} cozinheiros
                  </span>
                </div>
                <div className="p-3 bg-white border border-bento-navy/20 rounded-xl col-span-2 md:col-span-1">
                  <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wide block">Data da Emissão</span>
                  <span className="text-xs font-mono font-bold text-bento-navy block mt-0.5">
                    {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Footer print note */}
              <div className="text-center pt-2 border-t border-stone-200">
                <p className="text-[9.5px] text-stone-500 font-semibold uppercase">
                  Documento Administrativo Interno - Arraiá Fibra Forte • Sabor arretado, horário controlado!
                </p>
              </div>

            </div>

            {/* Actions Panel below */}
            <div className="mt-8 pt-5 border-t-2 border-dashed border-stone-200 flex flex-col sm:flex-row gap-3 justify-end no-print">
              <span className="text-[11px] text-stone-500 mr-auto self-center font-bold text-center sm:text-left">
                💡 Dica: Nas opções da impressora, alterne a "Orientação" para melhor enquadramento e ajuste de margens.
              </span>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="py-3 px-6 bg-bento-bg text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer border-2 border-bento-navy uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
              >
                Fechar Painel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-3 px-6 bg-bento-blue text-white hover:bg-[#1a859e] font-black rounded-xl text-xs cursor-pointer border-b-4 border-r-4 border-bento-navy uppercase tracking-wider shadow-md flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Imprimir Escala (Salvar PDF)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
