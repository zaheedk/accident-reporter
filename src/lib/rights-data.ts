// "Know your rights" content for NZ drivers. General information only.
export interface RightsTopic {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
  faqs: { q: string; a: string }[];
  related?: { label: string; to: string }[];
}

export const RIGHTS_TOPICS: RightsTopic[] = [
  {
    slug: 'not-at-fault',
    title: 'If the accident was not your fault',
    summary: 'You can usually recover your losses from the at-fault driver, either through your insurer or directly.',
    sections: [
      {
        heading: 'What you can usually claim',
        body: [
          'In NZ, a driver who causes damage through careless driving is generally responsible for the reasonable cost of putting you back where you were. This usually includes repairs (or the market value if the car is written off), towing, and reasonable costs of being without your car.',
          'Personal injuries are handled by ACC regardless of fault. You generally cannot sue the other driver for injury costs, but property damage is separate.',
        ],
      },
      {
        heading: 'Two ways to recover',
        body: [
          'Through your own insurer: you lodge a claim, may pay your excess up front, and your insurer pursues the other side. If they recover in full, your excess is normally refunded.',
          'Directly against the other driver or their insurer: useful if you have third-party-only cover, no insurance, or do not want to claim on your own policy.',
        ],
      },
      {
        heading: 'Protect your position',
        body: [
          'Do not admit fault at the scene. Exchange names, addresses, rego and insurer details (drivers must give these on request).',
          'Take photos, note witnesses, and save dashcam footage. Use the SAVO fault checker to see which road rule applies.',
        ],
      },
    ],
    faqs: [
      { q: 'Should I have to pay my excess if it was not my fault?', a: 'Many insurers waive or refund the excess once the at-fault driver is identified and pays. Check your policy, and ask your insurer to confirm in writing.' },
      { q: 'Will a not-at-fault claim affect my no-claims bonus?', a: 'Often not, if your insurer recovers its costs, but policies vary. Ask your insurer before you lodge.' },
    ],
    related: [{ label: 'Check who is at fault', to: '/fault-guide' }, { label: 'Not-at-fault car hire', to: '/not-at-fault-car-hire' }],
  },
  {
    slug: 'courtesy-car',
    title: 'Replacement and courtesy cars',
    summary: 'If you were not at fault, the reasonable cost of a replacement vehicle can form part of your loss.',
    sections: [
      {
        heading: 'Your options',
        body: [
          'Your own policy may include a rental or courtesy car benefit, often with a daily or total limit.',
          'If another driver caused the crash, the reasonable cost of replacement transport while your car is off the road can be claimed against them. Specialist not-at-fault hire providers can arrange this and recover the cost from the at-fault party.',
        ],
      },
      {
        heading: 'What "reasonable" means',
        body: [
          'Usually a similar class of vehicle, for the time repairs reasonably take. Keep records of why you need a car (work, school runs, medical appointments).',
        ],
      },
    ],
    faqs: [
      { q: 'Does the other driver have to pay for my rental car?', a: 'If they caused the accident, loss of use is generally a recoverable loss, but it must be reasonable. Their insurer may dispute the daily rate or length of hire.' },
    ],
    related: [{ label: 'Not-at-fault car hire', to: '/not-at-fault-car-hire' }],
  },
  {
    slug: 'choosing-repairer',
    title: 'Choosing your repairer',
    summary: 'Whether you can pick your own panel beater depends on your policy, and who is paying.',
    sections: [
      {
        heading: 'Claiming on your own policy',
        body: [
          'Some policies let you choose any repairer; others prefer or require their own approved network. Read the "repairs" or "how we settle" section of your policy.',
          'Insurers may still need to approve the quote before work starts.',
        ],
      },
      {
        heading: 'Claiming against the at-fault driver',
        body: [
          'You are generally entitled to have your car repaired properly at a reasonable cost. You do not have to accept a repairer chosen by the other side, but their insurer may challenge a quote that is unreasonably high, so get it in writing.',
        ],
      },
    ],
    faqs: [
      { q: 'Can my insurer force me to use their repairer?', a: 'If your policy says so, they may limit what they pay to the cost at their network repairer. Ask them to explain the policy wording that applies.' },
    ],
    related: [{ label: 'Find a panel beater', to: '/panel-beaters' }],
  },
  {
    slug: 'uninsured-driver',
    title: 'When the other driver is uninsured',
    summary: 'You can still claim against an uninsured driver personally.',
    sections: [
      {
        heading: 'Your options',
        body: [
          'If you have comprehensive cover, claim on your policy and your insurer may pursue the driver. Some policies include an uninsured motorist benefit for third-party-only customers too.',
          'Otherwise, write to the driver with your repair quotes and ask for payment. If they refuse, you can file a claim in the Disputes Tribunal.',
        ],
      },
    ],
    faqs: [
      { q: 'What if they agree but cannot pay at once?', a: 'Put a payment arrangement in writing and signed by both of you. If they stop paying, a Disputes Tribunal order can be enforced through the District Court.' },
    ],
    related: [{ label: 'Disputes and complaints', to: '/rights/disputes' }],
  },
  {
    slug: 'claim-declined',
    title: 'If your claim is declined or delayed',
    summary: 'Insurers must treat you fairly and explain their decisions. You can challenge them for free.',
    sections: [
      {
        heading: 'Ask for reasons in writing',
        body: [
          'Ask the insurer to tell you, in writing, exactly which policy clause they rely on and what evidence they used. Insurers who follow the Fair Insurance Code commit to handling claims promptly and explaining declines.',
          'Under NZ fair conduct rules, insurers are also required to treat customers fairly.',
        ],
      },
      {
        heading: 'Disclosure problems',
        body: [
          'A common reason for declines is non-disclosure, such as not telling the insurer about past claims, modifications or a regular driver. Ask how the information would have changed their decision.',
        ],
      },
    ],
    faqs: [
      { q: 'How long should a claim take?', a: 'There is no fixed legal time, but the Fair Insurance Code sets expectations for keeping you updated. If you hear nothing for weeks, make a written complaint.' },
    ],
    related: [{ label: 'Disputes and complaints', to: '/rights/disputes' }],
  },
  {
    slug: 'disputes',
    title: 'Disputes and complaints',
    summary: 'Free options exist if you disagree with an insurer or another driver.',
    sections: [
      {
        heading: 'Against your insurer',
        body: [
          'Step 1: use the insurer\'s internal complaints process and ask for a final "deadlock" letter.',
          'Step 2: take it to the insurer\'s free dispute resolution scheme, usually the Insurance & Financial Services Ombudsman (IFSO) or Financial Services Complaints Ltd (FSCL). The scheme is named on your policy or the insurer\'s website.',
        ],
      },
      {
        heading: 'Against another driver',
        body: [
          'The Disputes Tribunal hears claims up to $30,000 (or $30,000 by agreement) and lawyers generally cannot appear. The filing fee is low. You need evidence: photos, quotes, witness details and the road rule that applies.',
        ],
      },
    ],
    faqs: [
      { q: 'Does it cost anything to go to the Ombudsman?', a: 'No, the insurance dispute schemes are free for consumers.' },
    ],
    related: [{ label: 'Check who is at fault', to: '/fault-guide' }],
  },
];

export function getRightsTopic(slug: string) {
  return RIGHTS_TOPICS.find((t) => t.slug === slug);
}
