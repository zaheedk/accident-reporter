export type QuizOption = {
  id: string;
  label: string;
};

export type QuizScenario = {
  id: string;
  scenario: string;
  options: QuizOption[];
  answerId: string;
  explanation: string;
  rule: string;
};

/** Daily "Who's at fault?" scenarios based on NZ road rules and common insurer fault rulings. */
export const quizScenarios: QuizScenario[] = [
  {
    id: 'rear-end',
    scenario:
      'You stop at a red light in Auckland. The car behind fails to stop in time and hits your rear bumper.',
    options: [
      { id: 'a', label: 'You are at fault' },
      { id: 'b', label: 'The driver behind is at fault' },
      { id: 'c', label: 'Both share fault 50/50' },
    ],
    answerId: 'b',
    explanation:
      'Drivers must keep enough following distance to stop safely. A rear-end collision is almost always the following driver\'s fault, even if you braked suddenly.',
    rule: 'Following distance — Road User Rule 2004, clause 2.7',
  },
  {
    id: 'uncontrolled-right',
    scenario:
      'You are turning right at an uncontrolled intersection. An oncoming car is going straight through. You collide.',
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
    options: [
      { id: 'a', label: 'The first to start reversing is at fault' },
      { id: 'b', label: 'Both drivers share fault' },
      { id: 'c', label: 'The car park owner is liable' },
    ],
    answerId: 'b',
    explanation:
      'Both drivers had a duty to reverse only when safe. Insurers usually apportion fault 50/50 unless dashcam footage shows one car was already established in the lane.',
    rule: 'Reversing must be done safely at all times',
  },
  {
    id: 'roundabout',
    scenario:
      'You enter a roundabout and are hit by a vehicle already circulating on your right.',
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
    options: [
      { id: 'a', label: 'The merging driver is at fault' },
      { id: 'b', label: 'You are at fault for not making room' },
      { id: 'c', label: 'Shared fault' },
    ],
    answerId: 'a',
    explanation:
      'The merging vehicle must give way to traffic already established in the lane. Merge-like-a-zip applies to slow-moving traffic, but the through vehicle keeps right of way.',
    rule: 'Merging traffic gives way',
  },
  {
    id: 'stolen-signal',
    scenario:
      'You are turning left at a green light. A pedestrian is crossing with the green pedestrian signal and you hit them.',
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
    options: [
      { id: 'a', label: 'Claim on your insurance immediately' },
      { id: 'b', label: 'Photograph the damage, check for CCTV/witnesses, then report' },
      { id: 'c', label: 'Repair it yourself and say nothing' },
    ],
    answerId: 'b',
    explanation:
      'Evidence first. Photos, nearby cameras and witness details can identify the other party — without them your claim is treated as at-fault and your excess applies.',
    rule: 'Evidence gathering after an unattended-vehicle hit',
  },
  {
    id: 'wet-road',
    scenario:
      'On a wet Christchurch road you aquaplane at the posted 80 km/h limit and hit a barrier.',
    options: [
      { id: 'a', label: 'No fault — weather event' },
      { id: 'b', label: 'You are at fault for driving too fast for conditions' },
      { id: 'c', label: 'The road authority is at fault' },
    ],
    answerId: 'b',
    explanation:
      'The speed limit is a maximum, not a target. Drivers must adjust speed for conditions, so loss-of-control crashes in rain are treated as driver fault.',
    rule: 'Drive to the conditions',
  },
  {
    id: 'give-way-sign',
    scenario:
      'You pull out from a driveway onto a main road and are struck by a car travelling along it.',
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
    options: [
      { id: 'a', label: 'You are at fault for the front hit, the rear driver for yours' },
      { id: 'b', label: 'The dog owner is liable for everything' },
      { id: 'c', label: 'Everyone shares fault equally' },
    ],
    answerId: 'a',
    explanation:
      'Fault in a chain collision is assessed per impact. Each following driver is responsible for the vehicle in front of them.',
    rule: 'Chain collisions are assessed per impact',
  },
  {
    id: 'reversing-driveway',
    scenario:
      'You reverse out of your driveway and hit a car parked legally on the street.',
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
    options: [
      { id: 'a', label: 'Always, no exceptions' },
      { id: 'b', label: 'Usually not, if the other party is identified and liability is accepted' },
      { id: 'c', label: 'Only if you have comprehensive cover' },
    ],
    answerId: 'b',
    explanation:
      'When the at-fault party is identified and their insurer accepts liability, most NZ insurers waive or refund your excess. Recording their details at the scene is what makes this possible.',
    rule: 'Excess waiver on not-at-fault claims',
  },
];

/** Deterministic scenario of the day (NZ local date). */
export function scenarioForDate(date = new Date()): QuizScenario {
  const dayNumber = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000,
  );
  return quizScenarios[Math.abs(dayNumber) % quizScenarios.length];
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type QuizProgress = {
  lastPlayed: string | null;
  streak: number;
  best: number;
  correct: number;
  played: number;
  lastChoice?: string | null;
};

const STORAGE_KEY = 'savo.faultQuiz.v1';

export function loadProgress(): QuizProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { lastPlayed: null, streak: 0, best: 0, correct: 0, played: 0, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { lastPlayed: null, streak: 0, best: 0, correct: 0, played: 0, lastChoice: null };
}

export function saveProgress(progress: QuizProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function recordAnswer(progress: QuizProgress, wasCorrect: boolean, choiceId: string): QuizProgress {
  const today = todayKey();
  if (progress.lastPlayed === today) return progress;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  const streak = progress.lastPlayed === yesterday ? progress.streak + 1 : 1;
  const next: QuizProgress = {
    lastPlayed: today,
    streak,
    best: Math.max(progress.best, streak),
    correct: progress.correct + (wasCorrect ? 1 : 0),
    played: progress.played + 1,
    lastChoice: choiceId,
  };
  saveProgress(next);
  return next;
}
