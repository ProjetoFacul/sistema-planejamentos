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

  // Estados do Professor (Navegação por Turma)
  const [profNome, setProfNome] = useState('');
  const [disciplina, setDisciplina] = useState('Matemática');
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null); // null = tela de seleção de turmas
  const [quinzenaAtiva, setQuinzenaAtiva] = useState(listaQuinzenasPadrao[0]);
  const [semanaAtiva, setSemanaAtiva] = useState<'1' | '2' | 'todas'>('1');
  
  const [dadosPorTurmaQuinzena, setDadosPorTurmaQuinzena] = useState<any>({});
  
  // Modal de Inspeção do Coordenador (Por Professor e Turma)
  const [professorInspecionado, setProfessorInspecionado] = useState<any>(null);
  const [coordTurmaInsp, setCoordTurmaInsp] = useState(turmasFixas[0].id);
  const [coordQuinzenaFiltro, setCoordQuinzenaFiltro] = useState(listaQuinzenasPadrao[0]);
  const [coordSemanaAtiva, setCoordSemanaAtiva] = useState<'1' | '2' | 'todas'>('todas');
  const [filtroBuscaProf, setFiltroBuscaProf] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          setUser(parsed);
          if (parsed.name) setProfNome(parsed.name);
          
          const savedRascunhos = localStorage.getItem(`rascunhos_turmas_${parsed.id}`);
          if (savedRascunhos) {
            setDadosPorTurmaQuinzena(JSON.parse(savedRascunhos));
          }
        }
      }
    } catch (e) {
      console.error("Erro ao ler usuário do localStorage", e);
    }
    carregarDadosServidor();
  }, []);

  const carregarDadosServidor = async () => {
    try {
      const resPlans = await axios.get(`${API}/plans`);
      if (resPlans && resPlans.data) {
        setAllPlans(resPlans.data);
      }

      const resTeachers = await axios.get(`${API}/teachers`);
      if (resTeachers && resTeachers.data) {
        setAllTeachers(resTeachers.data);
      }
    } catch (e) {
      console.warn("Erro ao buscar dados do backend.");
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErroLogin('');
    
    if (!email || !password) {
      setErroLogin('Preencha o e-mail e a senha.');
      return;
    }

    try {
      const res = await axios.post(`${API}/login`, { email, password });
      if (res && res.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        if (res.data.name) setProfNome(res.data.name);

        const savedRascunhos = localStorage.getItem(`rascunhos_turmas_${res.data.id}`);
        if (savedRascunhos) {
          setDadosPorTurmaQuinzena(JSON.parse(savedRascunhos));
        }

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
      
      const chaveCelula = `s${semana}_${dia}`;
      celulas[chaveCelula] = valor;

      const novosDados = {
        ...safePrev,
        [chaveUnica]: {
          ...dadosAtuais,
          turmaId: turmaSelecionada,
          quinzena: quinzenaAtiva,
          disciplina,
          profNome,
          celulasConteudo: celulas
        }
      };

      if (user?.id) {
        localStorage.setItem(`rascunhos_turmas_${user.id}`, JSON.stringify(novosDados));
      }

      return novosDados;
    });
  };

  const handleSkillsChange = (valor: string) => {
    if (!turmaSelecionada) return;
    const chaveUnica = getChaveDados(turmaSelecionada, quinzenaAtiva);

    setDadosPorTurmaQuinzena((prev: any) => {
      const safePrev = prev || {};
      const dadosAtuais = safePrev[chaveUnica] || { celulasConteudo: {}, skills: '' };

      const novosDados = {
        ...safePrev,
        [chaveUnica]: {
          ...dadosAtuais,
          turmaId: turmaSelecionada,
          quinzena: quinzenaAtiva,
          disciplina,
          profNome,
          skills: valor
        }
      };

      if (user?.id) {
        localStorage.setItem(`rascunhos_turmas_${user.id}`, JSON.stringify(novosDados));
      }

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

      await axios.post(`${API}/plans`, {
        teacherId: user?.id || 1,
        teacherEmail: user?.email || email,
        classId: 1, 
        subjectId: 1, 
        periodId: periodIndex > 0 ? periodIndex : 1, 
        content: JSON.stringify({
          ...dadosAtualizados,
          turmaNome: turmaObj?.name,
          quinzena: quinzenaAtiva,
          disciplina,
          profNome
        }),
        skills: dadosAtualizados.skills || '',
        status: 'SUBMITTED'
      });
      alert(`Planejamento da turma [${turmaObj?.name}] para a [${quinzenaAtiva}] enviado com sucesso!`);
      carregarDadosServidor();
    } catch (err: any) {
      alert('Erro ao enviar planejamento. Verifique o console.');
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-transparent flex items-center justify-center p-0 mb-3 overflow-hidden">
              <img src={LogoCaminho} alt="Colégio Valparaíso" className="w-full h-full object-fill" />
            </div>
            <h1 className="text-2xl font-extrabold text-indigo-950">COLÉGIO VALPARAÍSO</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase mt-1">Acesso Institucional ao Planejamento</p>
          </div>

          {erroLogin && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold">{erroLogin}</div>}
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Institucional</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="alex.castro@colegiovalparaiso.com" 
              className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <button 
            type="button" 
            onClick={() => handleLogin()} 
            className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-3 rounded-xl shadow transition-all text-sm cursor-pointer"
          >
            Entrar no Sistema
          </button>
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
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                {dias.map(d => <th key={d} className="p-3 border-r capitalize">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                {dias.map(d => {
                  const chave = `s${semanaNum}_${d}`;
                  const valorCel = safeConteudo[chave] || '';

                  if (modoLeitura) {
                    return (
                      <td key={d} className="p-3 border-r h-24 align-top whitespace-pre-wrap bg-slate-50/50">
                        {valorCel || <span className="text-slate-300 italic">-</span>}
                      </td>
                    );
                  }

                  return (
                    <td key={d} className="p-1 border-r h-28 align-top">
                      <textarea
                        value={valorCel}
                        onChange={(e) => handleCellChange(semanaNum, d, e.target.value)}
                        placeholder="Conteúdo do dia..."
                        className="w-full h-full min-h-[90px] p-2 text-xs outline-none resize-none bg-transparent focus:bg-amber-50 rounded"
                      />
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

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-slate-200 my-6 font-sans">
      
      <header className="border-b-2 border-indigo-900 pb-5 mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-transparent flex items-center justify-center p-0 shrink-0 overflow-hidden">
            <img src={LogoCaminho} alt="Colégio Valparaíso" className="w-full h-full object-fill" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight">COLÉGIO VALPARAÍSO</h1>
            <p className="text-xs md:text-sm font-semibold text-indigo-600 uppercase">Sistema de Planejamento Quinzenal por Turma</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-indigo-50 text-indigo-900 px-3.5 py-2 rounded-xl border border-indigo-200">
            {user.role === 'COORDINATOR' ? '🛡️ Coordenação' : `🏫 Professor(a): ${user.name}`}
          </span>
          <button onClick={() => { setUser(null); localStorage.removeItem('user'); }} className="bg-rose-100 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-rose-200">Sair</button>
        </div>
      </header>

      {user.role === 'COORDINATOR' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total de Professores</span>
              <span className="text-3xl font-extrabold mt-2">{(allTeachers || []).length}</span>
              <span className="text-[11px] opacity-70 mt-1">Professores cadastrados no sistema</span>
            </div>
            <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Planejamentos Enviados</span>
              <span className="text-3xl font-extrabold mt-2">{(allPlans || []).length}</span>
              <span className="text-[11px] opacity-70 mt-1">Total de envios realizados</span>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Status do Banco</span>
              <span className="text-xl font-extrabold mt-2 text-emerald-400">🟢 Online (Railway)</span>
              <span className="text-[11px] opacity-70 mt-1">Conexão ativa na nuvem</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-indigo-950">Acompanhamento do Corpo Docente</h2>
                <p className="text-xs text-slate-600 mt-0.5">Selecione um professor para inspecionar os planejamentos separados por turma e quinzena.</p>
              </div>
              <div className="w-full md:w-72">
                <input 
                  type="text" 
                  placeholder="Pesquisar professor por nome ou e-mail..." 
                  value={filtroBuscaProf}
                  onChange={e => setFiltroBuscaProf(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3.5">Professor(a)</th>
                    <th className="p-3.5">E-mail Institucional</th>
                    <th className="p-3.5 text-center">Envios Realizados</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!allTeachers || allTeachers.length === 0) ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">Nenhum professor cadastrado no sistema.</td></tr>
                  ) : (
                    allTeachers
                      .filter((t: any) => 
                        (t.name || '').toLowerCase().includes(filtroBuscaProf.toLowerCase()) ||
                        (t.email || '').toLowerCase().includes(filtroBuscaProf.toLowerCase())
                      )
                      .map((t: any, idx: number) => {
                        const planosDoProf = (allPlans || []).filter((p: any) => p.teacherId === t.id);
                        const qtdEnvios = planosDoProf.length;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-bold text-indigo-950 flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${qtdEnvios > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                              {t.name}
                            </td>
                            <td className="p-3.5 text-slate-600">{t.email}</td>
                            <td className="p-3.5 text-center">
                              {qtdEnvios > 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 text-[10px]">
                                  {qtdEnvios} {qtdEnvios === 1 ? 'Planejamento enviado' : 'Planejamentos enviados'}
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200 text-[10px]">
                                  Nenhum envio recente
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <button onClick={() => setProfessorInspecionado(t)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm transition-all">
                                🔍 Inspecionar por Turma
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* SE O PROFESSOR NÃO ESCOLHEU A TURMA AINDA */}
          {!turmaSelecionada ? (
            <div>
              <div className="bg-indigo-900 text-white p-6 rounded-2xl mb-6 shadow-md">
                <h2 className="text-xl font-black mb-1">Selecione a Turma para Planejamento</h2>
                <p className="text-xs opacity-80">Escolha abaixo qual turma você deseja planejar. Cada turma possui seu planejamento e cronograma exclusivos.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {turmasFixas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTurmaSelecionada(t.id)}
                    className="bg-white hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-600 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                  >
                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📚</span>
                    <span className="text-base font-extrabold text-indigo-950">{t.name}</span>
                    <span className="text-[11px] text-slate-400 mt-1">Clique para planejar</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* SE O PROFESSOR JÁ ESCOLHEU A TURMA */
            <div>
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-xl mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setTurmaSelecionada(null)}
                    className="bg-white text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 shadow-sm"
                  >
                    ← Voltar às Turmas
                  </button>
                  <div className="text-xs text-slate-700">
                    <strong className="text-indigo-900">Turma Ativa:</strong> <span className="bg-indigo-900 text-white px-2 py-0.5 rounded font-bold">{turmasFixas.find(t => t.id === turmaSelecionada)?.name}</span>
                  </div>
                </div>
                <button onClick={enviarPlanejamentoTurma} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow">
                  Enviar Planejamento desta Turma
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Professor(a):</label>
                  <input type="text" value={profNome} readOnly className="w-full bg-slate-200 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-700 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disciplina:</label>
                  <input type="text" value={disciplina} onChange={e => setDisciplina(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Escolha a Quinzena:</label>
                  <select value={quinzenaAtiva} onChange={e => setQuinzenaAtiva(e.target.value)} className="w-full bg-indigo-900 text-white border border-indigo-900 rounded-lg p-2.5 text-sm font-semibold outline-none shadow-sm cursor-pointer">
                    {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>

              {/* CAMPO DE HABILIDADES EXCLUSIVO DESTA TURMA */}
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Habilidades e Competências da Turma ({turmasFixas.find(t => t.id === turmaSelecionada)?.name}) - {quinzenaAtiva}:
                </label>
                <textarea
                  value={((dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || {}).skills) || ''}
                  onChange={e => handleSkillsChange(e.target.value)}
                  placeholder="Digite as habilidades e competências específicas trabalhadas com esta turma nesta quinzena..."
                  className="w-full h-24 p-3 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                />
              </div>

              <div className="flex bg-slate-200 p-1 rounded-xl gap-1 mb-4 w-fit">
                <button onClick={() => setSemanaAtiva('1')} className={`px-4 py-2 rounded-lg text-xs font-bold ${semanaAtiva === '1' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Preencher Semana 1</button>
                <button onClick={() => setSemanaAtiva('2')} className={`px-4 py-2 rounded-lg text-xs font-bold ${semanaAtiva === '2' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Preencher Semana 2</button>
                <button onClick={() => setSemanaAtiva('todas')} className={`px-4 py-2 rounded-lg text-xs font-bold ${semanaAtiva === 'todas' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Ver Ambas</button>
              </div>

              {(() => {
                const dadosAtuaisTurma = dadosPorTurmaQuinzena[getChaveDados(turmaSelecionada, quinzenaAtiva)] || { celulasConteudo: {} };
                return (
                  <>
                    {(semanaAtiva === '1' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA (${quinzenaAtiva}) - ${turmasFixas.find(t => t.id === turmaSelecionada)?.name}`, 'bg-indigo-900', dadosAtuaisTurma.celulasConteudo, false)}
                    {(semanaAtiva === '2' || semanaAtiva === 'todas') && renderTabelaSemanaUnica('2', `SEGUNDA SEMANA (${quinzenaAtiva}) - ${turmasFixas.find(t => t.id === turmaSelecionada)?.name}`, 'bg-emerald-800', dadosAtuaisTurma.celulasConteudo, false)}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE INSPEÇÃO DO COORDENADOR (POR TURMA) */}
      {professorInspecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-200 shrink-0 bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-black text-indigo-950">Inspeção de Planejamento por Turma</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Professor(a):</strong> {professorInspecionado.name} | <strong>E-mail:</strong> {professorInspecionado.email}
                </p>
              </div>
              <button onClick={() => setProfessorInspecionado(null)} className="w-10 h-10 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold transition-all">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
              {(() => {
                const planosDoProfessor = (allPlans || []).filter((p: any) => p.teacherId === professorInspecionado.id);
                const periodIndex = listaQuinzenasPadrao.indexOf(coordQuinzenaFiltro) + 1;
                
                const planoDaQuinzena = planosDoProfessor.find((p: any) => p.periodId === periodIndex);

                let dadosInspecao = { celulasConteudo: {}, skills: '' };
                if (planoDaQuinzena) {
                  if (planoDaQuinzena.skills) {
                    dadosInspecao.skills = planoDaQuinzena.skills;
                  }
                  if (planoDaQuinzena.content) {
                    try {
                      const parsed = JSON.parse(planoDaQuinzena.content);
                      dadosInspecao.celulasConteudo = parsed.celulasConteudo || parsed;
                      if (!dadosInspecao.skills && parsed.skills) {
                        dadosInspecao.skills = parsed.skills;
                      }
                    } catch(e) {}
                  }
                }

                return (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Selecionar Turma:</span>
                        <select value={coordTurmaInsp} onChange={e => setCoordTurmaInsp(e.target.value)} className="w-full bg-indigo-900 text-white font-bold text-xs px-3 py-2.5 rounded-lg outline-none">
                          {turmasFixas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Selecionar Quinzena:</span>
                        <select value={coordQuinzenaFiltro} onChange={e => setCoordQuinzenaFiltro(e.target.value)} className="w-full bg-indigo-900 text-white font-bold text-xs px-3 py-2.5 rounded-lg outline-none">
                          {listaQuinzenasPadrao.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end mb-4">
                      <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                        <button onClick={() => setCoordSemanaAtiva('1')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${coordSemanaAtiva === '1' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600'}`}>Ver Semana 1</button>
                        <button onClick={() => setCoordSemanaAtiva('2')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${coordSemanaAtiva === '2' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600'}`}>Ver Semana 2</button>
                        <button onClick={() => setCoordSemanaAtiva('todas')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${coordSemanaAtiva === 'todas' ? 'bg-white text-indigo-950 shadow' : 'text-slate-600'}`}>Ver Ambas</button>
                      </div>
                    </div>

                    {!planoDaQuinzena ? (
                      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                        Nenhum planejamento encontrado para este professor na <strong>{coordQuinzenaFiltro}</strong>.
                      </div>
                    ) : (
                      <>
                        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="text-xs font-bold text-indigo-950 uppercase mb-2">Habilidades e Competências da Turma:</h4>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap min-h-[50px]">
                            {dadosInspecao.skills || <span className="text-slate-400 italic">Nenhuma habilidade informada.</span>}
                          </div>
                        </div>

                        {(coordSemanaAtiva === '1' || coordSemanaAtiva === 'todas') && renderTabelaSemanaUnica('1', `PRIMEIRA SEMANA (${coordQuinzenaFiltro})`, 'bg-indigo-900', dadosInspecao.celulasConteudo, true)}
                        {(coordSemanaAtiva === '2' || coordSemanaAtiva === 'todas') && renderTabelaSemanaUnica('2', `SEGUNDA SEMANA (${coordQuinzenaFiltro})`, 'bg-emerald-800', dadosInspecao.celulasConteudo, true)}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0 rounded-b-2xl">
              <button onClick={() => setProfessorInspecionado(null)} className="px-6 py-2 bg-indigo-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-950">
                Fechar Inspeção
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}