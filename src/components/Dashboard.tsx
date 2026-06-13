import { useState, useEffect } from 'react';
import { Employee, TimeRecord, WorkSchedule } from '../types';
import { Flame, Users, Calendar, AlertTriangle, Play, HelpCircle, Utensils, CheckCircle2, Clock, Hourglass } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  records: TimeRecord[];
  schedules: WorkSchedule[];
  onNavigateToPonto: () => void;
  onNavigateToEquipe: () => void;
}

export default function Dashboard({ employees, records, schedules, onNavigateToPonto, onNavigateToEquipe }: DashboardProps) {
  const TODAY_STR = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // State for live time demonstration
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Filter today's records
  const recordsToday = records.filter(r => r.date === TODAY_STR);

  // Calculate Status of each active employee today
  const activeEmployees = employees.filter(e => e.isActive);
  const inactiveEmployees = employees.filter(e => !e.isActive);

  interface EmployeeStatus {
    employee: Employee;
    status: 'Presente' | 'Intervalo' | 'Ausente';
    lastTime: string | null;
  }

  const employeeStatusList: EmployeeStatus[] = activeEmployees.map(emp => {
    // Get all records of this employee today, sorted by timestamp or hours (time)
    const empRecordsToday = recordsToday
      .filter(r => r.employeeId === emp.id)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (empRecordsToday.length === 0) {
      return { employee: emp, status: 'Ausente', lastTime: null };
    }

    const lastRecord = empRecordsToday[empRecordsToday.length - 1];
    
    if (lastRecord.type === 'Entrada' || lastRecord.type === 'Retorno Intervalo') {
      return { employee: emp, status: 'Presente', lastTime: lastRecord.time };
    } else if (lastRecord.type === 'Início Intervalo') {
      return { employee: emp, status: 'Intervalo', lastTime: lastRecord.time };
    } else {
      return { employee: emp, status: 'Ausente', lastTime: lastRecord.time };
    }
  });

  const totalRegistered = employees.length;
  const totalActive = activeEmployees.length;
  const numPresent = employeeStatusList.filter(s => s.status === 'Presente').length;
  const numInterval = employeeStatusList.filter(s => s.status === 'Intervalo').length;
  const numAbsent = employeeStatusList.filter(s => s.status === 'Ausente').length;
  const numRecordsToday = recordsToday.length;

  // Filter schedules for today
  const schedulesToday = schedules.filter(s => s.date === TODAY_STR);

  // Prepare simple visual data statistics
  const percentagePresent = totalActive > 0 ? Math.round((numPresent / totalActive) * 100) : 0;
  const percentageInterval = totalActive > 0 ? Math.round((numInterval / totalActive) * 100) : 0;
  const percentageAbsent = totalActive > 0 ? Math.round((numAbsent / totalActive) * 100) : 0;

  return (
    <div className="space-y-8">
      
      {/* Sao Joao Premium Bento Banner Alert */}
      <div className="bg-bento-navy text-white border-b-8 border-r-8 border-bento-dark rounded-[40px] p-8 relative overflow-hidden shadow-[6px_6px_0px_#1d1b20]">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-radial from-bento-yellow/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-white/10 rounded-3xl border border-white/20 transform -rotate-3">
              <Flame className="w-10 h-10 text-bento-yellow animate-bounce" />
            </div>
            <div>
              <span className="bg-bento-red text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white">
                FESTA DE SÃO JOÃO 🔥
              </span>
              <h2 className="text-2xl font-display font-black text-white mt-1.5 uppercase tracking-tight">
                Painel Administrativo da Cozinha Ativa
              </h2>
              <p className="text-xs text-stone-300 mt-1 max-w-xl font-medium">
                Gerencie com precisão os horários de entrada, refeição e saída de toda a equipe gastronômica. Operação estável com salvamento persistente robusto.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 self-stretch lg:self-center">
            <button
              id="dashboard-goto-ponto"
              onClick={onNavigateToPonto}
              className="flex-1 lg:flex-initial px-6 py-4 bg-bento-red hover:bg-bento-red/90 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 cursor-pointer flex items-center justify-center space-x-2 border-b-4 border-r-4 border-bento-dark/40"
            >
              <Clock className="w-4 h-4" />
              <span>Lançar Ponto</span>
            </button>
            <button
              id="dashboard-goto-equipe"
              onClick={onNavigateToEquipe}
              className="flex-1 lg:flex-initial px-6 py-4 bg-bento-yellow hover:bg-[#e6a602] text-[#003049] font-black rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 cursor-pointer flex items-center justify-center space-x-2 border-b-4 border-r-4 border-bento-navy/40"
            >
              <Users className="w-4 h-4" />
              <span>Cadastrar Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Large Stats Blocks - span-4 */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          
          {/* Card A: Equipe Total */}
          <div className="bg-white rounded-[40px] border-b-8 border-r-8 border-bento-blue p-6 flex flex-col justify-between shadow-[4px_4px_0_#1D1B20] h-48 transition-transform hover:-translate-y-1">
            <span className="text-xs font-black text-bento-blue uppercase tracking-widest block">Equipe Integrada</span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-display font-black text-bento-navy leading-none">{totalActive}</span>
              <span className="text-xl font-bold text-gray-300 italic">/ {totalRegistered}</span>
            </div>
            <div className="space-y-1.5">
              <div className="w-full bg-stone-100 h-3 rounded-full border border-stone-200 overflow-hidden">
                <div 
                  className="bg-bento-blue h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalRegistered > 0 ? (totalActive / totalRegistered) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                {inactiveEmployees.length} funcionários inativos arquivados
              </p>
            </div>
          </div>

          {/* Card B: Presentes Agora */}
          <div className="bg-white rounded-[40px] border-b-8 border-r-8 border-bento-yellow p-6 flex flex-col justify-between shadow-[4px_4px_0_#1D1B20] h-48 transition-transform hover:-translate-y-1">
            <span className="text-xs font-black text-bento-yellow uppercase tracking-widest block">Presentes Agora</span>
            <div className="flex items-center gap-3 my-2">
              <span className="text-6xl font-display font-black text-bento-navy leading-none">{numPresent}</span>
              <span className="w-4 h-4 bg-emerald-500 rounded-full inline-block animate-pulse border border-bento-dark"></span>
            </div>
            <p className="text-xs font-bold text-stone-500">
              {percentagePresent}% de ocupação operacional da cozinha
            </p>
          </div>

          {/* Card C: Sincronização / Offline Data Status */}
          <div className="bg-bento-yellow rounded-[40px] border-b-8 border-r-8 border-bento-dark p-6 flex flex-col justify-between shadow-[4px_4px_0_#1D1B20] h-48 transition-transform hover:-translate-y-1">
            <span className="text-xs font-black text-bento-navy uppercase tracking-widest block">Sincronização</span>
            <div className="flex flex-col my-1">
              <span className="text-3xl font-display font-black text-bento-navy tracking-tight">LOCAL / SYNC</span>
              <span className="text-xs font-bold text-bento-navy/70 mt-1 uppercase">
                {records.length} registros offline seguros
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-bento-navy rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-bento-navy/60 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-bento-navy/30 rounded-full"></div>
            </div>
          </div>

          {/* Card D: Registros Hoje */}
          <div className="bg-bento-blue rounded-[40px] border-b-8 border-r-8 border-bento-dark p-6 flex flex-col justify-between shadow-[4px_4px_0_#1D1B20] h-48 text-white transition-transform hover:-translate-y-1">
            <span className="text-xs font-black text-white uppercase tracking-widest block">Ponto Batidos Hoje</span>
            <span className="text-6xl font-display font-black text-white leading-none my-1">{numRecordsToday}</span>
            <div className="flex justify-between items-center text-xs font-bold text-white/90">
              <span>Dia {TODAY_STR}</span>
              <span className="bg-white/20 px-2 py-1 rounded-lg">Cozinha Ativa</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Actions and List Views - span-8 */}
        <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
          
          {/* Bento Actions Panel */}
          <div className="bg-bento-navy text-white rounded-[40px] p-8 flex flex-col border-b-8 border-r-8 border-bento-dark shadow-[4px_4px_0_#1D1B20]">
            <h3 className="text-bento-yellow font-display font-black text-2xl uppercase mb-6 tracking-tight">Ações Rápidas de Gestão</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow">
              
              <button 
                id="quick-action-novo-ponto"
                onClick={onNavigateToPonto}
                className="bg-bento-red hover:bg-bento-red/90 text-white rounded-[24px] p-5 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 border-b-6 border-r-6 border-bento-dark font-black cursor-pointer group"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">
                  +
                </div>
                <span className="text-xs uppercase tracking-wider block text-center">Registrar Ponto</span>
              </button>

              <button 
                id="quick-action-cadastrar-staff"
                onClick={onNavigateToEquipe}
                className="bg-bento-yellow hover:bg-[#e6a602] text-bento-navy rounded-[24px] p-5 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 border-b-6 border-r-6 border-bento-dark font-black cursor-pointer group"
              >
                <div className="w-12 h-12 bg-bento-navy/10 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  👤
                </div>
                <span className="text-xs uppercase tracking-wider block text-center">Cadastrar Staff</span>
              </button>

              <button 
                id="quick-action-ver-escalas"
                onClick={onNavigateToPonto}
                className="bg-bento-blue hover:bg-[#1a8da9] text-white rounded-[24px] p-5 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 border-b-6 border-r-6 border-bento-dark font-black cursor-pointer group"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  📅
                </div>
                <span className="text-xs uppercase tracking-wider block text-center">Gerenciar Escalas</span>
              </button>

            </div>
          </div>

          {/* Employee List View / Monitoramento Local */}
          <div className="bg-white rounded-[40px] border-b-8 border-r-8 border-bento-red p-8 overflow-hidden flex flex-col shadow-[4px_4px_0_#1D1B20] min-h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
              <div>
                <h3 className="text-bento-navy font-display font-black text-2xl uppercase tracking-tight">Monitoramento Local</h3>
                <p className="text-xs text-stone-400 font-bold uppercase mt-1 tracking-wider">Histórico de Atividade Realtime</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-bento-red/10 text-bento-red px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-bento-red/20">
                  Cozinha Ativa
                </span>
                <span className="bg-stone-100 text-stone-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-stone-200">
                  Turno Geral
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px] pr-2">
              {employeeStatusList.map(({ employee, status, lastTime }) => {
                
                // State visual color map matching Bento Spec
                const statusBorderClass = 
                  status === 'Presente' 
                    ? 'border-bento-blue bg-bento-bg/40' 
                    : status === 'Intervalo' 
                    ? 'border-bento-yellow bg-white' 
                    : 'border-bento-red bg-bento-bg/20';

                const statusTextCol = 
                  status === 'Presente' 
                    ? 'text-bento-blue' 
                    : status === 'Intervalo' 
                    ? 'text-[#E6A602]' 
                    : 'text-bento-red';

                return (
                  <div 
                    key={employee.id}
                    className={`flex items-center justify-between p-4 rounded-3xl border-l-8 border-2 border-bento-dark shadow-[2px_2px_0_#1d1b20] transition-transform hover:-translate-y-0.5 ${statusBorderClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-2 border-bento-dark text-lg font-black text-bento-navy shadow-sm">
                        {employee.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-display font-black text-bento-navy leading-none text-base">{employee.fullName}</p>
                        <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest mt-1">
                          {employee.role} • <span className="font-mono text-stone-400">{employee.phone}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className={`font-black uppercase tracking-widest text-xs ${statusTextCol}`}>
                        {status === 'Presente' ? '★ EM SERVIÇO' : status === 'Intervalo' ? '☉ INTERVALO' : '⛌ AUSENTE'}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">
                        {lastTime ? `Registro: ${lastTime}` : 'Sem registros hoje'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {employeeStatusList.length === 0 && (
                <div className="p-12 text-center bg-bento-bg rounded-3xl border-4 border-dashed border-bento-navy/30">
                  <p className="text-bento-navy/60 font-bold uppercase tracking-wider">Nenhum funcionário cadastrado no sistema.</p>
                  <button
                    id="dashboard-no-emp-action"
                    onClick={onNavigateToEquipe}
                    className="mt-4 text-xs bg-bento-yellow border-2 border-bento-dark text-bento-navy font-black px-6 py-3 rounded-2xl hover:bg-[#e6a602] transition-transform active:scale-95 cursor-pointer shadow-[2px_2px_0_#1d1b20]"
                  >
                    Cadastrar Novo Funcionário
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* GAUGE & SCHEDULES COMBO BENTO ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SVG Interactive Gauge Chart */}
            <div className="bg-white rounded-[40px] border-b-8 border-r-8 border-bento-yellow p-6 flex flex-col shadow-[4px_4px_0_#1D1B20]">
              <h3 className="text-bento-navy font-display font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-bento-red animate-pulse" />
                <span>Ocupação Operacional</span>
              </h3>
              
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="transparent" 
                      stroke="#f3f4f6" 
                      strokeWidth="11" 
                    />
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="transparent" 
                      stroke="#219EBC" 
                      strokeWidth="11"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - numPresent / (totalActive || 1))}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-in-out"
                    />
                  </svg>
                  <div className="absolute text-center bg-white p-3 rounded-full border-2 border-bento-navy w-24 h-24 flex flex-col justify-center items-center shadow-inner">
                    <span className="text-3xl font-display font-black text-bento-navy">{numPresent}</span>
                    <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Cidadãos</p>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-4 text-xs font-bold text-bento-navy">
                  <div className="flex justify-between items-center bg-bento-bg/50 px-3.5 py-2.5 rounded-2xl border border-stone-200">
                    <span className="text-bento-blue flex items-center space-x-1.5 uppercase tracking-wider text-[10px]">
                      <span className="w-3.5 h-3.5 rounded-full bg-bento-blue border border-bento-navy" />
                      <span>Em Atividade</span>
                    </span>
                    <span className="font-mono text-base">{numPresent} ({percentagePresent}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedules Box */}
            <div className="bg-white rounded-[40px] border-b-8 border-r-8 border-bento-blue p-6 flex flex-col shadow-[4px_4px_0_#1D1B20]">
              <h3 className="text-bento-navy font-display font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-bento-blue" />
                <span>Turnos Ativos Hoje</span>
              </h3>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {schedulesToday.map(sch => (
                  <div key={sch.id} className="p-3 bg-bento-bg/70 rounded-2xl border-2 border-bento-dark shadow-[1px_1px_0_#1d1b20]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-bento-navy uppercase tracking-wider">
                        {sch.title}
                      </span>
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase border ${
                        sch.isSpecialEvent 
                          ? 'bg-bento-red text-white border-bento-dark' 
                          : 'bg-white text-stone-500 border-stone-200'
                      }`}>
                        {sch.isSpecialEvent ? 'Especial' : 'Turno Regular'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] font-bold text-stone-500 font-mono">
                      <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-bento-blue font-black">
                        {sch.startTime} - {sch.endTime}
                      </span>
                      <span className="font-sans font-black uppercase text-[9px] tracking-widest text-[#003049] bg-bento-yellow/30 px-1.5 py-0.5 rounded">
                        {sch.employeeIds.length} Staff
                      </span>
                    </div>
                  </div>
                ))}

                {schedulesToday.length === 0 && (
                  <div className="p-6 text-center text-stone-400 text-xs font-bold uppercase tracking-wider bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                    Nenhum turno agendado.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
