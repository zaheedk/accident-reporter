import type { QuizDiagramId } from '@/components/QuizDiagram';
import { knowledgeQuestions } from './nz-quiz-questions';

export const QUIZ_TOPICS = {
  fault: 'Fault scenarios',
  driving: 'NZ driving rules',
  accident: 'After an accident',
  privacy: 'Privacy rights',
  insurance: 'Insurance basics',
} as const;
export type QuizTopic = keyof typeof QUIZ_TOPICS;

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizScenario = {
  id: string;
  diagramId?: QuizDiagramId;
  category?: QuizTopic;
  sourceUrl?: string;
  scenario: string;
  imageAlt: string;
  options: QuizOption[];
  answerId: string;
  explanation: string;
  rule: string;
};

/** How many scenarios are served each day. */
export const QUESTIONS_PER_DAY = 3;

/** Daily "Who's at fault?" scenarios based on NZ road rules and common insurer fault rulings. */
const faultScenarios: QuizScenario[] = [
  {
    id: 'rear-end',
    scenario:
      'You stop at a red light in Auckland. The car behind fails to stop in time and hits your rear bumper.',
    imageAlt: 'Illustration of a car rear-ending another car stopped at a red light',
    options: [
      { id: 'a', label: 'You are at fault' },
      { id: 'b', label: 'The driver behind is at fault' },
      { id: 'c', label: 'Both share fault 50/50' },
    ],
    answerId: 'b',
    explanation:
      'Following drivers must leave enough distance to stop safely. On these facts the following driver is likely responsible, but final liability depends on the evidence.',
    rule: 'NZ Road Code — following distance',
  },
  {
    id: 'uncontrolled-right',
    scenario:
      'You are turning right at an uncontrolled intersection. An oncoming car is going straight through. You collide.',
    imageAlt: 'Illustration of a car turning right across an oncoming vehicle at an intersection',
    options: [
      { id: 'a', label: 'You are at fault' },
      { id: 'b', label: 'The oncoming driver is at fault' },
      { id: 'c', label: 'No one is at fault' },
    ],
    answerId: 'a',
    explanation:
      'A driver turning right must give way to all oncoming traffic going straight ahead or turning left.',
    rule: 'Give way rules — turning right',
  },
  {
    id: 'car-park-reverse',
    scenario:
      'Two drivers reverse out of opposite supermarket car park bays at the same time and collide in the middle.',
    imageAlt: 'Illustration of two cars reversing out of opposite car park bays',
    options: [
      { id: 'a', label: 'The first to start reversing is at fault' },
      { id: 'b', label: 'Both drivers share fault' },
      { id: 'c', label: 'The car park owner is liable' },
    ],
    answerId: 'b',
    explanation:
      'Both drivers must check it is safe to reverse. Both may contribute to this collision; evidence determines the split, not an automatic 50/50 rule.',
    rule: 'Reversing must be done safely at all times',
  },
  {
    id: 'roundabout',
    scenario:
      'You enter a roundabout and are hit by a vehicle already circulating on your right.',
    imageAlt: 'Illustration of two cars on a roundabout',
    options: [
      { id: 'a', label: 'You are at fault' },
      { id: 'b', label: 'The circulating driver is at fault' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'a',
    explanation:
      'At a roundabout you must give way to all traffic coming from your right, including vehicles already on the roundabout.',
    rule: 'Give way to the right at roundabouts',
  },
  {
    id: 'door-opening',
    scenario:
      'A parked driver opens their door into your lane in Wellington and you clip it while driving past at the speed limit.',
    imageAlt: 'Illustration of a parked car opening its door into a passing vehicle',
    options: [
      { id: 'a', label: 'You are at fault' },
      { id: 'b', label: 'The parked driver is at fault' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'b',
    explanation:
      'A person must not open a vehicle door unless it is safe to do so and must not leave it open longer than necessary.',
    rule: 'Opening doors — Road User Rule clause 6.13',
  },
  {
    id: 'lane-change',
    scenario:
      'You are travelling straight in your lane on the motorway. A car merges into your lane from the on-ramp and side-swipes you.',
    imageAlt: 'Illustration of a car merging onto a motorway beside another vehicle',
    options: [
      { id: 'a', label: 'The merging driver is at fault' },
      { id: 'b', label: 'You are at fault for not making room' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'a',
    explanation:
      'A driver changing into an occupied lane must make sure the move is safe. On these facts the merging driver is likely responsible. At a lane ending, use merge-like-a-zip and cooperate rather than asserting priority.',
    rule: 'Safe lane changes and motorway merging',
  },
  {
    id: 'stolen-signal',
    scenario:
      'You are turning left at a green light. A pedestrian is crossing with the green pedestrian signal and you hit them.',
    imageAlt: 'Illustration of a car turning across a pedestrian crossing',
    options: [
      { id: 'a', label: 'The pedestrian is at fault' },
      { id: 'b', label: 'You are at fault' },
      { id: 'c', label: 'No fault — signal error' },
    ],
    answerId: 'b',
    explanation:
      'Turning drivers must give way to pedestrians lawfully crossing the road they are turning into, even on a green light.',
    rule: 'Give way to pedestrians when turning',
  },
  {
    id: 'hit-and-run',
    scenario:
      'You return to your parked car and find fresh damage with no note left. What is the correct first step?',
    imageAlt: 'Illustration of parked cars in a car park',
    options: [
      { id: 'a', label: 'Claim on your insurance immediately' },
      { id: 'b', label: 'Photograph the damage, check for CCTV/witnesses, then report' },
      { id: 'c', label: 'Repair it yourself and say nothing' },
    ],
    answerId: 'b',
    explanation:
      'If it is safe, photograph the damage, look for witnesses or CCTV and report the incident to Police and your insurer. An unidentified driver does not automatically make you legally at fault. Any excess depends on your policy.',
    rule: 'Evidence gathering after an unattended-vehicle hit',
  },
  {
    id: 'wet-road',
    scenario:
      'On a wet Christchurch road you aquaplane at the posted 80 km/h limit and hit a barrier.',
    imageAlt: 'Illustration of a car aquaplaning on a wet road',
    options: [
      { id: 'a', label: 'No fault — weather event' },
      { id: 'b', label: 'You are at fault for driving too fast for conditions' },
      { id: 'c', label: 'The road authority is at fault' },
    ],
    answerId: 'b',
    explanation:
      'The limit is a maximum, not a target. You must slow down for rain and surface conditions. Responsibility for a crash still depends on its circumstances and evidence.',
    rule: 'Drive to the conditions',
  },
  {
    id: 'give-way-sign',
    scenario:
      'You pull out from a driveway onto a main road and are struck by a car travelling along it.',
    imageAlt: 'Illustration of a car entering a main road',
    options: [
      { id: 'a', label: 'The through driver is at fault' },
      { id: 'b', label: 'You are at fault' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'b',
    explanation:
      'A driver entering a road from a driveway must give way to all traffic already on the road, including cyclists and pedestrians on the footpath.',
    rule: 'Entering a road from a driveway',
  },
  {
    id: 'towed-trailer',
    scenario:
      'Your trailer detaches on State Highway 1 and damages another vehicle.',
    imageAlt: 'Illustration of a car towing a trailer that is detaching',
    options: [
      { id: 'a', label: 'You are at fault as the towing driver' },
      { id: 'b', label: 'No fault — mechanical failure' },
      { id: 'c', label: 'The trailer manufacturer is liable' },
    ],
    answerId: 'a',
    explanation:
      'The towing driver is responsible for the trailer being correctly coupled, chained and maintained before every trip.',
    rule: 'Towing responsibilities',
  },
  {
    id: 'emergency-stop',
    scenario:
      'A car in front brakes hard to avoid a dog. You hit them, and the car behind hits you.',
    imageAlt: 'Illustration of a chain collision between cars',
    options: [
      { id: 'a', label: 'You are at fault for the front hit, the rear driver for yours' },
      { id: 'b', label: 'The dog owner is liable for everything' },
      { id: 'c', label: 'Everyone shares fault equally' },
    ],
    answerId: 'a',
    explanation:
      'If you first hit the front car and are then hit from behind, each impact is assessed separately. If you were pushed forward before hitting the front car, responsibility may differ. Evidence and impact order matter.',
    rule: 'Chain collisions are assessed per impact',
  },
  {
    id: 'reversing-driveway',
    scenario:
      'You reverse out of your driveway and hit a car parked legally on the street.',
    imageAlt: 'Illustration of a car reversing towards a parked vehicle',
    options: [
      { id: 'a', label: 'The parked driver is at fault' },
      { id: 'b', label: 'You are at fault' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'b',
    explanation:
      'A stationary, legally parked vehicle can rarely be at fault. The moving vehicle must reverse only when the path is clear.',
    rule: 'Reversing safely',
  },
  {
    id: 'insurance-excess',
    scenario:
      'A driver hits you and admits fault at the scene. Do you still pay your excess?',
    imageAlt: 'Illustration of an insurance claim form with a car and shield',
    options: [
      { id: 'a', label: 'Always, no exceptions' },
      { id: 'b', label: 'It depends on your policy and its waiver or refund conditions' },
      { id: 'c', label: 'Only if you have comprehensive cover' },
    ],
    answerId: 'b',
    explanation:
      'An admission at the scene does not automatically waive your excess. Your policy may require the other driver to be identified and responsibility or recovery to be established. Ask your insurer about waiver or refund conditions.',
    rule: 'Policy-dependent excess waiver or refund',
  },
];

export const quizScenarios: QuizScenario[] = [
  ...faultScenarios.map((question) => ({
    ...question,
    diagramId: question.id as QuizDiagramId,
    category: 'fault' as const,
    sourceUrl: question.id === 'insurance-excess'
      ? 'https://www.consumerprotection.govt.nz/help-product-service/insurance'
      : 'https://www.nzta.govt.nz/roadcode/general-road-code/',
  })),
  ...knowledgeQuestions,
];

/** A shuffled practice set; no daily scores or streaks are changed. */
export function practiceQuestions(topic: QuizTopic | 'all', count = 10): QuizScenario[] {
  const pool = quizScenarios.filter((question) => topic === 'all' || question.category === topic);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function dayNumberFor(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
}

/** Deterministic single scenario of the day (kept for links/previews). */
export function scenarioForDate(date = new Date()): QuizScenario {
  return scenariosForDate(date)[0];
}

/** Deterministic set of QUESTIONS_PER_DAY scenarios for the given local date. */
export function scenariosForDate(date = new Date()): QuizScenario[] {
  const day = Math.abs(dayNumberFor(date));
  const total = quizScenarios.length;
  const start = (day * QUESTIONS_PER_DAY) % total;
  return Array.from({ length: QUESTIONS_PER_DAY }, (_, i) => quizScenarios[(start + i) % total]);
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type QuizProgress = {
  /** Day key of the set currently in progress/completed. */
  day: string | null;
  /** Answers given for today's scenarios: scenarioId -> chosen option id. */
  dayAnswers: Record<string, string>;
  /** Last day the full set was completed. */
  lastCompleted: string | null;
  streak: number;
  best: number;
  correct: number;
  played: number;
};

const STORAGE_KEY = 'savo.faultQuiz.v2';

const EMPTY: QuizProgress = {
  day: null,
  dayAnswers: {},
  lastCompleted: null,
  streak: 0,
  best: 0,
  correct: 0,
  played: 0,
};

export function loadProgress(): QuizProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...EMPTY, ...JSON.parse(raw) } as QuizProgress;
      if (parsed.day !== todayKey()) return { ...parsed, day: todayKey(), dayAnswers: {} };
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY, day: todayKey() };
}

export function saveProgress(progress: QuizProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function recordAnswer(
  progress: QuizProgress,
  scenarioId: string,
  choiceId: string,
  wasCorrect: boolean,
): QuizProgress {
  const today = todayKey();
  const base: QuizProgress =
    progress.day === today ? progress : { ...progress, day: today, dayAnswers: {} };
  if (base.dayAnswers[scenarioId]) return base;

  const dayAnswers = { ...base.dayAnswers, [scenarioId]: choiceId };
  const completed = Object.keys(dayAnswers).length >= QUESTIONS_PER_DAY;

  let { streak, best, lastCompleted } = base;
  if (completed && lastCompleted !== today) {
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    streak = lastCompleted === yesterday ? streak + 1 : 1;
    best = Math.max(best, streak);
    lastCompleted = today;
  }

  const next: QuizProgress = {
    ...base,
    dayAnswers,
    streak,
    best,
    lastCompleted,
    correct: base.correct + (wasCorrect ? 1 : 0),
    played: base.played + 1,
  };
  saveProgress(next);
  return next;
}
