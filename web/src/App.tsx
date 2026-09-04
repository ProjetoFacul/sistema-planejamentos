import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LogoCaminho from './logo.semfundo.png';

const API = 'https://colegio-valparaiso-api.onrender.com/api';

const turmasFixas = [
  { id: '6A', name: '6º Ano A' }, { id: '6B', name: '6º Ano B' },
  { id: '7A', name: '7º Ano A' }, { id: '7B', name: '7º Ano B' },
  { id: '8A', name: '8º Ano A' }, { id: '8B', name: '8º Ano B' },
  { id: '9A', name: '9º Ano A' }, { id: '9B', name: '9º Ano B' },
  { id: '1S', name: '1ª Série' }, { id: '2S', name: '2ª Série' }, { id: '3S', name: '3ª Série' }
];

const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

const listaQuinzenasPadrao = [
  "Quinzena 01 (02/02 a 13/02)", "Quinzena 02 (16/02 a 27/02)",
  "Quinzena 03 (02/03 a 13/03)", "Quinzena 04 (16/03 a 27/03)",
  "Quinzena 05 (30/03 a 10/04)", "Quinzena 06 (13/04 a 24/04)"
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  // Navegação Interna da Coordenação ('auditoria' ou 'docentes')
  const [abaCoordenacao, setAbaCoordenacao] = useState<'auditoria' | 'docentes'>('auditoria');

  // Estados do Professor
  const [profNome, setProfNome] = useState('');
  const [disciplina, setDisciplina] = useState('Matemática');
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);
  const [quinzenaAtiva, setQuinzenaAtiva] = useState(listaQuinzenasPadrao[0]);
  const [semanaAtiva, setSemanaAtiva] = useState<'1' | '2' | 'todas'>('1');
  const [dadosPorTurmaQuinzena, setDadosPorTurmaQuinzena] = useState<any>({});
  
  // Modais e Gestão da Coordenação
  const [professorInspecionado, setProfessorInspecionado] = useState<any>(null);
  const [modalNovoProfessor, setModalNovoProfessor] = useState(false);
  const [novoNomeProf, setNovoNomeProf] = useState('');
  const [novoEmailProf, setNovoEmailProf] = useState('');
  const [novaSenhaProf, setNovaSenhaProf] = useState('');

  const [coordTurmaInsp, setCoordTurmaInsp] = useState(turmasFixas[0].id);
  const [coordQuinzenaFiltro, setCoordQuinzenaFiltro] = useState(listaQuinzenasPadrao[0]);
  const [filtroBuscaProf, setFiltroBuscaProf] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          setUser(parsed);
          if (parsed.name) setProfNome(parsed.name);
          const savedRascunhos = localStorage.getItem(`rascunhos_turmas_${parsed.id}`);
          if (savedRascunhos) setDadosPorTurmaQuinzena(JSON.parse(savedRascunhos));
        }
      }
    } catch (e) {}
    carregarDadosServidor();
  }, []);

  const carregarDadosServidor = async () => {
    try {
      const resPlans = await axios.get(`${API}/plans`);
      if (resPlans && resPlans.data) setAllPlans(resPlans.data);
      const resTeachers = await axios.get(`${API}/teachers`);
      if (resTeachers && resTeachers.data) setAllTeachers(resTeachers.data);
    } catch (e) {}
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErroLogin('');
    if (!email || !password) return setErroLogin('Preencha o e-mail e a senha.');

    try {
      const res = await axios.post(`${API}/login`, { email, password });
      if (res && res.data) {
        if (res.data.active === false) {
          return setErroLogin('Este acesso foi revogado / inativado pela coordenação.');
        }
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        if (res.data.name) setProfNome(res.data.name);

        const savedRascunhos = localStorage.getItem(`rascunhos_turmas_${res.data.id}`);
        if (savedRascunhos) setDadosPorTurmaQuinzena(JSON.parse(savedRascunhos));
        carregarDadosServidor();
      }
    } catch (err: any) {
      setErroLogin('E-mail institucional ou senha incorretos.');
    }
  };

  const getChaveDados = (turmaId: string, quinzena: string) => `${turmaId}_${quinzena}`;

  const getStatusPlanoAtual = () => {
    if (!turmaSelecionada || !user) return null;
    const periodIndex = listaQuinzenasPadrao.indexOf(quinzenaAtiva) + 1;
    const turmaName = turmasFixas.find(t => t.id === turmaSelecionada)?.name;
    const planoServidor = allPlans.find(p => p.teacherId === user.id && p.periodId === periodIndex && p.class?.name === turmaName);
    return planoServidor ? planoServidor.status : null;
  };

  const statusPlano = getStatusPlanoAtual();
  const isAprovado = statusPlano === 'APPROVED';
  const emAnalise = statusPlano === 'SUBMITTED';

  const handleCellChange = (semana: string, dia: string, valor: string) => {
    if (!turmaSelecionada || isAprovado || emAnalise) return;
    const chaveUnica = getChaveDados(turmaSelecionada, quinzenaAtiva);
    setDadosPorTurmaQuinzena((prev: any) => {
      const safePrev = prev || {};
      const dadosAtuais = safePrev[chaveUnica] || { celulasConteudo: {}, skills: '' };
      const celulas = { ...(dadosAtuais.celulasConteudo || {}) };
      celulas[`s${semana}_${dia}`] = valor;

      const novosDados = { ...safePrev, [chaveUnica]: { ...dadosAtuais, turmaId: turmaSelecionada, quinzena: quinzenaAtiva, disciplina, profNome, celulasConteudo: celulas } };
      if (user?.id) localStorage.setItem(`rascunhos_turmas_${user.id}`, JSON.stringify(novosDados));
      return novosDados;
    });
  };

  const handleSkillsChange = (valor: string) => {
    if (!turmaSelecionada || isAprovado || emAnalise) return;
    const chaveUnica = getChaveDados(turmaSelecionada, quinzenaAtiva);
    setDadosPorTurmaQuinzena((prev: any) => {
      const safePrev = prev || {};
      const dadosAtuais = safePrev[chaveUnica] || { celulasConteudo: {}, skills: '' };
      const novosDados = { ...safePrev, [chaveUnica]: { ...dadosAtuais, turmaId: turmaSelecionada, quinzena: quinzenaAtiva, disciplina, profNome, skills: valor } };
      if (user?.id) localStorage.setItem(`rascunhos_turmas_${user.id}`, JSON.stringify(novosDados));
      return novosDados;
    });
  };

  const enviarPlanejamentoTurma = async () => {
    if (!turmaSelecionada || isAprovado || emAnalise) return;
    try {
      const chaveUnica = getChaveDados(turmaSelecionada, quinzenaAtiva);
      const dadosAtualizados = dadosPorTurmaQuinzena[chaveUnica] || { celulasConteudo: {}, skills: '' };
      const periodIndex = listaQuinzenasPadrao.indexOf(quinzenaAtiva) + 1;
      const turmaObj = turmasFixas.find(t => t.id === turmaSelecionada);

      const conteudoFinal = JSON.stringify({
        ...dadosAtualizados, turmaId: turmaSelecionada, turmaNome: turmaObj?.name, quinzena: quinzenaAtiva, disciplina, profNome
      });

      await axios.post(`${API}/plans`, {
        teacherId: user?.id || 1, teacherEmail: user?.email || email, classCode: turmaSelecionada, subjectId: 1, 
        periodId: periodIndex > 0 ? periodIndex : 1, content: conteudoFinal, skills: dadosAtualizados.skills || '', status: 'SUBMITTED'
      });
      alert(`Planejamento despachado para a coordenação.`);
      carregarDadosServidor();
    } catch (err: any) {
      alert('Falha ao despachar planejamento. Verifique sua conexão.');
    }
  };

  const avaliarPlanejamento = async (status: 'APPROVED' | 'NEEDS_REVISION') => {
    if (!professorInspecionado) return;
    try {
      const periodIndex = listaQuinzenasPadrao.indexOf(coordQuinzenaFiltro) + 1;
      const turmaObjInsp = turmasFixas.find(t => t.id === coordTurmaInsp);

      await axios.post(`${API}/plans/evaluate`, {
        teacherId: professorInspecionado.id,
        classCode: coordTurmaInsp,
        classNome: turmaObjInsp?.name,
        periodId: periodIndex,
        status: status,
        feedback: feedbackInput
      });

      alert(status === 'APPROVED' ? 'Planejamento homologado e bloqueado para edições.' : 'Instrução de reajuste enviada ao docente.');
      setFeedbackInput('');
      carregarDadosServidor();
      setProfessorInspecionado(null);
    } catch (e) {
      alert('Erro ao processar avaliação.');
    }
  };

  const cadastrarNovoProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomeProf || !novoEmailProf || !novaSenhaProf) {
      return alert('Preencha todos os campos para cadastrar o docente.');
    }
    try {
      await axios.post(`${API}/teachers`, {
        name: novoNomeProf,
        email: novoEmailProf,
        password: novaSenhaProf,
        role: 'TEACHER',
        active: true
      });
      alert('Novo docente cadastrado com sucesso!');
      setNovoNomeProf('');
      setNovoEmailProf('');
      setNovaSenhaProf('');
      setModalNovoProfessor(false);
      carregarDadosServidor();
    } catch (err) {
      const novoId = Date.now();
      setAllTeachers(prev => [...prev, { id: novoId, name: novoNomeProf, email: novoEmailProf, active: true, role: 'TEACHER' }]);
      alert('Docente cadastrado localmente com sucesso!');
      setNovoNomeProf('');
      setNovoEmailProf('');
      setNovaSenhaProf('');
      setModalNovoProfessor(false);
    }
  };

  const alterarStatusDocente = async (professor: any, ativar: boolean) => {
    const acaoTexto = ativar ? 'ativar' : 'inativar (desligar)';
    if (confirm(`Deseja realmente ${acaoTexto} o acesso de ${professor.name}?`)) {
      try {
        await axios.patch(`${API}/teachers/${professor.id}/status`, { active: ativar });
        alert(`Status do docente atualizado com sucesso.`);
        carregarDadosServidor();
      } catch (e) {
        setAllTeachers(prev => prev.map(t => t.id === professor.id ? { ...t, active: ativar } : t));
        alert(`Status alterado localmente com sucesso.`);
      }
    }
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#070d1f] p-4">
        <div className="bg-[#0e162e] p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 text-slate-100">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <img src={LogoCaminho} alt="Logo" className="w-full h-full object-cover rounded-full shadow-md" />
            </div>
            <h1 className="text-xl font-black tracking-wider text-white">COLÉGIO VALPARAÍSO</h1>
            <p className="text-[11px] font-mono tracking-widest text-[#f97316] uppercase mt-1">Portal Pedagógico Institucional</p>
          </div>
          {erroLogin && <div className="mb-4 p-3 bg-orange-950/80 text-orange-200 text-xs rounded-xl font-medium border border-orange-900">{erroLogin}</div>}
          <div className="mb-4">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Credencial Institucional</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@colegiovalparaiso.com.br" className="w-full bg-[#070d1f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#f97316] transition-colors" />
          </div>
          <div className="mb-6">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Palavra-passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#070d1f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#f97316] transition-colors" />
          </div>
          <button onClick={() => handleLogin()} className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-950/50 transition-all text-sm tracking-wide">Acessar Sistema</button>
        </div>
      </div>
    );
  }

  const renderTabelaSemanaUnica = (semanaNum: string, titulo: string, corHeader: string, dadosConteudo: any, modoLeitura: boolean = false) => {
    const safeConteudo = dadosConteudo || {};
    return (
      <div className="mb-8">
        <div className={`${corHeader} text-white text-[11px] font-mono tracking-wider px-4 py-2.5 rounded-t-2xl font-bold uppercase`}>{titulo}</div>
        <div className="overflow-x-auto border border-slate-700 rounded-b-2xl bg-[#0e162e] shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr className="bg-[#070d1f] text-slate-300 font-mono text-[11px] border-b border-slate-700 text-center uppercase">{dias.map(d => <th key={d} className="p-3 border-r border-slate-700">{d}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-700">
              <tr>
                {dias.map(d => {
                  const chave = `s${semanaNum}_${d}`;
                  const valorCel = safeConteudo[chave] || '';
                  if (modoLeitura) return <td key={d} className="p-3 border-r border-slate-700 h-24 align-top whitespace-pre-wrap bg-[#0e162e]/50 text-slate-200">{valorCel || <span className="text-slate-500 italic">vazio</span>}</td>;
                  return (
                    <td key={d} className="p-1 border-r border-slate-700 h-28 align-top">
                      <textarea value={valorCel} onChange={(e) => handleCellChange(semanaNum, d, e.target.value)} placeholder="Diretrizes do dia..." className="w-full h-full min-h-[90px] p-2.5 text-xs outline-none resize-none bg-transparent text-slate-100 placeholder:text-slate-500 focus:bg-[#070d1f] rounded" />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  let feedbackDoPlano = '';
  if (turmaSelecionada && user.role === 'TEACHER') {
    const periodIndex = listaQuinzenasPadrao.indexOf(quinzenaAtiva) + 1;
    const turmaName = turmasFixas.find(t => t.id === turmaSelecionada)?.name;
    const planoServidor = allPlans.find(p => p.teacherId === user.id && p.periodId === periodIndex && p.class?.name === turmaName);
    
    if (planoServidor) {
      try {
        const parsed = JSON.parse(planoServidor.content);
        if (parsed.coordinatorFeedback) feedbackDoPlano = parsed.coordinatorFeedback;
      } catch(e) {}
    }
  }

  const modoBloqueadoGeral = isAprovado || emAnalise;

  return (
    <div className="w-full min-h-screen bg-[#070d1f] p-4 md:p-8 font-sans text-slate-100 box-border">
      <header className="bg-[#0e162e] border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 shadow-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
            <img src={LogoCaminho} alt="Logo" className="w-full h-full object-cover rounded-full shadow-md" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">COLÉGIO VALPARAÍSO</h1>
            <p className="text-[11px] font-mono tracking-widest text-[#f97316] font-bold uppercase">Gestão de Planejamento Docente</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'COORDINATOR' && (
            <div className="flex bg-[#070d1f] border border-slate-700 p-1 rounded-2xl gap-1">
              <button onClick={() => setAbaCoordenacao('auditoria')} className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${abaCoordenacao === 'auditoria' ? 'bg-[#f97316] text-white shadow-xs' : 'text-slate-400'}`}>🛡️ Painel da Coordenação</button>
              <button onClick={() => setAbaCoordenacao('docentes')} className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${abaCoordenacao === 'docentes' ? 'bg-[#f97316] text-white shadow-xs' : 'text-slate-400'}`}>👥 Gestão de Docentes</button>
            </div>
          )}
          <span className="text-xs font-mono bg-[#070d1f] text-slate-200 font-bold px-4 py-2.5 rounded-2xl border border-slate-700 shadow-2xs">
            {user.role === 'COORDINATOR' ? 'Coordenador(a)' : `Docente: ${user.name}`}
          </span>
          <button onClick={() => { setUser(null); localStorage.removeItem('user'); }} className="bg-[#152246] hover:bg-[#1c2c5c] text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm">Encerrar Sessão</button>
        </div>
      </header>

      {user.role === 'COORDINATOR' ? (
        <div>
          {abaCoordenacao === 'auditoria' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#0e162e] p-6 rounded-3xl border border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">Corpo Docente Ativo</span>
                  <span className="text-3xl font-black text-white mt-3">{(allTeachers || []).filter(t => t.active !== false).length}</span>
                </div>
                <div className="bg-[#0e162e] p-6 rounded-3xl border border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">Total de Envios</span>
                  <span className="text-3xl font-black text-[#f97316] mt-3">{(allPlans || []).length}</span>
                </div>
                <div className="bg-[#0e162e] p-6 rounded-3xl border border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">Status do Motor</span>
                  <span className="text-sm font-black text-emerald-400 mt-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Sincronizado</span>
                </div>
              </div>

              <div className="bg-[#0e162e] border border-slate-800 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-black text-white">Acompanhamento e Auditoria</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Visão consolidada de pendências por turma e quinzena (Apenas docentes ativos).</p>
                  </div>
                  <div className="w-full md:w-80">
                    <input type="text" placeholder="Filtrar professor ativo..." value={filtroBuscaProf} onChange={e => setFiltroBuscaProf(e.target.value)} className="w-full bg-[#070d1f] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-[#f97316] transition-colors" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#070d1f] text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800">
                        <th className="p-4">Professor(a) Ativo</th>
                        <th className="p-4 text-center">Panorama de Análise</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {/* FILTRA APENAS OS ATIVOS NO PAINEL PRINCIPAL DE AUDITORIA */}
                      {allTeachers.filter((t: any) => t.active !== false && t.name.toLowerCase().includes(filtroBuscaProf.toLowerCase())).map((t: any, idx: number) => {
                        const planosDoProf = (allPlans || []).filter((p: any) => p.teacherId === t.id);
                        const totalAprovados = planosDoProf.filter((p: any) => p.status === 'APPROVED').length;
                        const totalEnviados = planosDoProf.length;

                        const detalhesPendencias: { turmaNome: string, quinzenaTexto: string, status: string }[] = [];
                        turmasFixas.forEach(tf => {
                          listaQuinzenasPadrao.forEach((qp, qIdx) => {
                            const pFound = planosDoProf.find((p: any) => p.periodId === (qIdx + 1) && p.class?.name === tf.name);
                            if (pFound && (pFound.status === 'SUBMITTED' || pFound.status === 'NEEDS_REVISION')) {
                              detalhesPendencias.push({ turmaNome: tf.name, quinzenaTexto: `Q${qIdx + 1}`, status: pFound.status });
                            }
                          });
                        });

                        return (
                          <tr key={idx} className="hover:bg-[#121c38] transition-colors">
                            <td className="p-4 font-bold text-white">{t.name}</td>
                            <td className="p-4 text-center">
                              {totalEnviados === 0 ? (
                                <span className="text-slate-500 font-mono text-[11px]">Nenhum envio registrado</span>
                              ) : totalAprovados === totalEnviados ? (
                                <span className="bg-emerald-950 text-emerald-300 font-mono font-bold px-3 py-1.5 rounded-xl border border-emerald-800 text-[11px]">
                                  ✅ Aprovado (100%)
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="bg-orange-950 text-orange-300 font-mono font-bold px-3 py-1.5 rounded-xl border border-orange-800 text-[11px] animate-pulse">
                                    ⏳ Pendente de Análise
                                  </span>
                                  {detalhesPendencias.length > 0 && (
                                    <div className="text-[10px] text-slate-400 font-mono flex flex-wrap justify-center gap-1">
                                      {detalhesPendencias.map((dp, dIdx) => (
                                        <span key={dIdx} className="inline-block bg-[#070d1f] border border-slate-700 text-slate-300 rounded px-1.5 py-0.5">
                                          {dp.turmaNome} ({dp.quinzenaTexto})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => setProfessorInspecionado(t)} className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-2xs">
                                🔍 Inspecionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ABA EXCLUSIVA DE GESTÃO DE DOCENTES */
            <div className="space-y-6">
              <div className="bg-[#0e162e] border border-slate-800 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">Gestão do Corpo Docente</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Cadastre novos professores ou gerencie o desligamento e reativação de acessos.</p>
                </div>
                <button onClick={() => setModalNovoProfessor(true)} className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-5 py-3 rounded-2xl text-xs transition-all shadow-sm">
                  + Cadastrar Novo Docente
                </button>
              </div>

              {/* Seção de Professores Ativos */}
              <div className="bg-[#0e162e] border border-slate-800 p-6 rounded-3xl shadow-xs">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">🟢 Docentes Ativos no Sistema</h3>
                <div className="rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#070d1f] text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800">
                        <th className="p-4">Nome</th>
                        <th className="p-4">E-mail Institucional</th>
                        <th className="p-4 text-center">Ações de Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allTeachers.filter((t: any) => t.active !== false).map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#121c38] transition-colors">
                          <td className="p-4 font-bold text-white">{t.name}</td>
                          <td className="p-4 font-mono text-slate-400">{t.email}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => alterarStatusDocente(t, false)} className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                              🚫 Desligar / Inativar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seção de Professores Inativos / Desligados (COM OPÇÃO DE VER HISTÓRICO) */}
              <div className="bg-[#0e162e] border border-slate-800 p-6 rounded-3xl shadow-xs">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">🔴 Docentes Inativos / Desligados (Histórico de Planejamentos)</h3>
                <div className="rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#070d1f] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                        <th className="p-4">Nome</th>
                        <th className="p-4">E-mail Institucional</th>
                        <th className="p-4 text-center">Ações e Histórico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allTeachers.filter((t: any) => t.active === false).length === 0 ? (
                        <tr><td colSpan={3} className="p-6 text-center text-slate-500 font-mono italic">Nenhum docente inativo no momento.</td></tr>
                      ) : (
                        allTeachers.filter((t: any) => t.active === false).map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#121c38] transition-colors">
                            <td className="p-4 font-bold text-slate-200">{t.name}</td>
                            <td className="p-4 font-mono text-slate-400">{t.email}</td>
                            <td className="p-4 text-center flex items-center justify-center gap-2">
                              <button onClick={() => setProfessorInspecionado(t)} className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-2xs">
                                🔍 Inspecionar Histórico
                              </button>
                              <button onClick={() => alterarStatusDocente(t, true)} className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                                ✅ Reativar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {!turmaSelecionada ? (
            <div>
              <div className="bg-[#0e162e] border border-slate-800 p-6 rounded-3xl mb-8 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Selecione uma Turma Alvo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Os alertas em laranja indicam qual quinzena exige ação corretiva.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {turmasFixas.map(t => {
                  const planosDaTurma = (allPlans || []).filter((p: any) => p.teacherId === user.id && p.class?.name === t.name);
                  const reajustesDaTurma = planosDaTurma.filter((p: any) => p.status === 'NEEDS_REVISION');
                  
                  return (
                    <button key={t.id} onClick={() => setTurmaSelecionada(t.id)} className="relative bg-[#0e162e] hover:border-[#f97316] border border-slate-800 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col items-start group text-left">
                      
                      {reajustesDaTurma.length > 0 ? (
                        <div className="absolute top-4 right-4 bg-orange-950 text-orange-300 border border-orange-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl shadow-2xs animate-pulse">
                          ⚠️ Reajuste Requerido
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 text-slate-500 group-hover:text-[#f97316] transition-colors font-bold">
                          →
                        </div>
                      )}

                      <div className="w-10 h-10 rounded-2xl bg-orange-950/50 border border-orange-900/50 flex items-center justify-center text-[#f97316] font-black mb-4">
                        📖
                      </div>
                      <span className="text-base font-black text-white group-hover:text-[#f97316] transition-colors">{t.name}</span>
                      
                      <div className="mt-3 text-[11px] font-mono text-slate-400">
                        {reajustesDaTurma.length > 0 ? (
                          <span className="text-orange-400 font-bold">Quinzenas com pendência de ajuste</span>
                        ) : (
                          <span>Acessar diretrizes</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-[#0e162e] border border-slate-800 p-5 rounded-3xl mb-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
                <button onClick={() => setTurmaSelecionada(null)} className="bg-[#070d1f] hover:bg-[#152246] text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all">← Voltar às Turmas</button>
                
                <button 
                  onClick={enviarPlanejamentoTurma} 
                  disabled={modoBloqueadoGeral}
                  className={`${modoBloqueadoGeral ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-[#f97316] hover:bg-[#ea580c] text-white'} font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-sm`}
                >
                  {isAprovado ? 'Planejamento Homologado (Trancado)' : emAnalise ? 'Planejamento em Análise (Aguardando Coordenação)' : statusPlano === 'NEEDS_REVISION' ? 'Despachar Reajuste Corrigido' : 'Despachar Planejamento'}
                </button>
              </div>

              {statusPlano === 'NEEDS_REVISION' && (
                <div className="bg-orange-950/60 border border-orange-800 p-5 rounded-3xl mb-6 shadow-2xs">
                  <h3 className="text-orange-300 font-bold text-xs uppercase font-mono tracking-wider">⚠️ Reajuste Solicitado pela Coordenação</h3>
                  <p className="text-orange-200 text-xs mt-1.5 leading-relaxed"><strong>Instrução:</strong> {feedbackDoPlano}</p>
                </div>
              )}
              {emAnalise && (
                <div className="bg-blue-950/60 border border-blue-800 p-5 rounded-3xl mb-6 shadow-2xs">
                  <h3 className="text-blue-300 font-bold text-xs uppercase font-mono tracking-wider">⏳ Planejamento em Análise</h3>
                  <p className="text-blue-200 text-xs mt-1.5">Este planejamento foi despachado para a coordenação e está aguardando auditoria. Novos envios ou edições estão temporariamente desativados.</p>
                </div>
              )}
              {isAprovado && (
                <div className="bg-emerald-950/60 border border-emerald-800 p-5 rounded-3xl mb-6 shadow-2xs">
                  <h3 className="text-emerald-300 font-bold text-xs uppercase font-mono tracking-wider">✅ Homologado e Aprovado pela Coordenação</h3>
                  <p className="text-emerald-200 text-xs mt-1.5">Este planejamento foi validado com sucesso. As edições e reenvios estão permanentemente bloqueados.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="bg-[#0e162e] border border-slate-800 p-5 rounded-3xl shadow-xs">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-2">Componente Curricular</label>
                  <input type="text" value={disciplina} onChange={e => setDisciplina(e.target.value)} className="w-full bg-[#070d1f] border border-slate-700 rounded-2xl p-3 text-xs outline-none font-bold text-white" disabled={modoBloqueadoGeral}/>
                </div>
                <div className="bg-[#0e162e] border border-slate-800 p-5 rounded-3xl shadow-xs">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-2">Ciclo / Quinzena</label>
                  <select value={quinzenaAtiva} onChange={e => setQuinzenaAtiva(e.target.value)} className="w-full bg-[#070d1f] border border-slate-700 text-white font-bold rounded-2xl p-3 text-xs outline-none cursor-pointer">
                    {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#0e162e] border border-slate-800 p-5 rounded-3xl mb-6 shadow-xs">
                <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-2">Habilidades e Competências da BNCC</label>
                <textarea value={((dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || {}).skills) || ''} onChange={e => handleSkillsChange(e.target.value)} className="w-full h-24 p-3.5 text-xs bg-[#070d1f] border border-slate-700 rounded-2xl outline-none resize-none text-white placeholder:text-slate-600" disabled={modoBloqueadoGeral}/>
              </div>

              <div className="flex bg-[#0e162e] border border-slate-800 p-1.5 rounded-2xl gap-1.5 mb-5 w-fit">
                <button onClick={() => setSemanaAtiva('1')} className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${semanaAtiva === '1' ? 'bg-[#f97316] text-white shadow-xs' : 'text-slate-400'}`}>Primeira Semana</button>
                <button onClick={() => setSemanaAtiva('2')} className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${semanaAtiva === '2' ? 'bg-[#f97316] text-white shadow-xs' : 'text-slate-400'}`}>Segunda Semana</button>
              </div>

              {(() => {
                const dadosAtuais = dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || { celulasConteudo: {} };
                return (
                  <>
                    {(semanaAtiva === '1' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA DE ATIVIDADES`, 'bg-[#070d1f]', dadosAtuais.celulasConteudo, modoBloqueadoGeral)}
                    {(semanaAtiva === '2' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('2', `SEGUNDA SEMANA DE ATIVIDADES`, 'bg-[#0e162e]', dadosAtuais.celulasConteudo, modoBloqueadoGeral)}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO DE NOVO DOCENTE */}
      {modalNovoProfessor && (
        <div className="fixed inset-0 bg-[#070d1f]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e162e] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-700 text-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-white">Cadastrar Novo Docente</h3>
              <button onClick={() => setModalNovoProfessor(false)} className="w-8 h-8 rounded-xl bg-[#152246] hover:bg-orange-950 text-slate-300 font-bold flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={cadastrarNovoProfessor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">Nome Completo</label>
                <input type="text" value={novoNomeProf} onChange={e => setNovoNomeProf(e.target.value)} placeholder="Prof. Nome Sobrenome" className="w-full bg-[#070d1f] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#f97316]" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">E-mail Institucional</label>
                <input type="email" value={novoEmailProf} onChange={e => setNovoEmailProf(e.target.value)} placeholder="docente@colegiovalparaiso.com.br" className="w-full bg-[#070d1f] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#f97316]" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">Senha Provisória</label>
                <input type="password" value={novaSenhaProf} onChange={e => setNovaSenhaProf(e.target.value)} placeholder="••••••••" className="w-full bg-[#070d1f] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#f97316]" required />
              </div>
              <button type="submit" className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-sm mt-4">Salvar e Conceder Acesso</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE INSPEÇÃO DA COORDENAÇÃO */}
      {professorInspecionado && (
        <div className="fixed inset-0 bg-[#070d1f]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e162e] rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl border border-slate-700 flex flex-col overflow-hidden text-slate-100">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-[#070d1f] shrink-0">
              <div>
                <h3 className="text-lg font-black text-white">Auditoria de Planejamento</h3>
                <p className="text-xs font-mono text-[#f97316] mt-0.5 uppercase font-bold">
                  Docente: {professorInspecionado.name} {professorInspecionado.active === false && '(Inativo / Desligado)'}
                </p>
              </div>
              <button onClick={() => setProfessorInspecionado(null)} className="w-9 h-9 rounded-2xl bg-[#152246] hover:bg-orange-950 text-slate-300 hover:text-orange-300 font-bold transition-colors flex items-center justify-center">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-[#070d1f]">
              {(() => {
                const planosProf = (allPlans || []).filter((p: any) => p.teacherId === professorInspecionado.id);
                const periodIndex = listaQuinzenasPadrao.indexOf(coordQuinzenaFiltro) + 1;
                
                const planoDaTurmaEQuinzena = planosProf.find((p: any) => {
                  const matchPeriodo = p.periodId === periodIndex;
                  let matchJsonTurma = false;
                  if (p.content) {
                    try { if (JSON.parse(p.content).turmaId === coordTurmaInsp) matchJsonTurma = true; } catch(e) {}
                  }
                  return matchPeriodo && matchJsonTurma;
                });

                let dadosInspecao = { celulasConteudo: {}, skills: '' };
                if (planoDaTurmaEQuinzena) {
                  dadosInspecao.skills = planoDaTurmaEQuinzena.skills || '';
                  try {
                    const parsed = JSON.parse(planoDaTurmaEQuinzena.content);
                    dadosInspecao.celulasConteudo = parsed.celulasConteudo || parsed;
                    if (!dadosInspecao.skills) dadosInspecao.skills = parsed.skills || '';
                  } catch(e) {}
                }

                const planoJaAprovadoInsp = planoDaTurmaEQuinzena?.status === 'APPROVED';

                return (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-[#0e162e] p-5 rounded-3xl border border-slate-800 shadow-2xs">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1.5">Turma Alvo</label>
                        <select value={coordTurmaInsp} onChange={e => setCoordTurmaInsp(e.target.value)} className="w-full bg-[#070d1f] border border-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl outline-none cursor-pointer">
                          {turmasFixas.map(t => {
                            const planoDessaOpcao = planosProf.find((p: any) => p.periodId === periodIndex && JSON.parse(p.content || '{}').turmaId === t.id);
                            let statusTexto = ' (Sem envio)';
                            if (planoDessaOpcao?.status === 'SUBMITTED' || planoDessaOpcao?.status === 'NEEDS_REVISION') statusTexto = ' (Pendente de Análise)';
                            if (planoDessaOpcao?.status === 'APPROVED') statusTexto = ' (Aprovado)';

                            return <option key={t.id} value={t.id}>{t.name}{statusTexto}</option>
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1.5">Ciclo Quinzenal</label>
                        <select value={coordQuinzenaFiltro} onChange={e => setCoordQuinzenaFiltro(e.target.value)} className="w-full bg-[#070d1f] border border-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl outline-none cursor-pointer">
                          {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </div>
                    </div>

                    {!planoDaTurmaEQuinzena ? (
                      <div className="p-12 text-center bg-[#0e162e] rounded-3xl border border-slate-800 text-slate-400 text-xs font-mono">Nenhum envio protocolado para esta Turma e Ciclo.</div>
                    ) : (
                      <>
                        <div className="mb-6 bg-[#0e162e] p-5 rounded-3xl border border-slate-800 shadow-2xs">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="text-[11px] font-mono uppercase font-bold text-slate-300">Habilidades Registradas:</h4>
                             {planoDaTurmaEQuinzena.status === 'APPROVED' && <span className="bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border border-emerald-800">✅ Aprovado</span>}
                             {planoDaTurmaEQuinzena.status === 'NEEDS_REVISION' && <span className="bg-orange-950 text-orange-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border border-orange-800">⚠️ Reajuste Solicitado</span>}
                             {planoDaTurmaEQuinzena.status === 'SUBMITTED' && <span className="bg-orange-950 text-orange-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border border-orange-800">⏳ Pendente de Análise</span>}
                          </div>
                          <div className="p-3.5 bg-[#070d1f] border border-slate-700 rounded-2xl text-xs text-slate-200 min-h-[50px]">{dadosInspecao.skills}</div>
                        </div>

                        {renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA`, 'bg-[#070d1f]', dadosInspecao.celulasConteudo, true)}
                        {renderTabelaSemanaUnica('2', `SEGUNDA SEMANA`, 'bg-[#0e162e]', dadosInspecao.celulasConteudo, true)}

                        {planoJaAprovadoInsp ? (
                          <div className="mt-8 bg-emerald-950/40 border border-emerald-800 p-6 rounded-3xl text-center">
                            <p className="text-emerald-300 font-mono text-xs font-bold uppercase">🔒 Planejamento Homologado</p>
                            <p className="text-emerald-200/80 text-xs mt-1">Este planejamento já foi validado e aprovado. As opções de edição e reajuste foram encerradas para este ciclo.</p>
                          </div>
                        ) : (
                          <div className="mt-8 bg-[#0e162e] p-6 rounded-3xl border border-slate-800 shadow-2xs">
                             <h4 className="text-xs font-mono uppercase font-black text-white mb-3">Diretiva de Auditoria</h4>
                             <textarea 
                               value={feedbackInput} 
                               onChange={e => setFeedbackInput(e.target.value)}
                               className="w-full bg-[#070d1f] border border-slate-700 p-4 rounded-2xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#f97316] mb-4 resize-none h-24" 
                               placeholder="Descreva as orientações de reajuste caso necessário..." 
                             />
                             <div className="flex flex-col sm:flex-row gap-3">
                               <button onClick={() => avaliarPlanejamento('APPROVED')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm">✅ Homologar e Aprovar</button>
                               <button onClick={() => avaliarPlanejamento('NEEDS_REVISION')} className="flex-1 bg-[#f97316] hover:bg-[#ea580c] text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm">⚠️ Solicitar Reajuste ao Docente</button>
                             </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}