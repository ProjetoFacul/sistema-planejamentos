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

  // Estados do Professor
  const [profNome, setProfNome] = useState('');
  const [disciplina, setDisciplina] = useState('Matemática');
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);
  const [quinzenaAtiva, setQuinzenaAtiva] = useState(listaQuinzenasPadrao[0]);
  const [semanaAtiva, setSemanaAtiva] = useState<'1' | '2' | 'todas'>('1');
  const [dadosPorTurmaQuinzena, setDadosPorTurmaQuinzena] = useState<any>({});
  
  // Estados do Coordenador
  const [professorInspecionado, setProfessorInspecionado] = useState<any>(null);
  const [coordTurmaInsp, setCoordTurmaInsp] = useState(turmasFixas[0].id);
  const [coordQuinzenaFiltro, setCoordQuinzenaFiltro] = useState(listaQuinzenasPadrao[0]);
  const [coordSemanaAtiva, setCoordSemanaAtiva] = useState<'1' | '2' | 'todas'>('todas');
  const [filtroBuscaProf, setFiltroBuscaProf] = useState('');
  const [feedbackInput, setFeedbackInput] = useState(''); // Estado para o feedback digitado

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

  const handleCellChange = (semana: string, dia: string, valor: string) => {
    if (!turmaSelecionada) return;
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
    if (!turmaSelecionada) return;
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
    if (!turmaSelecionada) return;
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
        periodId: periodIndex > 0 ? periodIndex : 1, content: conteudoFinal, skills: dadosAtualizados.skills || '', status: 'SUBMITTED' // Envia sempre como submetido
      });
      alert(`Planejamento enviado com sucesso! A coordenação será notificada.`);
      carregarDadosServidor();
    } catch (err: any) {
      alert('Erro ao enviar planejamento. Verifique sua conexão.');
    }
  };

  // Função do Coordenador para aprovar ou devolver com feedback
  const avaliarPlanejamento = async (status: 'APPROVED' | 'NEEDS_REVISION') => {
    if (!professorInspecionado) return;
    try {
      const periodIndex = listaQuinzenasPadrao.indexOf(coordQuinzenaFiltro) + 1;
      const turmaObjInsp = turmasFixas.find(t => t.id === coordTurmaInsp);

      await axios.post(`${API}/plans/evaluate`, {
        teacherId: professorInspecionado.id,
        classNome: turmaObjInsp?.name,
        periodId: periodIndex,
        status: status,
        feedback: feedbackInput
      });

      alert(status === 'APPROVED' ? '✅ Planejamento Aprovado com sucesso!' : '⚠️ Planejamento devolvido ao professor para ajustes.');
      setFeedbackInput('');
      carregarDadosServidor();
    } catch (e) {
      alert('Erro ao processar a avaliação. Tente novamente.');
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3"><img src={LogoCaminho} alt="Logo" className="w-full h-full object-fill" /></div>
            <h1 className="text-2xl font-extrabold text-indigo-950">COLÉGIO VALPARAÍSO</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase mt-1">Acesso Institucional</p>
          </div>
          {erroLogin && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold">{erroLogin}</div>}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Institucional</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@colegiovalparaiso.com.br" className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={() => handleLogin()} className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-3 rounded-xl shadow transition-all text-sm">Entrar no Sistema</button>
        </div>
      </div>
    );
  }

  const renderTabelaSemanaUnica = (semanaNum: string, titulo: string, corHeader: string, dadosConteudo: any, modoLeitura: boolean = false) => {
    const safeConteudo = dadosConteudo || {};
    return (
      <div className="mb-8">
        <div className={`${corHeader} text-white text-xs font-bold px-4 py-2 rounded-t-xl`}>{titulo}</div>
        <div className="overflow-x-auto border border-slate-200 rounded-b-xl bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">{dias.map(d => <th key={d} className="p-3 border-r capitalize">{d}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                {dias.map(d => {
                  const chave = `s${semanaNum}_${d}`;
                  const valorCel = safeConteudo[chave] || '';
                  if (modoLeitura) return <td key={d} className="p-3 border-r h-24 align-top whitespace-pre-wrap bg-slate-50/50">{valorCel || <span className="text-slate-300 italic">-</span>}</td>;
                  return (
                    <td key={d} className="p-1 border-r h-28 align-top">
                      <textarea value={valorCel} onChange={(e) => handleCellChange(semanaNum, d, e.target.value)} placeholder="Conteúdo do dia..." className="w-full h-full min-h-[90px] p-2 text-xs outline-none resize-none bg-transparent focus:bg-amber-50 rounded" />
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

  // Encontra o status do planejamento atual na visão do professor
  let statusPlanoAtual = '';
  let feedbackDoPlano = '';
  if (turmaSelecionada && user.role === 'TEACHER') {
    const periodIndex = listaQuinzenasPadrao.indexOf(quinzenaAtiva) + 1;
    const turmaName = turmasFixas.find(t => t.id === turmaSelecionada)?.name;
    const planoServidor = allPlans.find(p => p.teacherId === user.id && p.periodId === periodIndex && p.class?.name === turmaName);
    
    if (planoServidor) {
      statusPlanoAtual = planoServidor.status;
      try {
        const parsed = JSON.parse(planoServidor.content);
        if (parsed.coordinatorFeedback) feedbackDoPlano = parsed.coordinatorFeedback;
      } catch(e) {}
    }
  }

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-slate-200 my-6 font-sans">
      <header className="border-b-2 border-indigo-900 pb-5 mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0"><img src={LogoCaminho} alt="Logo" className="w-full h-full object-fill" /></div>
          <div><h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight">COLÉGIO VALPARAÍSO</h1><p className="text-xs md:text-sm font-semibold text-indigo-600 uppercase">Sistema de Planejamento Quinzenal</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-indigo-50 text-indigo-900 px-3.5 py-2 rounded-xl border border-indigo-200">{user.role === 'COORDINATOR' ? '🛡️ Coordenação' : `🏫 Professor(a): ${user.name}`}</span>
          <button onClick={() => { setUser(null); localStorage.removeItem('user'); }} className="bg-rose-100 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-rose-200">Sair</button>
        </div>
      </header>

      {user.role === 'COORDINATOR' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-md"><span className="text-xs font-bold uppercase opacity-80">Professores Ativos</span><span className="block text-3xl font-extrabold mt-2">{(allTeachers || []).length}</span></div>
            <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow-md"><span className="text-xs font-bold uppercase opacity-80">Planejamentos Enviados</span><span className="block text-3xl font-extrabold mt-2">{(allPlans || []).length}</span></div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md"><span className="text-xs font-bold uppercase opacity-80">Status do Banco</span><span className="block text-xl font-extrabold mt-2 text-emerald-400">🟢 Online</span></div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div><h2 className="text-xl font-extrabold text-indigo-950">Acompanhamento do Corpo Docente</h2><p className="text-xs text-slate-600 mt-0.5">Selecione um professor para inspecionar e aprovar planejamentos.</p></div>
              <div className="w-full md:w-72"><input type="text" placeholder="Pesquisar professor..." value={filtroBuscaProf} onChange={e => setFiltroBuscaProf(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" /></div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead><tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200"><th className="p-3.5">Professor(a)</th><th className="p-3.5 text-center">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {allTeachers.filter((t: any) => t.name.toLowerCase().includes(filtroBuscaProf.toLowerCase())).map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-indigo-950">{t.name}</td>
                      <td className="p-3.5 text-center"><button onClick={() => setProfessorInspecionado(t)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm">🔍 Inspecionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {!turmaSelecionada ? (
            <div>
              <div className="bg-indigo-900 text-white p-6 rounded-2xl mb-6 shadow-md"><h2 className="text-xl font-black mb-1">Selecione a Turma para Planejamento</h2></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {turmasFixas.map(t => (
                  <button key={t.id} onClick={() => setTurmaSelecionada(t.id)} className="bg-white hover:bg-indigo-50 border-2 border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center">
                    <span className="text-3xl mb-2">📚</span><span className="text-base font-extrabold text-indigo-950">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <button onClick={() => setTurmaSelecionada(null)} className="bg-white text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100">← Voltar</button>
                
                <button 
                  onClick={enviarPlanejamentoTurma} 
                  disabled={statusPlanoAtual === 'APPROVED'}
                  className={`${statusPlanoAtual === 'APPROVED' ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow`}
                >
                  {statusPlanoAtual === 'NEEDS_REVISION' ? 'Reenviar Planejamento Ajustado' : 'Enviar Planejamento'}
                </button>
              </div>

              {/* AVISOS DE STATUS DA AVALIAÇÃO DA COORDENAÇÃO */}
              {statusPlanoAtual === 'NEEDS_REVISION' && (
                <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6 shadow-sm">
                  <h3 className="text-amber-800 font-bold text-sm">⚠️ Atenção: Planejamento Devolvido para Ajustes</h3>
                  <p className="text-amber-900 text-xs mt-1"><strong>Feedback da Coordenação:</strong> {feedbackDoPlano}</p>
                </div>
              )}
              {statusPlanoAtual === 'APPROVED' && (
                <div className="bg-emerald-100 border-l-4 border-emerald-500 p-4 rounded-r-xl mb-6 shadow-sm">
                  <h3 className="text-emerald-800 font-bold text-sm">✅ Planejamento Aprovado</h3>
                  <p className="text-emerald-900 text-xs mt-1">Este planejamento já foi validado pela coordenação e está trancado para edições.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disciplina:</label><input type="text" value={disciplina} onChange={e => setDisciplina(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none" disabled={statusPlanoAtual === 'APPROVED'}/></div>
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Escolha a Quinzena:</label>
                  <select value={quinzenaAtiva} onChange={e => setQuinzenaAtiva(e.target.value)} className="w-full bg-indigo-900 text-white rounded-lg p-2.5 text-sm outline-none">
                    {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Habilidades e Competências:</label>
                <textarea value={((dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || {}).skills) || ''} onChange={e => handleSkillsChange(e.target.value)} className="w-full h-24 p-3 text-xs border rounded-lg outline-none" disabled={statusPlanoAtual === 'APPROVED'}/>
              </div>

              <div className="flex bg-slate-200 p-1 rounded-xl gap-1 mb-4 w-fit">
                <button onClick={() => setSemanaAtiva('1')} className={`px-4 py-2 rounded-lg text-xs font-bold ${semanaAtiva === '1' ? 'bg-white shadow' : 'text-slate-600'}`}>Semana 1</button>
                <button onClick={() => setSemanaAtiva('2')} className={`px-4 py-2 rounded-lg text-xs font-bold ${semanaAtiva === '2' ? 'bg-white shadow' : 'text-slate-600'}`}>Semana 2</button>
              </div>

              {(() => {
                const dadosAtuais = dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || { celulasConteudo: {} };
                const readonly = statusPlanoAtual === 'APPROVED';
                return (
                  <>
                    {(semanaAtiva === '1' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA`, 'bg-indigo-900', dadosAtuais.celulasConteudo, readonly)}
                    {(semanaAtiva === '2' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('2', `SEGUNDA SEMANA`, 'bg-emerald-800', dadosAtuais.celulasConteudo, readonly)}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL DO COORDENADOR: APROVAÇÃO E DEVOLUTIVA */}
      {professorInspecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl shrink-0">
              <div><h3 className="text-xl font-black text-indigo-950">Inspeção de Planejamento</h3><p className="text-xs text-slate-500 mt-1">{professorInspecionado.name}</p></div>
              <button onClick={() => setProfessorInspecionado(null)} className="w-10 h-10 rounded-full bg-slate-200 font-bold hover:bg-rose-100 text-rose-700">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
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

                return (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-xl border shadow-sm">
                      <div>
                        <select value={coordTurmaInsp} onChange={e => setCoordTurmaInsp(e.target.value)} className="w-full bg-indigo-900 text-white font-bold text-xs px-3 py-2.5 rounded-lg outline-none">
                          {turmasFixas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <select value={coordQuinzenaFiltro} onChange={e => setCoordQuinzenaFiltro(e.target.value)} className="w-full bg-indigo-900 text-white font-bold text-xs px-3 py-2.5 rounded-lg outline-none">
                          {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </div>
                    </div>

                    {!planoDaTurmaEQuinzena ? (
                      <div className="p-8 text-center bg-white rounded-xl border text-slate-400 text-sm">Nenhum envio encontrado.</div>
                    ) : (
                      <>
                        <div className="mb-6 bg-white p-4 rounded-xl border shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs font-bold text-indigo-950 uppercase">Habilidades:</h4>
                             {planoDaTurmaEQuinzena.status === 'APPROVED' && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded">✅ Aprovado</span>}
                             {planoDaTurmaEQuinzena.status === 'NEEDS_REVISION' && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded">⚠️ Em Ajuste</span>}
                          </div>
                          <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-700 min-h-[50px]">{dadosInspecao.skills}</div>
                        </div>

                        {renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA`, 'bg-indigo-900', dadosInspecao.celulasConteudo, true)}
                        {renderTabelaSemanaUnica('2', `SEGUNDA SEMANA`, 'bg-emerald-800', dadosInspecao.celulasConteudo, true)}

                        {/* CAIXA DE AVALIAÇÃO DA COORDENAÇÃO */}
                        <div className="mt-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="text-sm font-black text-indigo-950 uppercase mb-3">Avaliação do Planejamento</h4>
                           <textarea 
                             value={feedbackInput} 
                             onChange={e => setFeedbackInput(e.target.value)}
                             className="w-full border border-slate-300 p-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 mb-3" 
                             placeholder="Digite aqui os ajustes necessários (caso precise devolver)..." 
                           />
                           <div className="flex gap-3">
                             <button onClick={() => avaliarPlanejamento('APPROVED')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold shadow-sm transition-all">✅ Aprovar Planejamento</button>
                             <button onClick={() => avaliarPlanejamento('NEEDS_REVISION')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-xs font-bold shadow-sm transition-all">⚠️ Devolver para Ajustes</button>
                           </div>
                        </div>
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