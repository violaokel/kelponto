import React, { useState } from 'react';
import { Employee } from '../types';
import { Search, UserPlus, ToggleLeft, ToggleRight, Edit2, Phone, Calendar, Info, Check, X, Filter, Trash2 } from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeManager({ employees, onAddEmployee, onUpdateEmployee, onDeleteEmployee }: EmployeeManagerProps) {
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos' | 'Ativos' | 'Inativos'

  // Form states (For adding/editing)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Cozinheiro(a)');
  const [phone, setPhone] = useState('');
  const [admissionDate, setAdmissionDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Common kitchen functions/roles in Sao Joao
  const COMMON_ROLES = [
    'Cozinheiro(a) Chefe',
    'Auxiliar de Cozinha',
    'Chapeiro & Grelhador',
    'Salgadeiro(a)',
    'Ajudante Geral',
    'Padeiro(a) / Confeiteiro(a)',
    'Estoquista Cozinha'
  ];

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFullName('');
    setRole('Auxiliar de Cozinha');
    setPhone('');
    setAdmissionDate(new Date().toISOString().substring(0, 10)); // Current date
    setNotes('');
    setIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setRole(emp.role);
    setPhone(emp.phone);
    setAdmissionDate(emp.admissionDate);
    setNotes(emp.notes);
    setIsActive(emp.isActive);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Nome Completo e Telefone são de preenchimento obrigatório.');
      return;
    }

    if (editingEmployee) {
      onUpdateEmployee({
        id: editingEmployee.id,
        fullName,
        role,
        phone,
        admissionDate,
        notes,
        isActive
      });
    } else {
      onAddEmployee({
        fullName,
        role,
        phone,
        admissionDate,
        notes,
        isActive
      });
    }
    setIsFormOpen(false);
  };

  const toggleStatus = (emp: Employee) => {
    onUpdateEmployee({
      ...emp,
      isActive: !emp.isActive
    });
  };

  const confirmDeleteEmployee = (emp: Employee) => {
    const confirm = window.confirm(`ATENÇÃO: Deseja realmente excluir o colaborador [${emp.fullName}]? Esta ação também apagará todos os seus registros de ponto de forma irreversível.`);
    if (confirm) {
      onDeleteEmployee(emp.id);
    }
  };

  // Run dynamic search and filters on state
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone.includes(searchTerm) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === '' || emp.role === roleFilter;
    
    const matchesStatus = statusFilter === 'Todos' ||
                          (statusFilter === 'Ativos' && emp.isActive) ||
                          (statusFilter === 'Inativos' && !emp.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Title section with quick adding trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-[32px] border-2 border-b-8 border-r-8 border-bento-navy shadow-[4px_4px_0px_#1D1B20] text-bento-navy">
        <div>
          <h2 className="text-xl font-display font-black uppercase tracking-tight">
            Gestão da Equipe da Cozinha
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Cadastre novos cozinheiros, altere dados cadastrais, e gerencie o status de atividade da equipe.
          </p>
        </div>
        <button
          id="btn-add-employee"
          onClick={handleOpenAdd}
          className="px-5 py-3.5 bg-bento-blue hover:bg-sky-650 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer border-b-4 border-r-4 border-bento-dark"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span>Cadastrar Cozinheiro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Advanced search filters */}
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-5 space-y-5 h-fit text-bento-navy shadow-[4px_4px_0px_#1D1B20]">
          <h3 className="text-xs font-black flex items-center space-x-2 pb-3 border-b-2 border-dashed border-stone-205 uppercase tracking-widest text-bento-navy">
            <Filter className="w-4 h-4 text-bento-red" />
            <span>Filtros e Busca</span>
          </h3>

          {/* Text Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider">Pesquisa Rápida</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-bento-navy">
                <Search className="w-4 h-4 text-bento-navy" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, função ou fone..."
                className="w-full pl-9 pr-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy uppercase focus:outline-none focus:bg-white font-bold"
              />
            </div>
          </div>

          {/* Filter by Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider">Filtrar por Função</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy font-black focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">Todas as Funções</option>
              {COMMON_ROLES.map(roleOption => (
                <option key={roleOption} value={roleOption}>{roleOption}</option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider">Status Cadastral</label>
            <div className="flex gap-1 bg-bento-bg p-1 rounded-2xl border-2 border-bento-navy">
              {['Todos', 'Ativos', 'Inativos'].map((statusOpt) => (
                <button
                  key={statusOpt}
                  type="button"
                  onClick={() => setStatusFilter(statusOpt)}
                  className={`flex-1 py-1.5 px-2 text-center text-[9px] font-black rounded-xl transition-all cursor-pointer uppercase ${
                    statusFilter === statusOpt
                      ? 'bg-bento-blue text-white shadow border border-bento-navy'
                      : 'text-bento-navy hover:bg-stone-200'
                  }`}
                >
                  {statusOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters info */}
          {(searchTerm || roleFilter || statusFilter !== 'Todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('Todos');
              }}
              className="w-full py-2 bg-bento-bg hover:bg-stone-200 border-2 border-bento-navy text-bento-navy rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-block text-center shadow-[1.5px_1.5px_0_#1d1b20]"
            >
              Limpar Filtros
            </button>
          )}

          <div className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wide">
            ★ Mostrando {filteredEmployees.length} de {employees.length} no total.
          </div>
        </div>

        {/* Right Side: Employee Directory Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((emp) => (
              <div 
                key={emp.id}
                className={`bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-5 flex flex-col justify-between transition-all duration-200 shadow hover:-translate-y-0.5 shadow-[4px_4px_0px_#1D1B20] text-bento-navy ${
                  emp.isActive 
                    ? '' 
                    : 'bg-stone-50 border-stone-400 opacity-75'
                }`}
              >
                <div>
                  {/* Card Header information */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 bg-bento-yellow border-2 border-bento-navy rounded-2xl flex items-center justify-center text-md font-black text-bento-navy shadow-[2px_2px_0px_#1D1B20]">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-bento-navy uppercase tracking-tight">
                          {emp.fullName}
                        </h4>
                        <span className="inline-block text-[10px] font-black text-white bg-bento-blue px-2.5 py-0.5 rounded-lg mt-1 border border-bento-navy uppercase tracking-wider">
                          {emp.role}
                        </span>
                      </div>
                    </div>

                    {/* Status Toggler Badge */}
                    <button
                      onClick={() => toggleStatus(emp)}
                      title={emp.isActive ? "Desativar funcionário" : "Ativar funcionário"}
                      className="cursor-pointer"
                    >
                      {emp.isActive ? (
                        <div className="flex items-center space-x-1 py-1 px-2.5 bg-bento-yellow/20 text-bento-navy rounded-full text-[9px] font-black border-2 border-bento-navy uppercase tracking-wide">
                          <Check className="w-3 h-3 text-bento-red" />
                          <span>Ativo</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 py-1 px-2.5 bg-bento-bg text-stone-500 rounded-full text-[9px] font-black border border-bento-navy uppercase tracking-wide">
                          <X className="w-3 h-3 text-bento-navy" />
                          <span>Inativo</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Contact & Meta info */}
                  <div className="mt-4 space-y-2 border-t-2 border-b-2 border-dashed border-stone-200 py-3 text-xs font-bold text-stone-600">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-bento-navy" />
                      <span>{emp.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-bento-navy" />
                      <span>Admissão: {new Date(emp.admissionDate + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                    </div>
                    {emp.notes && (
                      <div className="flex items-start space-x-2 bg-bento-bg/75 p-2 rounded-xl border border-bento-navy/25 mt-1 text-stone-600">
                        <Info className="w-3.5 h-3.5 text-bento-red flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] leading-relaxed italic font-med cursor-default">
                          " {emp.notes} "
                        </p>
                      </div>
                    )}
                  </div>
                   {/* Card actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    id={`btn-manage-edit-${emp.id}`}
                    onClick={() => handleOpenEdit(emp)}
                    className="flex-1 py-2 px-2.5 bg-bento-bg hover:bg-bento-yellow border-2 border-bento-navy rounded-xl text-xs font-black text-bento-navy transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-[2px_2px_0px_#1D1B20]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-bento-navy" />
                    <span>Editar</span>
                  </button>
                  
                  {/* Status Toggle Action Button */}
                  <button
                    onClick={() => toggleStatus(emp)}
                    className={`px-3 py-2 border-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-[2px_2px_0px_#1D1B20] ${
                      emp.isActive
                        ? 'border-bento-navy bg-white text-bento-navy hover:bg-stone-100'
                        : 'border-bento-navy bg-stone-100 text-stone-500 hover:bg-bento-yellow'
                    }`}
                  >
                    <span>{emp.isActive ? 'Desativar' : 'Ativar'}</span>
                  </button>

                  {/* Delete Employee Button */}
                  <button
                    onClick={() => confirmDeleteEmployee(emp)}
                    className="px-2.5 py-2 border-2 border-bento-navy bg-white hover:bg-red-50 text-bento-red rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_#1D1B20]"
                    title="Excluir Colaborador"
                  >
                    <Trash2 className="w-4 h-4 text-bento-red" />
                  </button>
                </div>                </div>

              </div>
            ))}

            {filteredEmployees.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-bento-navy text-bento-navy shadow-[4px_4px_0_#1D1B20]">
                <p className="text-bento-red text-sm font-black uppercase tracking-widest">Nenhum resultado correspondente</p>
                <p className="text-xs text-stone-500 mt-1 font-bold">
                  Revise os termos digitados ou remova os filtros selecionados para listar toda a equipe da cozinha.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal/Overlay Form for Registering/Editing Employees */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in">
            
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-display font-black text-bento-navy uppercase tracking-tight flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-bento-red" />
              <span>{editingEmployee ? 'Editar Dados do Cozinheiro' : 'Cadastrar Novo Cozinheiro'}</span>
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Insira as informações de trabalho do profissional na cozinha para controle e auditoria do ponto.
            </p>

            <form onSubmit={handleSave} className="space-y-4.5 mt-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Maria José de Oliveira"
                  className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy font-black focus:outline-none focus:bg-white transition-all text-xs"
                  required
                />
              </div>

              {/* Grid 2-cols: Role & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Role dropdown / selector */}
                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Função principal</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-xs text-bento-navy font-black focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {COMMON_ROLES.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Telephone */}
                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Telefone de Contato *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (81) 99888-7777"
                    className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy font-bold focus:outline-none focus:bg-white transition-all text-xs"
                    required
                  />
                </div>

              </div>

              {/* Grid 2-cols: Admission Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Admission */}
                <div>
                  <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Data de Admissão</label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy font-black focus:outline-none focus:bg-white transition-all text-sm"
                    required
                  />
                </div>

                {/* Status Toggler */}
                <div className="flex flex-col justify-end">
                  <span className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Status Inicial</span>
                  <div className="flex items-center space-x-3 bg-bento-bg py-2 px-4 rounded-2xl border-2 border-bento-navy h-[42px]">
                    <span className="text-xs text-bento-navy font-extrabold uppercase">Ativo para Lançamentos</span>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className="ml-auto text-bento-navy focus:outline-none cursor-pointer"
                    >
                      {isActive ? (
                        <ToggleRight className="w-8 h-8 text-bento-blue" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-stone-400" />
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-black text-bento-navy uppercase tracking-wider mb-2">Observações Internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Indique alergias, especialidades ou restrições de horários do funcionário..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-bento-bg border-2 border-bento-navy rounded-2xl text-bento-navy font-bold focus:outline-none focus:bg-white transition-all text-xs leading-relaxed"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 flex gap-3 border-t-2 border-dashed border-stone-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3.5 px-4 bg-bento-bg hover:bg-stone-100 border-2 border-bento-navy text-bento-navy font-black rounded-xl text-xs cursor-pointer uppercase tracking-wider shadow-[2px_2px_0px_#1D1B20]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-employee-save-confirm"
                  type="submit"
                  className="flex-grow py-3.5 px-6 bg-bento-blue hover:bg-sky-650 text-white font-black rounded-xl text-xs cursor-pointer border-b-4 border-r-4 border-bento-dark uppercase tracking-wider shadow-md"
                >
                  {editingEmployee ? 'Atualizar Cadastro' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
