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
    
    if (!user && email && email.includes('@colegiovalparaiso.com')) {
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

// Rota para salvar planejamento
app.post('/api/plans', async (req: any, res: any) => {
  const { teacherId, teacherEmail, classId, subjectId, periodId, content, status } = req.body;
  try {
    const sentDate = status === 'SUBMITTED' ? new Date() : null;

    let validTeacherId = Number(teacherId);
    if (teacherEmail) {
      let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
      if (teacher) validTeacherId = teacher.id;
    }

    let defaultClass = await prisma.class.findFirst();
    if (!defaultClass) {
      defaultClass = await prisma.class.create({ data: { name: '6º Ano A' } });
    }

    let defaultSubject = await prisma.subject.findFirst();
    if (!defaultSubject) {
      defaultSubject = await prisma.subject.create({ data: { name: 'Matemática' } });
    }

    // Tratamento blindado para o Period
    let validPeriodId = Number(periodId);
    if (!validPeriodId || isNaN(validPeriodId)) {
      validPeriodId = 1;
    }

    // Garante obrigatoriamente que o período existe usando upsert direto
    await prisma.period.upsert({
      where: { id: validPeriodId },
      update: {},
      create: { 
        id: validPeriodId, 
        name: `Quinzena ${validPeriodId}` 
      }
    });

    const plan = await prisma.lessonPlan.upsert({
      where: {
        teacherId_classId_subjectId_periodId: {
          teacherId: validTeacherId,
          classId: defaultClass.id,
          subjectId: defaultSubject.id,
          periodId: validPeriodId
        }
      },
      update: { content, status, sentAt: sentDate },
      create: { 
        teacherId: validTeacherId, 
        classId: defaultClass.id, 
        subjectId: defaultSubject.id, 
        periodId: validPeriodId, 
        content, 
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