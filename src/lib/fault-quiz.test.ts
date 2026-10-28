import { describe, it, expect, beforeEach } from 'vitest';
import { QUIZ_TOPICS, QUESTIONS_PER_DAY, quizScenarios, scenariosForDate, practiceQuestions, loadProgress, recordAnswer } from './fault-quiz';

describe('NZ question bank', () => {
  it('contains at least 150 original questions', () => {
    expect(quizScenarios.length).toBeGreaterThanOrEqual(150);
    expect(new Set(quizScenarios.map(q => q.id)).size).toBe(quizScenarios.length);
    expect(new Set(quizScenarios.map(q => q.scenario.trim().toLowerCase())).size).toBe(quizScenarios.length);
  });
  it.each(Object.keys(QUIZ_TOPICS))('includes the requested topic %s', topic => {
    expect(quizScenarios.filter(q => q.category === topic).length).toBeGreaterThan(0);
  });
  it('has one valid answer and an official source for every question', () => {
    for (const q of quizScenarios) {
      expect(q.options.filter(o => o.id === q.answerId)).toHaveLength(1);
      expect(new Set(q.options.map(o => o.label)).size).toBe(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(30);
      expect(q.sourceUrl).toMatch(/^https:\/\/(www\.)?(nzta\.govt\.nz|privacy\.org\.nz|police\.govt\.nz|consumerprotection\.govt\.nz|ifso\.nz|icnz\.org\.nz|legislation\.govt\.nz|nzta\.govt\.nz|nzta\.govt\.nz)/);
    }
  });
  it('keeps diagrams only on their matching fault scenarios', () => {
    for (const q of quizScenarios.filter(q => q.diagramId)) expect(q.diagramId).toBe(q.id);
    for (const q of quizScenarios.filter(q => q.category !== 'fault')) expect(q.diagramId).toBeUndefined();
  });
});

describe('daily and practice selection', () => {
  beforeEach(() => localStorage.clear());
  it('serves three distinct deterministic daily questions', () => {
    const date = new Date(2026, 9, 28);
    expect(scenariosForDate(date)).toEqual(scenariosForDate(date));
    expect(scenariosForDate(date)).toHaveLength(QUESTIONS_PER_DAY);
    expect(new Set(scenariosForDate(date).map(q => q.id)).size).toBe(3);
    expect(scenariosForDate(new Date(2026, 9, 29))).not.toEqual(scenariosForDate(date));
  });
  it.each(Object.keys(QUIZ_TOPICS))('limits practice to %s without changing daily progress', topic => {
    const before = loadProgress();
    const questions = practiceQuestions(topic as keyof typeof QUIZ_TOPICS);
    expect(questions).toHaveLength(10);
    expect(questions.every(q => q.category === topic)).toBe(true);
    expect(new Set(questions.map(q => q.id)).size).toBe(10);
    expect(loadProgress()).toEqual(before);
  });
  it('counts each daily answer once and completes a streak after three answers', () => {
    let progress = loadProgress();
    for (const q of scenariosForDate()) progress = recordAnswer(progress, q.id, q.answerId, true);
    expect(progress.played).toBe(3);
    expect(progress.correct).toBe(3);
    expect(progress.streak).toBe(1);
    const q = scenariosForDate()[0];
    expect(recordAnswer(progress, q.id, q.answerId, true)).toEqual(progress);
  });
});