import { Link } from 'react-router-dom';

/**
 * Contextual, in-body resource block linking out to Free 2 Drive's
 * replacement-vehicle explainers. Anchor text is varied per page (seeded by
 * the page slug) so the same phrase isn't repeated across the directory.
 * Editorial links — plain rel="noopener", never nofollow/sponsored.
 */

const LEADS = [
  'Your car is with the tow operator — but you still need to get to work.',
  'Your car is off the road for repairs, and life carries on regardless.',
  'While your vehicle sits at the yard or the panelbeater, you still need wheels.',
  'A tow is only half the problem — the other half is getting around without your car.',
];

const ANCHORS = [
  'accident replacement vehicles',
  'not-at-fault car hire',
  'replacement vehicles after a not-at-fault crash',
  'a like-for-like replacement while yours is repaired',
];

const SECOND_ANCHORS = [
  'what to do when your car is towed after an accident',
  'the steps after your car is towed from a crash',
  'towed-vehicle next steps',
];

const THIRD_ANCHORS = [
  'courtesy cars while your panelbeater has your car',
  'panelbeater loan cars explained',
  'what your panelbeater will and won\u2019t lend you',
];

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export default function ReplacementVehicleNote({ seed, className = '' }: { seed: string; className?: string }) {
  return (
    <section className={`mt-10 rounded-lg border border-border bg-muted/40 p-5 ${className}`}>
      <h2 className="text-lg font-serif text-foreground mb-2">What about a replacement vehicle?</h2>
      <p className="text-sm text-muted-foreground">
        {pick(LEADS, seed)} If the crash wasn&apos;t your fault,{' '}
        <a
          className="text-primary hover:underline"
          href="https://www.free2drive.co.nz/not-at-fault-car-hire"
          target="_blank"
          rel="noopener"
        >
          {pick(ANCHORS, seed)}
        </a>{' '}
        are arranged separately from the repair, with costs recovered from the at-fault party&apos;s insurer.
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Also useful:{' '}
        <a
          className="text-primary hover:underline"
          href="https://www.free2drive.co.nz/car-towed-after-accident"
          target="_blank"
          rel="noopener"
        >
          {pick(SECOND_ANCHORS, seed)}
        </a>{' '}
        and{' '}
        <a
          className="text-primary hover:underline"
          href="https://www.free2drive.co.nz/panelbeater-courtesy-car"
          target="_blank"
          rel="noopener"
        >
          {pick(THIRD_ANCHORS, seed)}
        </a>
        . Our own guide covers{' '}
        <Link className="text-primary hover:underline" to="/blog/courtesy-cars-not-at-fault-accidents-nz">
          your courtesy car rights in New Zealand
        </Link>
        , and our{' '}
        <Link className="text-primary hover:underline" to="/not-at-fault-car-hire">
          not-at-fault car hire explainer
        </Link>{' '}
        covers who pays.
      </p>
    </section>
  );
}
