import { useState, useEffect } from 'react';
import { LogOut, Calendar, Clock, Flame, Users, FileText, Settings, ShieldAlert, Award } from 'lucide-react';

interface FestiveHeaderProps {
  adminName: string;
  onLogout?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function FestiveHeader({ adminName, onLogout, activeTab, setActiveTab }: FestiveHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Painel', icon: Flame, color: 'text-amber-500' },
    { id: 'employees', label: 'Equipe', icon: Users, color: 'text-blue-500' },
    { id: 'ponto', label: 'Ponto', icon: Clock, color: 'text-red-500' },
    { id: 'schedules', label: 'Escalas', icon: Calendar, color: 'text-yellow-500' },
    { id: 'reports', label: 'Relatórios', icon: FileText, color: 'text-emerald-500' },
    { id: 'database', label: 'Banco SQL', icon: Settings, color: 'text-purple-500' },
  ];

  return (
    <header className="text-bento-navy relative z-20 w-full mb-4">
      
      {/* Dynamic Bandeirinhas / Decorative Flags at the top header edge */}
      <div className="flex justify-between h-5 space-x-1.5 overflow-hidden w-full max-w-7xl mx-auto px-4 md:px-8 mt-2">
        {Array.from({ length: 24 }).map((_, idx) => {
          const colors = [
            'bg-bento-red', 'bg-bento-yellow', 'bg-bento-blue', 
            'bg-bento-navy', 'bg-[#FF7043]', 'bg-[#26A69A]'
          ];
          const color = colors[idx % colors.length];
          return (
            <div
              key={idx}
              className={`flex-grow h-6 ${color} clip-flag transform shadow-md origin-top hover:translate-y-1.5 transition-transform duration-200 cursor-pointer`}
              style={{ minWidth: '15px' }}
            />
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          {/* Brand/Logo Area from Bento Grid Spec */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-bento-red rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 border-2 border-bento-navy">
              <Flame className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-display font-black text-bento-navy uppercase tracking-tight leading-none">
                  Arraiá Fibra Forte
                </h1>
                <span className="hidden sm:inline-block px-3 py-1 bg-bento-red text-white text-[10px] font-black rounded-full uppercase tracking-widest border border-bento-navy">
                  JUNHO 2026
                </span>
              </div>
              <p className="text-xs font-bold text-bento-red uppercase tracking-widest mt-1">
                Controle Administrativo de Ponto • Operação Cozinha
              </p>
            </div>
          </div>

          {/* Status Hub (Live Date, Clock & Admin Info) rendered as a Bento pill card */}
          <div className="bg-white px-6 py-3 rounded-3xl border-4 border-bento-yellow shadow-md flex items-center gap-4 self-start md:self-auto">
            <div className="flex flex-col items-end justify-center border-r border-stone-200 pr-4">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                {formatDate(time).split(',')[0]}
              </span>
              <span className="text-2xl font-mono font-black text-bento-navy leading-none mt-1">
                {formatTime(time).substring(0, 5)}
                <span className="text-xs text-bento-red animate-pulse ml-0.5">{formatTime(time).substring(5)}</span>
              </span>
            </div>

            {/* Admin Profile Circle */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bento-blue rounded-full flex items-center justify-center text-white border-2 border-bento-navy font-bold shadow-sm" title={`Admin: ${adminName}`}>
                {adminName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase">Acesso</span>
                <span className="text-xs font-black text-bento-navy">
                  {adminName}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Nav Tabs bar - Re-engineered for authentic Bento Panel Tab design */}
        <div className="mt-8">
          <nav className="flex flex-wrap gap-2 bg-bento-navy p-2 rounded-[28px] border-b-6 border-r-6 border-bento-dark shadow-[4px_4px_0px_#1d1b20]">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              // Map dynamic highlight colors per bento item
              const activeBgMap: Record<string, string> = {
                dashboard: 'bg-bento-yellow text-bento-navy border-bento-yellow',
                employees: 'bg-white text-bento-navy border-white',
                ponto: 'bg-bento-red text-white border-bento-red',
                schedules: 'bg-bento-blue text-white border-bento-blue',
                reports: 'bg-emerald-500 text-white border-emerald-500',
                database: 'bg-purple-600 text-white border-purple-600'
              };

              return (
                <button
                  id={`nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-grow md:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer border-b-4 ${
                    isActive
                      ? `${activeBgMap[item.id] || 'bg-bento-yellow text-bento-navy'} scale-[1.02] -translate-y-0.5 shadow-sm`
                      : 'text-stone-300 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-current' : item.color} ${isActive && item.id === 'dashboard' ? 'animate-bounce' : ''}`} />
                  <span className="uppercase tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

      </div>
    </header>
  );
}
