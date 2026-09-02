import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Rota de Login Institucional
app.post('/api/login', async (req: any, res: any) => {
  const { email, password } = req.body;
  try {
    let user: any = await prisma.user.findUnique({ where: { email } });
    
    if (!user && email && email.includes('@colegiovalparaiso.com.br')) {
      const isCoord = email.includes('coord') || email.includes('coordenacao');
      const nomeGerado = email.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      
      user = await prisma.user.create({
        data: {
          name: isCoord ? 'Coordenação Pedagógica' : nomeGerado,
          email: email,
          password: password || '123',
          role: isCoord ? 'COORDINATOR' : 'TEACHER'
        }
      });
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'E-mail institucional ou senha incorretos.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({ where: { role: 'TEACHER' } });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar professores.' });
  }
});

// Rota para o Professor Salvar/Enviar Planejamento
app.post('/api/plans', async (req: any, res: any) => {
  const { teacherId, teacherEmail, classCode, subjectId, periodId, content, skills, status } = req.body;
  try {
    const sentDate = status === 'SUBMITTED' ? new Date() : null;

    let validTeacherId = Number(teacherId);
    if (teacherEmail) {
      let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
      if (teacher) validTeacherId = teacher.id;
    }

    const nomesTurmas: any = {
      '6A': '6º Ano A', '6B': '6º Ano B', '7A': '7º Ano A', '7B': '7º Ano B',
      '8A': '8º Ano A', '8B': '8º Ano B', '9A': '9º Ano A', '9B': '9º Ano B',
      '1S': '1ª Série', '2S': '2ª Série', '3S': '3ª Série'
    };
    const nomeTurmaReal = nomesTurmas[classCode] || '6º Ano A';

    let turmaObj = await prisma.class.findFirst({ where: { name: nomeTurmaReal } });
    if (!turmaObj) turmaObj = await prisma.class.create({ data: { name: nomeTurmaReal } });

    let defaultSubject = await prisma.subject.findFirst();
    if (!defaultSubject) defaultSubject = await prisma.subject.create({ data: { name: 'Matemática' } });

    let validPeriodId = Number(periodId) || 1;
    await prisma.period.upsert({
      where: { id: validPeriodId }, update: {}, create: { id: validPeriodId, name: `Quinzena ${validPeriodId}` }
    });

    const plan = await prisma.lessonPlan.upsert({
      where: {
        teacherId_classId_subjectId_periodId: {
          teacherId: validTeacherId, classId: turmaObj.id, subjectId: defaultSubject.id, periodId: validPeriodId
        }
      },
      update: { content, skills, status, sentAt: sentDate },
      create: { 
        teacherId: validTeacherId, classId: turmaObj.id, subjectId: defaultSubject.id, periodId: validPeriodId, 
        content, skills, status, sentAt: sentDate 
      }
    });
    res.json(plan);
  } catch (error) {
    console.error("ERRO AO SALVAR:", error);
    res.status(400).json({ error: 'Erro ao salvar planejamento.' });
  }
});

// Rota de Avaliação do Coordenador Blindada
app.post('/api/plans/evaluate', async (req: any, res: any) => {
  const { teacherId, classCode, periodId, status, feedback } = req.body;
  try {
    const nomesTurmas: any = {
      '6A': '6º Ano A', '6B': '6º Ano B', '7A': '7º Ano A', '7B': '7º Ano B',
      '8A': '8º Ano A', '8B': '8º Ano B', '9A': '9º Ano A', '9B': '9º Ano B',
      '1S': '1ª Série', '2S': '2ª Série', '3S': '3ª Série'
    };
    const nomeTurmaReal = nomesTurmas[classCode] || '6º Ano A';

    let turmaObj = await prisma.class.findFirst({ where: { name: nomeTurmaReal } });
    let defaultSubject = await prisma.subject.findFirst();

    if (!turmaObj || !defaultSubject) return res.status(404).json({ error: 'Dados base não encontrados.' });

    const queryKey = {
      teacherId: Number(teacherId), 
      classId: turmaObj.id, 
      subjectId: defaultSubject.id, 
      periodId: Number(periodId)
    };

    const existingPlan = await prisma.lessonPlan.findUnique({
      where: { teacherId_classId_subjectId_periodId: queryKey }
    });

    if (!existingPlan) return res.status(404).json({ error: 'Planejamento não encontrado no banco.' });

    let parsedContent: any = {};
    try { parsedContent = JSON.parse(existingPlan.content); } catch (e) {}
    
    parsedContent.coordinatorFeedback = feedback;

    const updatedPlan = await prisma.lessonPlan.update({
      where: { teacherId_classId_subjectId_periodId: queryKey },
      data: { status: status, content: JSON.stringify(parsedContent) }
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error("ERRO NO EVALUATE:", error);
    res.status(500).json({ error: 'Erro ao avaliar o planejamento.' });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.lessonPlan.findMany({
      include: { teacher: true, class: true, subject: true, period: true }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar planejamentos.' });
  }
});

app.listen(3333, () => console.log('API rodando na porta 3333'));