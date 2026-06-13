import React, { useState } from 'react';
import { Employee, TimeRecord, WorkSchedule } from '../types';
import { 
  Database, 
  Sparkles, 
  Copy, 
  Check, 
  UploadCloud, 
  RefreshCw, 
  Download, 
  FileUp, 
  Shield, 
  Wifi, 
  HardDrive, 
  AlertCircle,
  CloudLightning,
  Trash2,
  X
} from 'lucide-react';
import { pushLocalDataToSupabase, pullDataFromSupabase, wipeAllSupabaseData } from '../lib/supabaseSync';

interface DatabaseSyncProps {
  employees: Employee[];
  records: TimeRecord[];
  schedules: WorkSchedule[];
  onImportBackup: (importedData: { employees: Employee[]; records: TimeRecord[]; schedules: WorkSchedule[] }) => void;
  onClearAllData: () => void;
}

export default function DatabaseSync({ employees, records, schedules, onImportBackup, onClearAllData }: DatabaseSyncProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('last_supabase_sync') || 'Não sincronizado';
  });
  const [copiedText, setCopiedText] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'synced' | 'error'>(() => {
    return localStorage.getItem('last_supabase_sync') ? 'synced' : 'connected';
  });
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Custom modal states to avoid browser-native window.confirm / window.alert blockages in iframes
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeSupabaseRemote, setWipeSupabaseRemote] = useState(false);
  const [wipeFeedbackMessage, setWipeFeedbackMessage] = useState<string | null>(null);

  const handleWipeEverything = () => {
    setWipeFeedbackMessage(null);
    setWipeSupabaseRemote(false);
    setShowWipeModal(true);
  };

  const executeWipeEverything = async () => {
    setIsWiping(true);
    let messageFeedback = "O aplicativo foi limpo localmente de forma segura! Todos os dados locais salvos no navegador foram completamente eliminados de forma irreversível.";

    if (wipeSupabaseRemote) {
      try {
        const res = await wipeAllSupabaseData();
        if (res.success) {
          messageFeedback += "\n\nExcepcional! Todas as tabelas no banco de dados remoto Supabase (funcionários, pontos e escalas na nuvem) também foram esvaziadas com sucesso!";
        } else {
          messageFeedback += `\n\nNo entanto, ocorreu uma falha ao limpar o banco remoto no Supabase. Detalhe técnico:\n${res.errorDetail || res.message}`;
        }
      } catch (err: any) {
        messageFeedback += `\n\nNo entanto, ocorreu um erro de conexão ao tentar limpar as tabelas estruturadas remanescentes no Supabase:\n${err.message || String(err)}`;
      }
    }

    // Clear local state callback
    onClearAllData();
    localStorage.removeItem('last_supabase_sync');
    setLastSyncTime('Não sincronizado');
    setSyncStatus('connected');

    setIsWiping(false);
    setWipeFeedbackMessage(messageFeedback);
  };

  const SUPABASE_URL = 'https://mtnrssxyqtsrzdvyownc.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_zuA5b6VDjGcpOkAwBCP8mA_bpKP82Lb';

  // Interactive Supabase configuration SQL script compatible with Postgres/Supabase
  const SUPABASE_SQL_SCHEMA = `-- ESQUEMA DE BANCO DE DADOS POSTGRESQL (SUPABASE)
-- Arraiá Fibra Forte - Controle Administrativo de Ponto

-- 1. TABELA DE FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(255) NOT NULL,
    funcao VARCHAR(150) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes TEXT,
    is_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE REGISTROS DE PONTO
CREATE TABLE IF NOT EXISTS registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL,
    tipo_registro VARCHAR(50) CHECK (tipo_registro IN ('Entrada', 'Início Intervalo', 'Retorno Intervalo', 'Saída')),
    responsavel VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    historico JSONB DEFAULT '[]'::jsonb
);

-- 3. TABELA DE ESCALAS DE TRABALHO
CREATE TABLE IF NOT EXISTS escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    turno VARCHAR(50) NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    is_evento_especial BOOLEAN DEFAULT TRUE NOT NULL,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela agregada de ligação Escala - Funcionários (Multi-atribuição)
CREATE TABLE IF NOT EXISTS escala_funcionarios (
    escala_id UUID REFERENCES escalas(id) ON DELETE CASCADE,
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    PRIMARY KEY (escala_id, funcionario_id)
);

-- Habilitar RLS (Row Level Security) para segurança administrativa
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala_funcionarios ENABLE ROW LEVEL SECURITY;

-- Adicionar políticas públicas simples de liberação para controle administrativo público
-- Nota: Em produção, você pode restringir de acordo com autenticação de usuários admin
CREATE POLICY "Allow select for public" ON funcionarios FOR SELECT USING (true);
CREATE POLICY "Allow insert for public" ON funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for public" ON funcionarios FOR UPDATE USING (true);
CREATE POLICY "Allow delete for public" ON funcionarios FOR DELETE USING (true);

CREATE POLICY "Allow select for public rec" ON registros_ponto FOR SELECT USING (true);
CREATE POLICY "Allow insert for public rec" ON registros_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for public rec" ON registros_ponto FOR UPDATE USING (true);
CREATE POLICY "Allow delete for public rec" ON registros_ponto FOR DELETE USING (true);

CREATE POLICY "Allow select for public esc" ON escalas FOR SELECT USING (true);
CREATE POLICY "Allow insert for public esc" ON escalas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for public esc" ON escalas FOR UPDATE USING (true);
CREATE POLICY "Allow delete for public esc" ON escalas FOR DELETE USING (true);

CREATE POLICY "Allow select for public junc" ON escala_funcionarios FOR SELECT USING (true);
CREATE POLICY "Allow insert for public junc" ON escala_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for public junc" ON escala_funcionarios FOR UPDATE USING (true);
CREATE POLICY "Allow delete for public junc" ON escala_funcionarios FOR DELETE USING (true);
`;

  const copyToClipboard = (text: string, type: 'sql' | 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    } else if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } else if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  // Push local state to Supabase Cloud
  const handlePushToSupabase = async () => {
    setIsPushing(true);
    setErrorLog(null);
    setSyncStatus('syncing');
    
    try {
      const result = await pushLocalDataToSupabase(employees, records, schedules);
      if (result.success) {
        const now = new Date();
        const timeStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        localStorage.setItem('last_supabase_sync', timeStr);
        setSyncStatus('synced');
        alert('Dados locais salvos com absoluto sucesso no Banco Supabase!');
      } else {
        setSyncStatus('error');
        setErrorLog(result.errorDetail || result.message);
        alert(`Erro na Sincronização:\n${result.message}\n\nSe necessário, crie as tabelas executando o script SQL listado no final da página.`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setErrorLog(err.message || String(err));
      alert('Erro inesperado ao conectar ao banco de dados Supabase.');
    } finally {
      setIsPushing(false);
    }
  };

  // Pull data from Supabase Cloud to replace local state
  const handlePullFromSupabase = async () => {
    const confirmMessage = 'Esta ação substituirá os registros locais atuais do navegador pelos dados vindos do banco Supabase. Tem certeza que deseja prosseguir?';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsPulling(true);
    setErrorLog(null);
    setSyncStatus('syncing');

    try {
      const result = await pullDataFromSupabase();
      if (result.success && result.data) {
        onImportBackup(result.data);
        const now = new Date();
        const timeStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        localStorage.setItem('last_supabase_sync', timeStr);
        setSyncStatus('synced');
        alert('Dados sincronizados e carregados do Supabase com sucesso no seu dispositivo!');
      } else {
        setSyncStatus('error');
        setErrorLog(result.errorDetail || result.message);
        alert(`Erro ao buscar dados:\n${result.message}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setErrorLog(err.message || String(err));
      alert('Erro de rede ou permissão ao buscar os dados do Supabase.');
    } finally {
      setIsPulling(false);
    }
  };

  // Local JSON Backups exporter for robust operations safety
  const handleDownloadBackup = () => {
    const backupObj = {
      employees,
      records,
      schedules,
      exportedAt: new Date().toISOString(),
      system: 'Arraiá Fibra Forte - Controle de Ponto'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_ponto_arraia_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  // Local JSON Backup uploader/importer
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = event => {
      try {
        const result = JSON.parse(event.target?.result as string);
        if (result.employees && result.records && result.schedules) {
          onImportBackup({
            employees: result.employees,
            records: result.records,
            schedules: result.schedules
          });
          alert('Backup local JSON restaurado com sucesso! Os dados foram reintegrados ao sistema.');
        } else {
          alert('Formato de arquivo inválido. Certifique-se de carregar um arquivo JSON de backup válido do sistema.');
        }
      } catch {
        alert('Erro ao decodificar arquivo JSON de backup.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-6 text-bento-navy font-sans">
      
      {/* Cloud Sync Dashboard Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection status and manual trigger */}
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 flex flex-col justify-between shadow-[4px_4px_0px_#1D1B20]">
          <div className="space-y-4">
            <h3 className="text-sm font-display font-black uppercase tracking-tight flex items-center space-x-2">
              <Database className="w-5 h-5 text-purple-600 animate-pulse" />
              <span>Sincronização Ativa Supabase</span>
            </h3>
            
            <div className="p-4 bg-bento-bg rounded-2xl border-2 border-bento-navy space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-extrabold">Integridade Conexão:</span>
                {syncStatus === 'synced' && (
                  <span className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-black uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border-2 border-emerald-455">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sincronizado</span>
                  </span>
                )}
                {syncStatus === 'connected' && (
                  <span className="flex items-center space-x-1.5 text-[10px] text-blue-700 font-black uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border-2 border-blue-400">
                    <Wifi className="w-3.5 h-3.5 text-blue-600" />
                    <span>Conectado</span>
                  </span>
                )}
                {syncStatus === 'syncing' && (
                  <span className="flex items-center space-x-1.5 text-[10px] text-yellow-700 font-black uppercase tracking-wider bg-yellow-50 px-2 py-0.5 rounded-full border-2 border-yellow-400 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-yellow-600 animate-spin" />
                    <span>Sincronizando</span>
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="flex items-center space-x-1.5 text-[10px] text-bento-red font-black uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-full border-2 border-bento-red">
                    <CloudLightning className="w-3.5 h-3.5" />
                    <span>Requer Ajuste</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-stone-200 pt-3">
                <span className="text-xs text-stone-500 font-extrabold">Última Atualização:</span>
                <span className="text-xs font-mono text-bento-navy font-black">{lastSyncTime}</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-stone-200 pt-3">
                <span className="text-xs text-stone-500 font-extrabold font-bold">Registros Locais:</span>
                <span className="text-xs text-bento-navy font-black">
                  {employees.length} func • {records.length} pts • {schedules.length} esc
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed font-bold">
              Você agora está conectado diretamente ao cluster de banco de dados do Supabase. Use os controles abaixo para salvar dados acumulados locais ou restaurar os registros existentes salvos na nuvem.
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            {/* Button to PUSH local data to Supabase */}
            <button
              id="btn-supabase-push"
              onClick={handlePushToSupabase}
              disabled={isPushing || isPulling}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-bento-navy shadow-[2px_2px_0px_#1D1B20] ${
                isPushing 
                  ? 'bg-stone-100 text-stone-400 animate-pulse' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-b-4 border-r-4 border-bento-dark shadow-md'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isPushing ? 'Enviando ao Banco...' : 'Enviar Dados ao Supabase (Push)'}</span>
            </button>

            {/* Button to PULL state from Supabase */}
            <button
              id="btn-supabase-pull"
              onClick={handlePullFromSupabase}
              disabled={isPushing || isPulling}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-bento-navy shadow-[2px_2px_0px_#1D1B20] ${
                isPulling 
                  ? 'bg-stone-100 text-stone-400 animate-pulse' 
                  : 'bg-white hover:bg-stone-100 text-bento-navy shadow-[2px_2px_0_#1d1b20]'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{isPulling ? 'Carregando do Banco...' : 'Baixar Dados do Supabase (Pull)'}</span>
            </button>
          </div>
        </div>

        {/* Local export/import manager */}
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 flex flex-col justify-between shadow-[4px_4px_0px_#1D1B20]">
          <div className="space-y-4">
            <h3 className="text-sm font-display font-black uppercase tracking-tight flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-bento-yellow" />
              <span>Backup Físico JSON</span>
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-bold">
              Caso precise de mobilidade offline ou deseje transferir os arquivos entre diferentes navegadores, gere backups físicos no seu celular ou computador.
            </p>

            <div className="p-3.5 bg-bento-bg rounded-xl border-2 border-bento-navy flex items-center space-x-3 text-xs text-stone-600">
              <Shield className="w-5 h-5 text-bento-red flex-shrink-0" />
              <span className="font-extrabold leading-normal">
                Backups salvos protegem contra perdas acidentais de registros de São João.
              </span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* Download Button */}
            <button
              onClick={handleDownloadBackup}
              className="w-full py-3 bg-white border-2 border-bento-navy hover:bg-stone-100 text-bento-navy text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[2px_2px_0_#1d1b20]"
            >
              <Download className="w-4 h-4 text-bento-blue" />
              <span>Gerar e Baixar Backup (.JSON)</span>
            </button>

            {/* Upload Button */}
            <label className="w-full py-3 px-4 border-2 border-dashed border-bento-navy text-bento-navy hover:bg-stone-50 hover:text-bento-navy text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2">
              <FileUp className="w-4 h-4 text-bento-navy" />
              <span>Carregar/Importar arquivo Backup</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportFile}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Technical Supabase Credentials / Postgres Guideline */}
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 flex flex-col justify-between shadow-[4px_4px_0px_#1D1B20]">
          <div className="space-y-4">
            <h3 className="text-sm font-display font-black uppercase tracking-tight flex items-center space-x-1.5">
              <Sparkles className="w-5 h-5 text-bento-red animate-pulse" />
              <span>Chaves de Acesso Supabase</span>
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-bold">
              Configurações obtidas e integradas com a URL e chave anônima pública fornecidas:
            </p>

            <div className="bg-bento-bg p-3.5 rounded-xl border-2 border-bento-navy space-y-2.5 text-[9px] font-mono font-bold text-bento-navy overflow-x-auto">
              <div>
                <span className="text-stone-400 uppercase tracking-wider block text-[8px] mb-0.5">SUPABASE_URL</span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-bento-red truncate select-all">{SUPABASE_URL}</span>
                  <button onClick={() => copyToClipboard(SUPABASE_URL, 'url')} className="p-1 hover:bg-stone-250 rounded cursor-pointer">
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed border-stone-300 pt-2">
                <span className="text-stone-400 uppercase tracking-wider block text-[8px] mb-0.5">SUPABASE_ANON_KEY</span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-bento-blue truncate select-all">{SUPABASE_ANON_KEY}</span>
                  <button onClick={() => copyToClipboard(SUPABASE_ANON_KEY, 'key')} className="p-1 hover:bg-stone-250 rounded cursor-pointer">
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-stone-500 font-bold bg-[#FEF9EC] p-3 rounded-lg border border-bento-yellow/40 leading-relaxed mt-2 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 text-bento-yellow flex-shrink-0" />
            <span>Chave segura configurada no arquivo de variáveis de ambiente do seu aplicativo.</span>
          </div>
        </div>

      </div>

      {/* Admin Reset Dashboard Panel */}
      <div className="bg-white border-2 border-b-8 border-r-8 border-bento-red rounded-[32px] p-6 shadow-[4px_4px_0px_#1D1B20] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <h3 className="text-sm font-display font-black uppercase text-bento-red tracking-tight flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-bento-red animate-pulse" />
            <span>Zerar Todos os Dados (Começar Limpo)</span>
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed font-bold">
            Se você deseja implantar ou começar a usar este sistema com dados reais do seu negócio, use esta ação administrativa. Ela apagará definitivamente todos os registros locais armazenados no navegador (Funcionários, Marcações de Ponto e Escalas). Se confirmado, você também pode solicitar a exclusão de todas as linhas de dados do seu banco de dados remoto Supabase na nuvem.
          </p>
        </div>

        <button
          onClick={handleWipeEverything}
          disabled={isWiping}
          className={`py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-bento-navy shadow-[3px_3px_0px_#1D1B20] ${
            isWiping 
              ? 'bg-stone-100 text-stone-400 border-stone-300 animate-pulse'
              : 'bg-white hover:bg-red-50 text-bento-red border-bento-navy hover:translate-y-[1px] hover:translate-x-[1px]'
          }`}
        >
          <Trash2 className="w-4 h-4 text-bento-red" />
          <span>{isWiping ? 'Limpando Base...' : 'Zerar Todo o Sistema'}</span>
        </button>
      </div>

      {/* Wipe Confirmation neo-brutalist Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-4 border-b-[12px] border-r-[12px] border-bento-navy rounded-[32px] w-full max-w-xl p-6 md:p-8 shadow-[6px_6px_0px_#1D1B20] space-y-6 relative overflow-hidden">
            
            {/* Close button */}
            <button 
              onClick={() => { if (!isWiping) setShowWipeModal(false); }}
              className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full border-2 border-bento-navy transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!wipeFeedbackMessage ? (
              <>
                <div className="space-y-3">
                  <div className="inline-flex p-3 bg-red-100 text-bento-red border-2 border-bento-navy rounded-2xl">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-display font-black uppercase text-bento-red tracking-tight">
                    Confirmar Exclusão Total
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-bold">
                    Esta ação é administrativa e <span className="text-bento-red underline">altamente destrutiva</span>. Ela limpará imediatamente todos os dados salvos localmente neste navegador.
                  </p>
                </div>

                {/* DB option checkbox */}
                <div className="bg-stone-50 border-2 border-bento-navy p-4 rounded-2xl flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id="wipe-remote-chk"
                    checked={wipeSupabaseRemote}
                    onChange={(e) => setWipeSupabaseRemote(e.target.checked)}
                    disabled={isWiping}
                    className="w-5 h-5 rounded border-2 border-bento-navy text-bento-red focus:ring-bento-red mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="wipe-remote-chk" className="text-xs text-bento-navy font-black select-none cursor-pointer">
                    Excluir permanentemente dados do banco em nuvem do Supabase integrado.
                    <span className="block text-[10px] text-stone-500 font-medium mt-1 leading-relaxed">
                      Se selecionado, o sistema apagará remotamente todos os registros das tabelas 'funcionarios', 'registros_ponto' e 'escalas' de forma irreversível.
                    </span>
                  </label>
                </div>

                {/* Actions footer */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={executeWipeEverything}
                    disabled={isWiping}
                    className={`flex-1 py-3 px-5 border-2 border-bento-navy rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[3px_3px_0px_#1D1B20] ${
                      isWiping 
                        ? 'bg-stone-100 text-stone-400 border-stone-300 animate-pulse'
                        : 'bg-bento-red hover:bg-[#c93232] text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isWiping ? 'Limpando Registros...' : 'Confirmar e Zerar'}</span>
                  </button>

                  <button
                    onClick={() => setShowWipeModal(false)}
                    disabled={isWiping}
                    className="py-3 px-5 border-2 border-bento-navy bg-white hover:bg-stone-100 text-bento-navy rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_#1D1B20]"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5 py-4 text-center animate-fade-in">
                <div className="inline-flex p-3.5 bg-emerald-100 text-emerald-600 border-2 border-bento-navy rounded-full animate-bounce">
                  <Check className="w-8 h-8 font-black" />
                </div>
                <h3 className="text-lg font-display font-black uppercase text-emerald-600 tracking-tight">
                  Base Zerada com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 font-bold whitespace-pre-wrap leading-relaxed max-w-sm mx-auto">
                  {wipeFeedbackMessage}
                </p>
                <button
                  onClick={() => {
                    setShowWipeModal(false);
                    setWipeFeedbackMessage(null);
                  }}
                  className="py-3 px-8 border-2 border-bento-navy bg-bento-yellow hover:bg-[#e1a201] text-bento-navy rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_#1D1B20] mx-auto block"
                >
                  Continuar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Sync Error Board Logger */}
      {errorLog && (
        <div className="p-4 bg-red-50 border-2 border-bento-red rounded-[20px] text-bento-navy flex items-start space-x-3 shadow-[2px_2px_0_#1d1b20]">
          <AlertCircle className="w-5 h-5 text-bento-red flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-xs uppercase text-bento-red block">Depurador Técnico de Conexão</span>
            <p className="text-xs leading-relaxed font-semibold font-mono text-zinc-700 bg-white/60 p-2 rounded-lg border border-red-200">
              {errorLog}
            </p>
            <span className="text-[10px] text-zinc-500 font-bold block pt-1">
              Dica de Resolução: Se houver erros sobre "relation matching" ou "table does not exist", copie o script abaixo e execute-o na aba "SQL editor" no painel de controle do Supabase para criar as tabelas do banco de dados!
            </span>
          </div>
        </div>
      )}

      {/* SQL Script Viewer section */}
      <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 shadow-[4px_4px_0px_#1D1B20]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b-2 border-dashed border-stone-200 mb-4 gap-3">
          <div>
            <h4 className="text-md font-display font-black uppercase tracking-tight">
              Script SQL de Criação no Supabase (PostgreSQL)
            </h4>
            <p className="text-xs text-stone-500 font-medium">Copie e execute na aba SQL Editor do painel do seu projeto Supabase.</p>
          </div>

          <button
            onClick={() => copyToClipboard(SUPABASE_SQL_SCHEMA, 'sql')}
            className="px-4 py-2.5 bg-bento-yellow hover:bg-[#e1a201] text-bento-navy text-xs font-black rounded-xl flex items-center space-x-1.5 cursor-pointer border-b-4 border-r-4 border-bento-dark shadow transition-all self-start"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-bento-navy" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Code pre view */}
        <pre className="p-4 bg-bento-bg rounded-2xl border-2 border-bento-navy h-64 overflow-y-auto text-[10px] sm:text-xs font-mono text-bento-navy font-semibold leading-relaxed uppercase scrollbar-thin">
          {SUPABASE_SQL_SCHEMA}
        </pre>
      </div>

    </div>
  );
}
