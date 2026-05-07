// Fault determination rule engine for NZ + AU.
// Maps a structured set of answers against the NZ Land Transport (Road User)
// Rule 2004 and Australian Road Rules (ARR) to produce a plain-English
// assessment with the cited rule. This is a guide — not legal advice.

export type Jurisdiction = 'NZ' | 'AU';

export type CollisionType =
  | 'intersection'
  | 'rearend'
  | 'lanechange'
  | 'reversing'
  | 'roundabout'
  | 'parking';

export type Verdict = 'not_at_fault' | 'at_fault' | 'shared' | 'unclear';

export interface FaultAnswers {
  jurisdiction: Jurisdiction;
  collision: CollisionType;
  // Intersection
  control?: 'lights' | 'giveway' | 'stop' | 'none';
  arrival?: 'you_first' | 'they_first' | 'simultaneous';
  thirdPartyAction?: 'turning_right' | 'turning_left' | 'running_red' | 'proceeding' | 'unknown';
  yourAction?: 'proceeding' | 'turning_right' | 'turning_left';
  // Rear-end
  follower?: 'you' | 'them';
  suddenStop?: boolean;
  // Lane change
  whoChanged?: 'you' | 'them';
  // Reversing
  whoReversed?: 'you' | 'them' | 'both';
  // Roundabout
  alreadyInRoundabout?: 'you' | 'them' | 'neither';
  // Common
  evasiveAction?: 'braked' | 'swerved' | 'no_time' | 'unaware';
}

export interface FaultResult {
  verdict: Verdict;
  headline: string;
  explanation: string;
  rule: { citation: string; text: string };
  claimGuidance: string;
}

const NZ_RULES = {
  rightTurn: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 4.2',
    text: 'A driver turning right at an intersection must give way to a vehicle approaching from the opposite direction and proceeding straight through, or turning left.',
  },
  uncontrolled: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 4.1',
    text: 'At an uncontrolled intersection, a driver must give way to traffic that arrived first or is on the right where vehicles arrive together.',
  },
  giveWaySign: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 4.3',
    text: 'A driver facing a Give Way sign must give way to all traffic on the through road.',
  },
  stopSign: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 4.4',
    text: 'A driver facing a Stop sign must come to a complete stop and give way to all traffic on the through road before proceeding.',
  },
  redLight: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 3.1',
    text: 'A driver approaching a red traffic signal must stop before the limit line and not proceed until the signal turns green.',
  },
  rearEnd: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 2.6 (following distance)',
    text: 'A driver must not follow another vehicle more closely than is reasonable and prudent in the circumstances. The following driver is presumed at fault in a rear-end collision.',
  },
  laneChange: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 2.4',
    text: 'A driver changing lanes must give way to any vehicle already in or partly in that lane and signal the change for at least 3 seconds.',
  },
  reversing: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 2.7',
    text: 'A driver must not reverse a vehicle unless it can be done safely. The reversing driver must give way to all other road users.',
  },
  roundabout: {
    citation: 'NZ Land Transport (Road User) Rule 2004 — Rule 4.5',
    text: 'A driver entering a roundabout must give way to all vehicles already on the roundabout, including those approaching from the right.',
  },
};

const AU_RULES = {
  rightTurn: {
    citation: 'Australian Road Rules — Rule 62',
    text: 'A driver turning right at an intersection must give way to oncoming vehicles going straight ahead or turning left.',
  },
  uncontrolled: {
    citation: 'Australian Road Rules — Rule 72 / 73',
    text: 'At an uncontrolled intersection, a driver must give way to any vehicle approaching from the right.',
  },
  giveWaySign: {
    citation: 'Australian Road Rules — Rule 69',
    text: 'A driver at a Give Way sign must give way to vehicles on the through road and to pedestrians on the road being entered.',
  },
  stopSign: {
    citation: 'Australian Road Rules — Rule 67',
    text: 'A driver at a Stop sign must stop completely and give way to all vehicles on the through road before proceeding.',
  },
  redLight: {
    citation: 'Australian Road Rules — Rule 56',
    text: 'A driver approaching or at a red traffic light must stop and remain stopped until the light turns green or yellow.',
  },
  rearEnd: {
    citation: 'Australian Road Rules — Rule 126 (keep safe distance)',
    text: 'A driver must drive a sufficient distance behind the vehicle in front so the driver can stop safely. The following driver is presumed at fault in a rear-end collision.',
  },
  laneChange: {
    citation: 'Australian Road Rules — Rule 148',
    text: 'A driver changing marked lanes must give way to any vehicle already travelling in the destination lane.',
  },
  reversing: {
    citation: 'Australian Road Rules — Rule 296',
    text: 'A driver must not reverse a vehicle unless it can be done safely. The reversing driver must give way to all other road users.',
  },
  roundabout: {
    citation: 'Australian Road Rules — Rule 114',
    text: 'A driver entering a roundabout must give way to any vehicle already in the roundabout.',
  },
};

const RULES = { NZ: NZ_RULES, AU: AU_RULES };

const NOT_AT_FAULT_GUIDANCE =
  'You should not be liable for the repair costs. Present this assessment as supporting evidence with your insurer — your insurer can pursue the at-fault party\'s insurer for recovery.';
