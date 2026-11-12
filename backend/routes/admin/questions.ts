import type { Router, Request } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../../database';
import { ApiError } from '../../http';
import { stamp, n, audit, pick, json, course, quiz, allQuestions, questionLocation, questionView, questionBody, saveQuestion, csv } from './shared';

export function registerAdminQuestionRoutes(router: Router) {
  router.get('/questions/summary', (_req, res) => {
    const questions = allQuestions();
    const scored = questions.map(questionView).filter(q => q.attempts > 0);
    const totalAttempts = scored.reduce((sum, q) => sum + q.attempts, 0);
    res.json({ total: questions.filter(q => q.status !== 'archived').length, active: questions.filter(q => q.status === 'active').length, review: questions.filter(q => q.status === 'review').length, urgent: questions.filter(q => q.difficulty === 'Tình huống khẩn cấp').length, averageAccuracy: totalAttempts ? Math.round(scored.reduce((sum,q) => sum + Number(q.accuracyRate) * q.attempts, 0) / totalAttempts) : null, attempts: totalAttempts });
  });
  router.get('/questions', (req, res) => {
    const q = String(req.query.q || '').toLowerCase();
    const courseId = String(req.query.courseId || '');
    const difficulty = String(req.query.difficulty || '');
    const status = String(req.query.status || '');
    const rows = allQuestions().filter(item => (!q || [item.id,item.question].some((value: string) => value.toLowerCase().includes(q))) && (!courseId || item.courseId === courseId) && (!difficulty || item.difficulty === difficulty) && (!status || item.status === status)).map(questionView);
    res.json(pick(rows, req));
  });
  router.get('/questions/:id', (req, res) => {
    const found = questionLocation(req.params.id);
    res.json(questionView({ ...found.question, courseId: found.quiz.courseId, quizId: found.quiz.id }));
  });
  router.post('/questions', (req, res) => {
    const body = questionBody(req);
    const id = randomUUID();
    const q = { id, question: body.question, options: body.options, correctIndex: body.correctIndex, explanation: body.explanation, optionExplanations: body.optionExplanations, difficulty: body.difficulty, status: 'review', updatedAt: stamp() };
    saveQuestion(body.courseId, q); audit(req, 'question.create', 'question', id, body.courseId);
    res.status(201).json(questionView({ ...q, courseId: body.courseId }));
  });
  router.patch('/questions/:id', (req, res) => {
    const found = questionLocation(req.params.id);
    const body = questionBody(req, { ...found.question, courseId: found.quiz.courseId, status: found.question.status || 'active' });
    const q = { ...found.question, question: body.question, options: body.options, correctIndex: body.correctIndex, explanation: body.explanation, optionExplanations: body.optionExplanations, difficulty: body.difficulty, status: body.status, updatedAt: stamp() };
    if (body.courseId === found.quiz.courseId) {
      found.quiz.questions[found.index] = q; json('quiz', found.quiz.id, found.quiz);
    } else {
      if ((found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((item: any) => item.id !== found.question.id && (!item.status || item.status === 'active')).length === 0) throw new ApiError(409, 'Không thể chuyển câu hỏi đang dùng cuối cùng khỏi khóa học đã phát hành.');
      if (n('SELECT COUNT(*) AS n FROM submissions WHERE course_id = ?', found.quiz.courseId)) throw new ApiError(409, 'Không thể chuyển câu hỏi đã có bài nộp sang khóa khác.');
      found.quiz.questions.splice(found.index, 1); json('quiz', found.quiz.id, found.quiz); saveQuestion(body.courseId, q);
    }
    audit(req, 'question.update', 'question', q.id);
    res.json(questionView({ ...q, courseId: body.courseId }));
  });
  router.post('/questions/:id/duplicate', (req, res) => {
    const found = questionLocation(req.params.id);
    const q = { ...found.question, id: randomUUID(), status: 'review', updatedAt: stamp() };
    saveQuestion(found.quiz.courseId, q); audit(req, 'question.duplicate', 'question', q.id, found.question.id);
    res.status(201).json(questionView({ ...q, courseId: found.quiz.courseId }));
  });
  router.patch('/questions/:id/status', (req, res) => {
    const found = questionLocation(req.params.id);
    const status = req.body?.status;
    if (!['review','active','archived'].includes(status)) throw new ApiError(400, 'Trạng thái câu hỏi không hợp lệ.');
    if (status !== 'active' && (found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((q: any) => q.id !== found.question.id && (!q.status || q.status === 'active')).length === 0) throw new ApiError(409, 'Khóa học đang phát hành cần ít nhất một câu hỏi đang dùng.');
    found.quiz.questions[found.index].status = status;
    json('quiz', found.quiz.id, found.quiz); audit(req, 'question.status', 'question', found.question.id, status);
    res.json(questionView({ ...found.quiz.questions[found.index], courseId: found.quiz.courseId }));
  });
  router.delete('/questions/:id', (req, res) => {
    const found = questionLocation(req.params.id);
    if ((found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((q: any) => q.id !== found.question.id && (!q.status || q.status === 'active')).length === 0) throw new ApiError(409, 'Hãy lưu trữ khóa học hoặc thêm câu hỏi khác trước khi lưu trữ câu cuối cùng.');
    found.quiz.questions[found.index].status = 'archived';
    json('quiz', found.quiz.id, found.quiz); audit(req, 'question.archive', 'question', found.question.id);
    res.json({ success: true });
  });
  router.get('/questions/import/template', (_req, res) => {
    res.type('text/csv; charset=utf-8').attachment('cyberaware-question-template.csv').send('\uFEFFcourseId,question,A,B,C,D,correct,explanation,explanationA,explanationB,explanationC,explanationD,difficulty\r\n');
  });
  function importRows(req: Request) {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new ApiError(400, 'Cần từ 1 đến 100 câu hỏi mỗi lần nhập.');
    return rows.map((row, index) => {
      try { return questionBody(Object.assign(Object.create(req), { body: row }) as Request); }
      catch (error) { if (error instanceof Error) throw new ApiError(400, `Dòng ${index + 2}: ${error.message}`); throw error; }
    });
  }
  router.post('/questions/import/preview', (req, res) => {
    const rows = importRows(req);
    res.json({ valid: true, count: rows.length, items: rows.map(row => ({ courseId: row.courseId, question: row.question, difficulty: row.difficulty })) });
  });
  router.post('/questions/import/commit', (req, res) => {
    const rows = importRows(req);
    const ids: string[] = [];
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of rows) {
        const id = randomUUID(); ids.push(id);
        saveQuestion(row.courseId, { id, question: row.question, options: row.options, correctIndex: row.correctIndex, explanation: row.explanation, optionExplanations: row.optionExplanations, difficulty: row.difficulty, status: 'review', updatedAt: stamp() });
        audit(req, 'question.import', 'question', id, row.courseId);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.status(201).json({ created: ids.length, ids, status: 'review' });
  });
}
