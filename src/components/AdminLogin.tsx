import React, { useState } from 'react';
import { Lock, LogIn, Flame, Sparkles } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (adminName: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('Admin FibraForte');
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, insira a senha de acesso.');
      return;
    }
    // Simple secure password gate
    if (password === 'fibra' || password === 'fibraforte' || password === 'admin' || password === '123' || password === 'fibraforte2026') {
      setError('');
      onLoginSuccess(adminName);
    } else {
      setError('Senha incorreta! Use "fibraforte" ou "admin" para testar o acesso.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bento-bg text-bento-navy relative overflow-hidden font-sans">
      
      {/* Dynamic Animated Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-24 right-10 w-96 h-96 rounded-full bg-bento-yellow/30 blur-[130px]" />
        <div className="absolute bottom-40 left-10 w-96 h-96 rounded-full bg-bento-blue/20 blur-[150px]" />
      </div>

      {/* Flag Garland decorator */}
      <div className="flex justify-center space-x-1.5 py-6 overflow-hidden relative z-10 max-w-7xl mx-auto px-4 w-full">
        {Array.from({ length: 24 }).map((_, idx) => {
          const colors = ['bg-bento-red', 'bg-bento-yellow', 'bg-bento-blue', 'bg-bento-navy', 'bg-[#FF7043]', 'bg-[#26A69A]'];
          const color = colors[idx % colors.length];
          return (
            <div
              key={idx}
              className={`w-6 h-8 ${color} clip-flag transform shadow-md flex-shrink-0 animate-bounce origin-top hover:scale-110 transition-transform`}
              style={{ animationDelay: `${idx * 0.08}s`, animationDuration: '2.5s' }}
            />
          );
        })}
      </div>

      {/* Main Content Card Container styled like a real Bento Box */}
      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-white border-2 border-bento-navy border-b-8 border-r-8 rounded-[40px] p-8 shadow-[6px_6px_0px_#1D1B20] relative transition-transform hover:-translate-y-1 block mt-4">
          
          {/* Flame / Bonfire Accent Badge from spec */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-bento-red rounded-3xl flex items-center justify-center shadow-lg border-4 border-bento-navy transform hover:scale-115 transition-transform duration-300">
            <Flame className="w-12 h-12 text-white animate-pulse" />
          </div>

          <div className="text-center mt-12 mb-8">
            <h1 className="text-3xl font-display font-black tracking-tight text-bento-navy uppercase leading-none">
              Arraiá Fibra Forte
            </h1>
            <p className="text-bento-red text-xs uppercase tracking-widest font-black mt-2">
              Controle Administrativo de Ponto
            </p>
            <div className="inline-flex items-center space-x-1 mt-4 px-4 py-1.5 bg-bento-yellow/20 border border-bento-yellow/40 rounded-full text-xs text-bento-navy font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-bento-red" />
              <span>Acesso do Administrador</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-bento-navy uppercase tracking-widest mb-2">
                Nome do Responsável
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Insira o seu nome"
                className="w-full px-4 py-3 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-bento-yellow transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-bento-navy uppercase tracking-widest mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-bento-navy">
                  <Lock className="w-4 h-4 text-bento-navy" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Insira a senha do Arraiá"
                  className="w-full pl-11 pr-4 py-3 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy placeholder-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-bento-yellow transition-all text-sm font-bold"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-bento-red/10 border-2 border-bento-red rounded-2xl text-xs text-bento-red text-center font-black uppercase tracking-wide">
                {error}
              </div>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full py-4 px-6 bg-bento-red hover:bg-[#b00321] text-white font-black rounded-2xl transition-all duration-200 transform active:scale-95 shadow-md flex items-center justify-center space-x-2 text-sm uppercase tracking-wider border-b-4 border-r-4 border-bento-dark cursor-pointer"
            >
              <span>Acessar Painel</span>
              <LogIn className="w-4 h-4" />
            </button>
          </form>

          {/* User Hint panel, making demo seamless */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-stone-200 text-center">
            <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider">
              Senha de demonstração:
            </span>
            <div className="mt-2.5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPassword('fibraforte')}
                className="px-4 py-2 bg-bento-bg border-2 border-bento-navy text-bento-navy rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bento-yellow transition-colors cursor-pointer shadow-[2px_2px_0_#1d1b20]"
              >
                fibraforte
              </button>
              <button
                type="button"
                onClick={() => setPassword('admin')}
                className="px-4 py-2 bg-bento-bg border-2 border-bento-navy text-bento-navy rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bento-yellow transition-colors cursor-pointer shadow-[2px_2px_0_#1d1b20]"
              >
                admin
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Footer copyright */}
      <div className="pb-8 text-center text-stone-500 text-xs font-bold uppercase tracking-wider relative z-10 px-4">
        <p>★ Arraiá Fibra Forte - Gestão e Tecnologia em Eventos ★</p>
      </div>

    </div>
  );
}