const AT_FAULT_GUIDANCE =
  'Based on the road rule cited, liability appears to rest with you. Notify your insurer promptly and provide a full account; this assessment is a guide only.';
const SHARED_GUIDANCE =
  'Both parties may carry some responsibility. Your insurer or the Disputes Tribunal will apportion liability. Provide this assessment along with photos, dashcam footage and witness details.';
const UNCLEAR_GUIDANCE =
  'There isn\'t enough information to make a clear call. Gather photos, dashcam footage and any witness details, and let your insurer assess the evidence.';

export function determineFault(a: FaultAnswers): FaultResult {
  const r = RULES[a.jurisdiction];

  // Rear-end
  if (a.collision === 'rearend') {
    if (a.follower === 'them') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'The other driver was following you and rear-ended your vehicle. The following driver is presumed at fault in rear-end collisions.',
        rule: r.rearEnd,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.follower === 'you') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'As the following driver in a rear-end collision, you are presumed at fault unless there is strong evidence the lead driver acted dangerously (e.g. brake-checking).',
        rule: r.rearEnd,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
  }

  // Lane change
  if (a.collision === 'lanechange') {
    if (a.whoChanged === 'them') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'The other driver changed lanes into your path. The driver changing lanes must give way to vehicles already in the destination lane.',
        rule: r.laneChange,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.whoChanged === 'you') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'You changed lanes and collided with a vehicle already in that lane. The driver changing lanes must give way.',
        rule: r.laneChange,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
  }

  // Reversing
  if (a.collision === 'reversing') {
    if (a.whoReversed === 'them') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'The other driver was reversing. A reversing driver must give way to all other road users.',
        rule: r.reversing,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.whoReversed === 'you') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'You were reversing at the time of collision. A reversing driver must give way to all other road users.',
        rule: r.reversing,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
    if (a.whoReversed === 'both') {
      return {
        verdict: 'shared',
        headline: 'Shared responsibility likely',
        explanation:
          'Both vehicles were reversing. Liability is typically apportioned between both parties.',
        rule: r.reversing,
        claimGuidance: SHARED_GUIDANCE,
      };
    }
  }

  // Roundabout
  if (a.collision === 'roundabout') {
    if (a.alreadyInRoundabout === 'you') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'You were already in the roundabout. Drivers entering a roundabout must give way to vehicles already on it.',
        rule: r.roundabout,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.alreadyInRoundabout === 'them') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'The other vehicle was already in the roundabout. As the entering driver you were required to give way.',
        rule: r.roundabout,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
  }

  // Intersection
  if (a.collision === 'intersection') {
    if (a.thirdPartyAction === 'running_red' && a.control === 'lights') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'The other driver entered against a red signal. Drivers must stop at red lights.',
        rule: r.redLight,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.thirdPartyAction === 'turning_right' && a.yourAction !== 'turning_right') {
      return {
        verdict: 'not_at_fault',
        headline: 'Third party likely at fault',
        explanation:
          'The other driver turned right across your path. A driver turning right must give way to oncoming traffic going straight or turning left.',
        rule: r.rightTurn,
        claimGuidance: NOT_AT_FAULT_GUIDANCE,
      };
    }
    if (a.yourAction === 'turning_right' && a.thirdPartyAction === 'proceeding') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'You were turning right while the other vehicle was proceeding straight. The right-turning driver must give way.',
        rule: r.rightTurn,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
    if (a.control === 'giveway' && a.arrival === 'they_first') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'You were facing a Give Way sign while the other vehicle was on the through road.',
        rule: r.giveWaySign,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
    if (a.control === 'stop' && a.arrival === 'they_first') {
      return {
        verdict: 'at_fault',
        headline: 'You are likely at fault',
        explanation:
          'You were facing a Stop sign and failed to give way to a vehicle on the through road.',
        rule: r.stopSign,
        claimGuidance: AT_FAULT_GUIDANCE,
      };
    }
    if (a.control === 'none') {
      if (a.arrival === 'you_first') {
        return {
          verdict: 'not_at_fault',
          headline: 'Third party likely at fault',
          explanation:
            'You arrived at the uncontrolled intersection first; the other driver was required to give way.',
          rule: r.uncontrolled,
          claimGuidance: NOT_AT_FAULT_GUIDANCE,
        };
      }
      if (a.arrival === 'they_first') {
        return {
          verdict: 'at_fault',
          headline: 'You are likely at fault',
          explanation:
            'The other vehicle arrived first at the uncontrolled intersection; you were required to give way.',
          rule: r.uncontrolled,
          claimGuidance: AT_FAULT_GUIDANCE,
        };
      }
      if (a.arrival === 'simultaneous') {
        return {
          verdict: 'shared',
          headline: 'Shared responsibility likely',
          explanation:
            'Both vehicles arrived together at an uncontrolled intersection. Right-of-way rules favour the vehicle on the right; liability is often apportioned.',
          rule: r.uncontrolled,
          claimGuidance: SHARED_GUIDANCE,
        };
      }
    }
  }

  return {
    verdict: 'unclear',
    headline: 'Assessment inconclusive',
    explanation:
      'Based on the answers provided, fault cannot be reliably determined from road rules alone. Physical evidence will be decisive.',
    rule: r.uncontrolled,
    claimGuidance: UNCLEAR_GUIDANCE,
  };
}
