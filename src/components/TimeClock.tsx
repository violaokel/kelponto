import React, { useState } from 'react';
import { Employee, TimeRecord, TimeRecordType, HistoryLog, WorkSchedule } from '../types';
import { Clock, Calendar, CheckSquare, Edit, Trash2, HelpCircle, History, AlertCircle, Plus, Sparkles, UserCheck, X } from 'lucide-react';

interface TimeClockProps {
  employees: Employee[];
  records: TimeRecord[];
  schedules?: WorkSchedule[];
  adminName: string;
  onAddRecord: (record: Omit<TimeRecord, 'id' | 'createdAt' | 'history'>) => void;
  onUpdateRecord: (record: TimeRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

export default function TimeClock({
  employees,
  records,
  schedules = [],
  adminName,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord
}: TimeClockProps) {
  
  const TODAY_STR = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);
  
  // Custom manual time fine-tuning parameters
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });
  const [recordType, setRecordType] = useState<TimeRecordType>('Entrada');

  // Editor modal states
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [editingTime, setEditingTime] = useState<string>('');
  const [editingType, setEditingType] = useState<TimeRecordType>('Entrada');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [deletingRecord, setDeletingRecord] = useState<TimeRecord | null>(null);

  // Local success messages feedback
  const [statusMessage, setStatusMessage] = useState<{ text: string; success: boolean } | null>(null);

  const activeEmployees = employees.filter(e => e.isActive);

  // Sync date and time on mount with the local device
  React.useEffect(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStrNow = `${year}-${month}-${day}`;
    
    setSelectedDate(todayStrNow);
    
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setSelectedTime(`${hrs}:${mins}`);
  }, []);

  // Set current real-time hour in punch field
  const setCurrentTimeInField = () => {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setSelectedTime(`${hrs}:${mins}`);
  };

  const getDelayForRecord = (rec: { employeeId: string; date: string; time: string; type: TimeRecordType }) => {
    if (rec.type !== 'Entrada') return null;
    if (!schedules || schedules.length === 0) return null;

    // Find all schedules assigned to this employee on this specific date
    const empSchedules = schedules.filter(s => s.employeeIds.includes(rec.employeeId) && s.date === rec.date);
    if (empSchedules.length === 0) return null;

    try {
      const punchDateObj = new Date(`${rec.date}T${rec.time}:00`);
      let matchedSchedule: WorkSchedule | null = null;
      let minDiffHrs = Infinity;

      empSchedules.forEach(s => {
        const schDateObj = new Date(`${s.date}T${s.startTime}:00`);
        const diffMs = punchDateObj.getTime() - schDateObj.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Within 12 hours of scheduled start
        if (diffHours >= -4 && diffHours <= 12) {
          const absDiff = Math.abs(diffHours);
          if (absDiff < minDiffHrs) {
            minDiffHrs = absDiff;
            matchedSchedule = s;
          }
        }
      });

      if (matchedSchedule) {
        const schDateObj = new Date(`${matchedSchedule.date}T${matchedSchedule.startTime}:00`);
        const diffMs = punchDateObj.getTime() - schDateObj.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes > 10) { // Tolerate up to 10 minutes delay
          return {
            isDelayed: true,
            delayMinutes: diffMinutes,
            scheduledTime: matchedSchedule.startTime,
            scheduledDate: matchedSchedule.date
          };
        }
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleRegisterPunch = (type: TimeRecordType) => {
    if (!selectedEmpId) {
      alert('Por favor, selecione um funcionário.');
      return;
    }

    onAddRecord({
      employeeId: selectedEmpId,
      date: selectedDate,
      time: selectedTime,
      type: type,
      responsible: adminName
    });

    const emp = employees.find(e => e.id === selectedEmpId);
    const delayInfo = getDelayForRecord({
      employeeId: selectedEmpId,
      date: selectedDate,
      time: selectedTime,
      type: type
    });

    if (delayInfo && emp) {
      setStatusMessage({
        text: `⚠️ ATRASO DETECTADO! ${emp.fullName} entrou às ${selectedTime} com atraso de ${delayInfo.delayMinutes} minutos (Escala programada para às ${delayInfo.scheduledTime}).`,
        success: false
      });
    } else {
      setStatusMessage({
        text: `Ponto de "${type}" registrado com sucesso para o funcionário!`,
        success: true
      });
    }
    setTimeout(() => setStatusMessage(null), 8000);
  };

  const startEditRecord = (rec: TimeRecord) => {
    setEditingRecord(rec);
    setEditingTime(rec.time);
    setEditingType(rec.type);
    setAdjustmentReason('');
  };

  const saveEditedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!adjustmentReason.trim()) {
      alert('Forneça uma justificativa obrigatória para registrar a alteração no histórico.');
      return;
    }

    // Add audit details to the history log
    const auditRecord: HistoryLog = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Edição',
      details: `Ajustado de [${editingRecord.type} - ${editingRecord.time}] para [${editingType} - ${editingTime}]. Justificativa: "${adjustmentReason}"`,
      responsible: adminName
    };

    const updated: TimeRecord = {
      ...editingRecord,
      time: editingTime,
      type: editingType,
      responsible: adminName,
      history: [...(editingRecord.history || []), auditRecord]
    };

    onUpdateRecord(updated);
    setEditingRecord(null);

    setStatusMessage({
      text: 'Alteração salva e registrada no histórico de auditoria!',
      success: true
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const confirmDeleteRecord = (rec: TimeRecord) => {
    setDeletingRecord(rec);
  };

  const handleExecuteDelete = () => {
    if (deletingRecord) {
      onDeleteRecord(deletingRecord.id);
      setDeletingRecord(null);
      setStatusMessage({
        text: 'Registro de ponto excluído com sucesso!',
        success: true
      });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Filter records dynamically based on selections. If a punch is part of a shift starting on "selectedDate",
  // it is grouped under that entry date, even if recorded on a subsequent date.
  const getAssignedRecords = (): (TimeRecord & { assignedEntryDate: string })[] => {
    // Group records by employee
    const recordsByEmp: { [empId: string]: TimeRecord[] } = {};
    records.forEach(r => {
      if (!recordsByEmp[r.employeeId]) {
        recordsByEmp[r.employeeId] = [];
      }
      recordsByEmp[r.employeeId].push(r);
    });

    const results: (TimeRecord & { assignedEntryDate: string })[] = [];

    Object.keys(recordsByEmp).forEach(empId => {
      // Sort each employee's records chronologically
      const sorted = [...recordsByEmp[empId]].sort((a, b) => {
        const tsA = `${a.date}T${a.time}`;
        const tsB = `${b.date}T${b.time}`;
        return tsA.localeCompare(tsB);
      });

      let activeEntry: TimeRecord | null = null;

      sorted.forEach(rec => {
        let assignedEntryDate = rec.date;

        if (rec.type === 'Entrada') {
          activeEntry = rec;
          assignedEntryDate = rec.date;
        } else {
          if (activeEntry) {
            try {
              const startObj = new Date(`${activeEntry.date}T${activeEntry.time}:00`);
              const endObj = new Date(`${rec.date}T${rec.time}:00`);
              const diffHours = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);

              // If difference is reasonable (e.g. within 30 hours) and not in the past relative to entry, group it here
              if (diffHours >= 0 && diffHours <= 30) {
                assignedEntryDate = activeEntry.date;
              } else {
                activeEntry = null;
              }
            } catch {
              activeEntry = null;
            }
          }
        }

        results.push({
          ...rec,
          assignedEntryDate
        });
      });
    });

    return results;
  };

  const currentEmployee = employees.find(e => e.id === selectedEmpId);
  const assignedRecords = getAssignedRecords();
  const filteredRecords = assignedRecords
    .filter(r => r.assignedEntryDate === selectedDate && (selectedEmpId === '' || r.employeeId === selectedEmpId))
    .sort((a, b) => {
      const tsA = `${a.date}T${a.time}`;
      const tsB = `${b.date}T${b.time}`;
      return tsA.localeCompare(tsB);
    });

  // Options for record type buttons styled for Bento Grid
  const punchTypes: { type: TimeRecordType; label: string; desc: string; buttonColor: string }[] = [
    { type: 'Entrada', label: '1ª Entrada', desc: 'Início do expediente', buttonColor: 'bg-bento-blue border-2 border-b-4 border-r-4 border-bento-navy text-white hover:bg-sky-600 font-black' },
    { type: 'Início Intervalo', label: 'Início Intervalo', desc: 'Pausa para descanso', buttonColor: 'bg-[#8ECAE6] border-2 border-b-4 border-r-4 border-bento-navy text-bento-navy hover:bg-sky-200 font-black' },
    { type: 'Retorno Intervalo', label: 'Volta Descanso', desc: 'Fim do intervalo', buttonColor: 'bg-bento-yellow border-2 border-b-4 border-r-4 border-bento-navy text-bento-navy hover:bg-[#e2a201] font-black' },
    { type: 'Saída', label: 'Registrar Saída', desc: 'Cerrar expediente', buttonColor: 'bg-bento-red border-2 border-b-4 border-r-4 border-bento-navy text-white hover:bg-[#b50322] font-black' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Alert Header Feedback */}
      {statusMessage && (
        <div className={`p-4 rounded-3xl border-2 border-b-4 border-r-4 border-bento-navy text-sm font-black flex items-center justify-between animate-fade-in ${
          statusMessage.success 
            ? 'bg-bento-yellow/20 text-bento-navy' 
            : 'bg-bento-red/10 text-bento-red'
        }`}>
          <div className="flex items-center space-x-2.5">
            <UserCheck className="w-5 h-5 text-bento-red" />
            <span className="uppercase tracking-wide text-xs">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)} 
            className="text-bento-navy hover:text-bento-red font-black uppercase tracking-wider text-xs cursor-pointer px-2.5 py-1 bg-bento-bg rounded-lg border border-bento-navy"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Punch Controller Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Manual entry controller, large buttons for easy tap */}
        <div className="lg:col-span-2 bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 space-y-6 shadow-[4px_4px_0px_#1D1B20]">
          
          <div className="border-b-2 border-dashed border-stone-200 pb-4">
            <h3 className="text-lg font-display font-black text-bento-navy uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-bento-red" />
              <span>Painel de Lançamento de Ponto</span>
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Selecione o cozinheiro, configure o horário desejado e clique no tipo de ponto correspondente para registrar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Field A: Select Cozinheiro */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-bento-navy uppercase tracking-widest">Cozinheiro(a)</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-3 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy font-black tracking-wide focus:outline-none focus:bg-white cursor-pointer"
              >
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Field B: Entry Date */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-bento-navy uppercase tracking-widest">Data do Lançamento</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy font-bold focus:outline-none focus:bg-white"
              />
            </div>

            {/* Field C: Entry Time Tracker */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-bento-navy uppercase tracking-widest">Hora do Ponto</label>
                <button 
                  onClick={setCurrentTimeInField}
                  type="button"
                  className="text-[10px] text-bento-red font-black uppercase tracking-wider hover:underline cursor-pointer"
                >
                  ⏱ Hora Atual
                </button>
              </div>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-sm font-black text-bento-navy tracking-widest text-center focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Big Action Buttons - Visual design optimized for quick touch actions */}
          <div>
            <span className="block text-xs font-black text-bento-navy uppercase tracking-widest mb-3">
              ★ Clique nos botões abaixo para emitir o ponto:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {punchTypes.map((punchOpt) => (
                <button
                  id={`btn-punch-${punchOpt.type.replace(' ', '-')}`}
                  key={punchOpt.type}
                  onClick={() => handleRegisterPunch(punchOpt.type)}
                  className={`p-5 rounded-2xl ${punchOpt.buttonColor} shadow-md flex flex-col items-center justify-center text-center transition-all transform active:scale-95 cursor-pointer`}
                >
                  <Clock className="w-5 h-5 mb-2.5 text-current" />
                  <span className="text-[11px] uppercase tracking-wider font-extrabold">{punchOpt.label}</span>
                  <span className="text-[9px] opacity-80 mt-1 font-bold leading-tight">
                    {punchOpt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Informational Section on System Rules */}
          <div className="bg-bento-yellow/10 p-4.5 rounded-2xl border border-bento-yellow/30 flex items-start space-x-3 text-xs text-bento-navy">
            <AlertCircle className="w-5 h-5 text-bento-red flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-bento-navy font-black uppercase tracking-wide text-[10px]">Auditoria Garantida de Eventos:</strong>
              <p className="leading-relaxed font-bold text-stone-600">
                Todos os registros de ponto contêm logs de auditoria gravando data, hora, tipo e o operador responsável (<span className="text-bento-red font-black uppercase">{adminName}</span>).
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Active day view / history list of registered punches */}
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 space-y-5 shadow-[4px_4px_0px_#1D1B20] text-bento-navy">
          <div className="border-b-2 border-dashed border-stone-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-md font-display font-black text-bento-navy uppercase tracking-tight">
                Pontos do Dia
              </h3>
              <p className="text-[10px] text-stone-500 font-extrabold uppercase mt-0.5">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span className="px-3 py-1 bg-bento-bg border-2 border-bento-navy text-[10px] font-black text-bento-red rounded-full uppercase tracking-wider">
              {filteredRecords.length} lançados
            </span>
          </div>

          {/* Dynamic Records Roster */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredRecords.map((rec) => {
              const emp = employees.find(e => e.id === rec.employeeId);
              return (
                <div key={rec.id} className="p-3.5 bg-bento-bg border-2 border-bento-navy rounded-2xl relative">
                  
                  {/* Row content */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-bento-navy uppercase tracking-wide">
                        {emp ? emp.fullName : 'Funcionário Excluído'}
                      </h4>
                      <p className="text-[10px] text-stone-500 font-black uppercase mt-0.5">{emp?.role}</p>
                      
                      <div className="flex flex-wrap gap-2 items-center mt-2.5">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase border border-bento-navy ${
                          rec.type === 'Entrada' 
                            ? 'bg-bento-blue text-white' 
                            : rec.type === 'Início Intervalo'
                            ? 'bg-[#8ECAE6] text-bento-navy'
                            : rec.type === 'Retorno Intervalo'
                            ? 'bg-bento-yellow text-bento-navy'
                            : 'bg-bento-red text-white'
                        }`}>
                          {rec.type}
                        </span>
                        <strong className="text-bento-navy font-mono text-xs sm:text-sm tracking-widest bg-white px-2 py-0.5 rounded-lg border-2 border-bento-navy shadow-[2px_2px_0px_#1D1B20]">
                          {rec.time}
                          {rec.date !== selectedDate && (
                            <span className="text-[9px] text-bento-red bg-red-50 border border-red-200 px-1 ml-1.5 rounded font-black">
                              ({new Date(rec.date + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                            </span>
                          )}
                        </strong>
                        {(() => {
                          const delayInfo = getDelayForRecord(rec);
                          if (delayInfo) {
                            return (
                              <span className="px-2 py-0.5 text-[9px] font-black rounded-lg uppercase bg-bento-red/10 border border-bento-red text-bento-red animate-pulse inline-flex items-center space-x-1" title={`Escala programada: ${delayInfo.scheduledTime} no dia ${delayInfo.scheduledDate}`}>
                                <span>Atraso: {delayInfo.delayMinutes} min</span>
                                <span className="text-[8px] font-semibold opacity-85">(Escala: {delayInfo.scheduledTime})</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Correction or Deletion panel */}
                    <div className="flex space-x-1.5">
                      <button
                        title="Corrigir Registro"
                        onClick={() => startEditRecord(rec)}
                        className="p-1.5 bg-white border-2 border-bento-navy text-bento-navy hover:bg-bento-yellow rounded-xl transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#1D1B20]"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Excluir Registro"
                        onClick={() => confirmDeleteRecord(rec)}
                        className="p-1.5 bg-white border-2 border-bento-navy text-stone-400 hover:text-bento-red hover:bg-red-50 rounded-xl transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#1D1B20]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Audit operator info */}
                  <div className="mt-3 pt-2.5 border-t border-dotted border-stone-300 text-[9px] text-stone-600 font-bold uppercase tracking-wide flex justify-between">
                    <span>Lançado por: {rec.responsible}</span>
                    {rec.history && rec.history.length > 0 && (
                      <span className="text-bento-red font-black animate-pulse">• Editado ({rec.history.length}x)</span>
                    )}
                  </div>

                  {/* Histórico display inside record box */}
                  {rec.history && rec.history.length > 0 && (
                    <div className="mt-2.5 bg-white border border-bento-navy p-2 rounded-xl text-[9px] text-stone-600 space-y-1">
                      <span className="font-black text-bento-navy flex items-center space-x-1 uppercase text-[8.5px]">
                        <History className="w-3 h-3 text-bento-red mr-0.5" />
                        <span>Log de Revisões:</span>
                      </span>
                      {rec.history.map((log) => (
                        <div key={log.id} className="border-l-2 border-bento-navy pl-1.5 mt-1 leading-relaxed text-[8.5px]">
                          <strong className="text-bento-navy">{log.responsible}</strong>: {log.details}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="py-12 text-center text-stone-400 text-xs font-bold uppercase">
                🌭 Nenhum registro de ponto lançado para a data selecionada. Use os botões à esquerda para simular!
              </div>
            )}
          </div>

          {/* Quick Stats of day */}
          <div className="border-t-2 border-dashed border-stone-200 pt-4 text-xs font-bold space-y-2 text-stone-500">
            <span className="block uppercase text-[10px] text-stone-400 font-extrabold tracking-widest">Filtros Avançados</span>
            <div className="flex justify-between bg-bento-bg p-2.5 rounded-xl border border-bento-navy/25 text-[10px] text-bento-navy leading-normal">
              <span>Selecione acima outro cozinheiro ou ajuste a data para listar registros anteriores correspondentes.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Clock entry correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in">
            
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform"
            >
              <XIcon />
            </button>

            <h3 className="text-md font-display font-black text-bento-navy uppercase tracking-wide flex items-center space-x-2">
              <Edit className="w-5 h-5 text-bento-red" />
              <span>Corrigir Registro Admin</span>
            </h3>
            <p className="text-xs text-stone-600 font-medium mt-1">
              Todos os campos alterados serão salvos com justificativa de auditoria obrigatória.
            </p>

            <form onSubmit={saveEditedRecord} className="space-y-4 mt-5">
              
              <div className="space-y-1">
                <span className="block text-xs font-black text-bento-navy uppercase tracking-widest">Funcionário Alvo</span>
                <span className="block text-sm font-black text-bento-red uppercase">
                  {employees.find(e => e.id === editingRecord.employeeId)?.fullName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* Adjust Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-bento-navy uppercase tracking-wider">Status / Tipo</label>
                  <select
                    value={editingType}
                    onChange={(e) => setEditingType(e.target.value as TimeRecordType)}
                    className="w-full px-3 py-2 bg-bento-bg border-2 border-bento-navy rounded-xl text-xs font-black text-bento-navy focus:outline-none focus:bg-white"
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Início Intervalo">Início Intervalo</option>
                    <option value="Retorno Intervalo">Retorno Intervalo</option>
                    <option value="Saída">Saída</option>
                  </select>
                </div>

                {/* Adjust Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-bento-navy uppercase tracking-wider">Horário Ajustado</label>
                  <input
                    type="time"
                    value={editingTime}
                    onChange={(e) => setEditingTime(e.target.value)}
                    className="w-full px-3 py-2 bg-bento-bg border-2 border-bento-navy rounded-xl text-xs font-black text-bento-navy text-center focus:outline-none focus:bg-white"
                    required
                  />
                </div>

              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-bento-navy uppercase tracking-wider">Justificativa da Alteração *</label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explique o motivo do ajuste (ex: Esqueceu de registrar ao iniciar recheio de pamonhas, etc.)"
                  rows={3}
                  className="w-full px-4 py-3 bg-bento-bg border-2 border-bento-navy rounded-xl text-xs font-bold text-bento-navy focus:outline-none focus:bg-white leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-dashed border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 px-4 bg-bento-bg text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer border-2 border-bento-navy uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-correction"
                  type="submit"
                  className="flex-grow py-3 px-6 bg-bento-red text-white hover:bg-[#b00321] font-black rounded-xl text-xs shadow-md cursor-pointer border-b-4 border-r-4 border-bento-dark uppercase tracking-wider"
                >
                  Confirmar Correção
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in font-sans">
            
            <button
              onClick={() => setDeletingRecord(null)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
            >
              <XIcon />
            </button>

            <h3 className="text-md font-display font-black text-bento-navy uppercase tracking-wide flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-bento-red animate-bounce" />
              <span>Confirmar Exclusão</span>
            </h3>
            <p className="text-xs text-stone-600 font-medium mt-1">
              Atenção: Esta alteração será registrada no histórico de auditoria e sincronizada com o banco de dados.
            </p>

            <div className="mt-5 space-y-3.5 bg-bento-bg/50 p-4 rounded-2xl border-2 border-dashed border-bento-navy/20">
              <div className="text-xs uppercase tracking-wider font-extrabold text-stone-500">Detalhes do Registro a deletar:</div>
              <div className="space-y-1">
                <span className="block text-xs font-black text-bento-navy uppercase">Profissional</span>
                <span className="block text-sm font-black text-bento-red uppercase">
                  {employees.find(e => e.id === deletingRecord.employeeId)?.fullName || 'Desconhecido'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-black text-bento-navy uppercase tracking-widest leading-none mb-1">Tipo de Ponto</span>
                  <span className="inline-block px-2.5 py-1 bg-white border-2 border-bento-navy text-bento-navy rounded-lg uppercase text-[10px] font-black">{deletingRecord.type}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-bento-navy uppercase tracking-widest leading-none mb-1">Data / Horário</span>
                  <span className="text-xs font-mono font-black text-bento-navy block">
                    {deletingRecord.date.split('-').reverse().join('/')} às <strong className="text-bento-blue text-sm">{deletingRecord.time}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-5 mt-4 border-t-2 border-dashed border-stone-200">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="flex-1 py-3 px-4 bg-bento-bg text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer border-2 border-bento-navy uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
              >
                Cancelar
              </button>
              <button
                id="btn-execute-record-delete"
                onClick={handleExecuteDelete}
                className="flex-grow py-3 px-6 bg-bento-red text-white hover:bg-[#b00321] font-black rounded-xl text-xs shadow-md cursor-pointer border-b-4 border-r-4 border-bento-dark uppercase tracking-wider"
              >
                Sim, Excluir Registro
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Simple internal icon component
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
    </svg>
  );
}
