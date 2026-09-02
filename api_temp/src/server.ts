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
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// Rota para listar todos os professores cadastrados
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' }
    });
    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar professores.' });
  }
});

// Rota para salvar planejamento isolado por Turma e Quinzena
app.post('/api/plans', async (req: any, res: any) => {
  const { teacherId, teacherEmail, classCode, subjectId, periodId, content, skills, status } = req.body;
  try {
    const sentDate = status === 'SUBMITTED' ? new Date() : null;

    let validTeacherId = Number(teacherId);
    if (teacherEmail) {
      let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
      if (teacher) validTeacherId = teacher.id;
    }

    // Mapeia o código da turma (ex: '6A') para o banco de dados
    const nomesTurmas: any = {
      '6A': '6º Ano A', '6B': '6º Ano B',
      '7A': '7º Ano A', '7B': '7º Ano B',
      '8A': '8º Ano A', '8B': '8º Ano B',
      '9A': '9º Ano A', '9B': '9º Ano B',
      '1S': '1ª Série', '2S': '2ª Série', '3S': '3ª Série'
    };

    const nomeTurmaReal = nomesTurmas[classCode] || '6º Ano A';

    let turmaObj = await prisma.class.findFirst({ where: { name: nomeTurmaReal } });
    if (!turmaObj) {
      turmaObj = await prisma.class.create({ data: { name: nomeTurmaReal } });
    }

    let defaultSubject = await prisma.subject.findFirst();
    if (!defaultSubject) {
      defaultSubject = await prisma.subject.create({ data: { name: 'Matemática' } });
    }

    let validPeriodId = Number(periodId);
    if (!validPeriodId || isNaN(validPeriodId)) {
      validPeriodId = 1;
    }

    await prisma.period.upsert({
      where: { id: validPeriodId },
      update: {},
      create: { 
        id: validPeriodId, 
        name: `Quinzena ${validPeriodId}` 
      }
    });

    // O upsert garante que a chave única (professor + turma + disciplina + quinzena) atualize exatamente o registro correspondente
    const plan = await prisma.lessonPlan.upsert({
      where: {
        teacherId_classId_subjectId_periodId: {
          teacherId: validTeacherId,
          classId: turmaObj.id,
          subjectId: defaultSubject.id,
          periodId: validPeriodId
        }
      },
      update: { content, skills, status, sentAt: sentDate },
      create: { 
        teacherId: validTeacherId, 
        classId: turmaObj.id, 
        subjectId: defaultSubject.id, 
        periodId: validPeriodId, 
        content, 
        skills,
        status, 
        sentAt: sentDate 
      }
    });

    res.json(plan);
  } catch (error) {
    console.error("ERRO NO PRISMA:", error);
    res.status(400).json({ error: 'Erro ao salvar planejamento.' });
  }
});

// Rota para listar todos os planejamentos
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.lessonPlan.findMany({
      include: { teacher: true, class: true, subject: true, period: true }
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar planejamentos.' });
  }
});

app.listen(3333, () => console.log('API rodando na porta 3333'));