import type { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { currentUser, me } from '../../../auth';
import { db, catalogItems } from '../../database';
import { ApiError, integer, rateLimit, textField } from '../../http';
import { now, ensureCertificates, user, item, progress, examPassed, publicCourse, activeQuizQuestions } from './shared';

export function registerLearningRoutes(router: Router) {
  for (const [route, kind] of [['scenarios', 'scenario'], ['courses', 'course']]) {
    router.get(`/${route}`, (req, res) => {
      const q = req.query.q === undefined ? '' : textField(req.query.q, 'q', 200, 0).toLocaleLowerCase('vi');
      const category = req.query.category === undefined ? '' : textField(req.query.category, 'category', 100, 0);
      const page = integer(req.query.page, 1, 100000); const pageSize = integer(req.query.pageSize, 20, 100);
      const matches = catalogItems(kind).filter(value => (kind !== 'course' || (value.status || 'published') === 'published') && (!category || value.category === category) && JSON.stringify(value).toLocaleLowerCase('vi').includes(q));
      const items = matches.slice((page - 1) * pageSize, page * pageSize).map(value => kind === 'course' ? publicCourse(value) : value);
      res.json({ items, total: matches.length, page, pageSize });
    });
    router.get(`/${route}/:id`, (req, res) => { const value = item(kind, req.params.id); if (kind === 'course' && (value.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.'); res.json(kind === 'course' ? publicCourse(value) : value); });
  }
  router.get('/courses/:id/lessons/:lessonId', (req, res) => {
    const course = item('course', req.params.id); const lesson = course.modules.find((l: any) => l.id === req.params.lessonId);
    if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
    if (!lesson) throw new ApiError(404, 'Không tìm thấy bài học trong khóa học.');
    let quiz;
    if (lesson.quizId || (Array.isArray(lesson.questionIds) && lesson.questionIds.length)) {
      const exam = course.modules.find((module: any) => module.type === 'quiz');
      const data = item('quiz', lesson.quizId || exam?.quizId || `${course.id}-quiz`);
      quiz = { id: lesson.type === 'quiz' ? data.id : `${data.id}::${lesson.id}`, questions: activeQuizQuestions(data, course, lesson).map(({ correctIndex, explanation, optionExplanations, ...question }: any) => question) };
    }
    const account = currentUser(req);
    res.json({ ...lesson, quiz, ...(lesson.type === 'quiz' ? { passed: !!account && examPassed(account.id, lesson) } : {}) });
  });
  router.post('/courses/:id/lessons/:lessonId/questions/:questionId/answer', rateLimit(120, 60_000), (req, res) => {
    const course = item('course', req.params.id);
    if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
    const lesson = course.modules.find((module: any) => module.id === req.params.lessonId && module.type !== 'quiz');
    if (!lesson) throw new ApiError(404, 'Không tìm thấy bài học.');
    const quiz = item('quiz', course.modules.find((module: any) => module.type === 'quiz')?.quizId || `${course.id}-quiz`);
    const question = activeQuizQuestions(quiz, course, lesson).find((entry: any) => entry.id === req.params.questionId);
    if (!question) throw new ApiError(404, 'Câu hỏi không thuộc bài học này.');
    const selectedIndex = req.body?.selectedIndex;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) throw new ApiError(400, 'Đáp án không hợp lệ.');
    const account = currentUser(req);
    let answeredAll = false;
    if (account) {
      db.prepare('INSERT INTO lesson_answers VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,course_id,lesson_id,question_id) DO UPDATE SET selected_index=excluded.selected_index,answered_at=excluded.answered_at').run(account.id, course.id, lesson.id, question.id, selectedIndex, now());
      const assigned = activeQuizQuestions(quiz, course, lesson);
      answeredAll = assigned.every((entry: any) => db.prepare('SELECT 1 FROM lesson_answers WHERE user_id = ? AND course_id = ? AND lesson_id = ? AND question_id = ?').get(account.id, course.id, lesson.id, entry.id));
    }
    res.json({ questionId: question.id, selectedIndex, correctIndex: question.correctIndex, correct: selectedIndex === question.correctIndex, explanation: question.explanation, optionExplanations: question.optionExplanations, answeredAll });
  });
  router.post('/quizzes/:id/submissions', rateLimit(30, 60_000), (req, res) => {
    const account = user(req); const [quizId, moduleId] = req.params.id.split('::'); const quiz = item('quiz', quizId); const answers = req.body?.answers;
    const quizCourse = item('course', quiz.courseId);
    if ((quizCourse.status || 'published') !== 'published') throw new ApiError(404, 'Bài kiểm tra chưa được phát hành.');
    const module = moduleId ? quizCourse.modules.find((entry: any) => entry.id === moduleId && entry.type !== 'quiz') : quizCourse.modules.find((entry: any) => entry.quizId === quizId && entry.type === 'quiz');
    if (!module) throw new ApiError(404, 'Không tìm thấy phần kiểm tra.');
    const questions = activeQuizQuestions(quiz, quizCourse, module);
    if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length || answers.some((answer, i) => !Number.isInteger(answer) || answer < -1 || answer >= questions[i].options.length)) throw new ApiError(400, 'answers phải chứa chỉ số phương án hợp lệ hoặc -1 cho câu bỏ trống, theo thứ tự câu hỏi.');
    const explanations = questions.map((q: any, i: number) => ({ questionId: q.id, correct: answers[i] === q.correctIndex, selectedIndex: answers[i], correctIndex: q.correctIndex, explanation: q.explanation, optionExplanations: q.optionExplanations }));
    const correctCount = explanations.filter((e: any) => e.correct).length; const score = Math.round(correctCount * 100 / questions.length);
    const submissionQuizId = moduleId ? req.params.id : quiz.id;
    const result = { id: randomUUID(), quizId: submissionQuizId, score, correctCount, total: questions.length, passed: score >= 80, explanations, submittedAt: now() };
    db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?)').run(result.id, account.id, submissionQuizId, quiz.courseId, score, JSON.stringify(result), result.submittedAt);
    res.status(201).json(result);
  });
  router.get('/me/learning-progress', (req, res) => res.json(progress(user(req).id)));
  router.put('/me/learning-progress/:courseId', (req, res) => {
    const account = user(req); const course = item('course', req.params.courseId);
    if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
    if (req.body?.completion !== true) throw new ApiError(400, 'completion phải là true.');
    const lesson = course.modules.find((l: any) => l.id === req.body?.lessonId);
    if (!lesson) throw new ApiError(400, 'lessonId không thuộc khóa học.');
    if (lesson.type === 'quiz') {
      if (!course.modules.filter((module: any) => module.type === 'quiz').every((module: any) => examPassed(account.id, module))) throw new ApiError(409, 'Cần đạt tối thiểu 80% ở tất cả bài kiểm tra trước khi hoàn thành khóa.');
      if (course.modules.some((module: any) => module.type !== 'quiz' && !db.prepare('SELECT 1 FROM lesson_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?').get(account.id, course.id, module.id))) throw new ApiError(409, 'Hãy đánh dấu đã đọc tất cả bài học trước khi hoàn thành khóa.');
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT OR IGNORE INTO lesson_progress VALUES (?,?,?,?)').run(account.id, course.id, lesson.id, now());
        ensureCertificates(account.id);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      res.json(progress(account.id));
      return;
    }
    db.prepare('INSERT OR IGNORE INTO lesson_progress VALUES (?,?,?,?)').run(account.id, course.id, lesson.id, now());
    ensureCertificates(account.id);
    res.json(progress(account.id));
  });
}
