import { useId } from 'react';

export const QUIZ_DIAGRAM_IDS = [
  'rear-end', 'uncontrolled-right', 'car-park-reverse', 'roundabout',
  'door-opening', 'lane-change', 'stolen-signal', 'hit-and-run',
  'wet-road', 'give-way-sign', 'towed-trailer', 'emergency-stop',
  'reversing-driveway', 'insurance-excess',
] as const;
export type QuizDiagramId = typeof QUIZ_DIAGRAM_IDS[number];

function Car({ x, y, angle = 0, other = false, label }: { x: number; y: number; angle?: number; other?: boolean; label?: string }) {
  return <g>
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x="-20" y="-35" width="40" height="70" rx="12" className={other ? 'quiz-car-other' : 'quiz-car-you'} />
      <path d="M-13 -18 Q0 -27 13 -18 L11 -7 H-11 Z M-11 15 H11 L13 24 H-13 Z" className="quiz-window" />
      <path d="M-16 -29 H-9 M9 -29 H16" className="quiz-lights" />
    </g>
    {label && <text x={x + 32} y={y + 5} className="quiz-label">{label}</text>}
  </g>;
}

function Label({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return <text x={x} y={y} className="quiz-label">{children}</text>;
}

function Impact({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 12} ${y - 12} l24 24 m0 -24 l-24 24`} className="quiz-impact" />;
}

/** Exact, uncropped scenario geometry; all road traffic keeps left in NZ. */
export default function QuizDiagram({ id, description }: { id: QuizDiagramId; description: string }) {
  const uid = useId().replace(/:/g, '');
  const arrowId = `${uid}-arrow`;
  const arrow = (d: string, other = false) => <path d={d} className={other ? 'quiz-route quiz-route-other' : 'quiz-route'} markerEnd={`url(#${arrowId})`} />;
  const vertical = <><path d="M250 0 H390 V360 H250 Z" className="quiz-road" /><path d="M320 0 V360" className="quiz-centre" /></>;
  const horizontal = <><path d="M0 130 H640 V270 H0 Z" className="quiz-road" /><path d="M0 200 H640" className="quiz-centre" /></>;
  const cross = <><path d="M250 0 H390 V130 H640 V270 H390 V360 H250 V270 H0 V130 H250 Z" className="quiz-road" /><path d="M320 0 V110 M320 290 V360 M0 200 H230 M410 200 H640" className="quiz-centre" /></>;
  let scene: React.ReactNode;
  switch (id) {
    case 'uncontrolled-right':
      scene = <>{cross}<Car x={282} y={295} label="You" /><Car x={355} y={65} angle={180} label="Oncoming" />{arrow('M282 250 V211 Q282 165 335 165 H474')}{arrow('M355 109 V238', true)}<Impact x={355} y={165} /><Label x={22} y={45}>No signs or signals</Label></>;
      break;
    case 'rear-end':
      scene = <>{vertical}<path d="M250 73 H390" className="quiz-edge" /><Car x={283} y={116} label="You · stopped" /><Car x={283} y={260} other label="Following car" />{arrow('M283 215 V161', true)}<Impact x={283} y={156} /><rect x="418" y="36" width="28" height="72" rx="7" className="quiz-signal" /><circle cx="432" cy="52" r="8" className="quiz-red" /><Label x={458} y={60}>Red light</Label></>;
      break;
    case 'car-park-reverse':
      scene = <><path d="M0 113 H640 V247 H0 Z" className="quiz-road" /><path d="M225 0 V110 H335 V0 M225 360 V250 H335 V360" className="quiz-edge" /><Car x={281} y={57} /><Car x={281} y={304} angle={180} other />{arrow('M281 103 V164')}{arrow('M281 257 V196', true)}<Impact x={281} y={180} /><Label x={338} y={55}>Reversing out</Label><Label x={338} y={307}>Reversing out</Label></>;
      break;
    case 'roundabout':
      scene = <><path d="M250 360 V0 H390 V360 M0 110 H640 V250 H0 Z" className="quiz-road" /><circle cx="320" cy="180" r="99" className="quiz-road" /><circle cx="320" cy="180" r="56" className="quiz-island" /><Car x={282} y={313} label="You" /><Car x={409} y={208} angle={-150} other />{arrow('M282 268 V248')}{arrow('M414 159 A95 95 0 0 1 327 275', true)}<Label x={444} y={205}>Circulating</Label><Label x={22} y={42}>Clockwise traffic</Label></>;
      break;
    case 'door-opening':
      scene = <>{vertical}<path d="M205 0 H246 V360 H205" className="quiz-parking" /><Car x={223} y={124} other /><path d="M243 106 L278 91" className="quiz-door" /><Car x={283} y={259} label="You" />{arrow('M283 214 V104')}<Impact x={275} y={97} /><Label x={26} y={64}>Parked car</Label><Label x={409} y={128}>Open door</Label></>;
      break;
    case 'lane-change':
      scene = <><path d="M210 0 H370 V360 H210 Z M0 360 H128 L269 103 L218 71 Z" className="quiz-road" /><path d="M290 0 V360" className="quiz-centre" /><Car x={250} y={229} label="You" /><Car x={110} y={263} angle={30} other />{arrow('M250 182 V55')}{arrow('M133 222 L189 125 Q212 90 250 90', true)}<Impact x={250} y={90} /><Label x={25} y={326}>On-ramp</Label><Label x={395} y={65}>Same direction</Label></>;
      break;
    case 'stolen-signal':
      scene = <>{cross}<path d="M175 137 V263 M190 137 V263 M205 137 V263 M220 137 V263" className="quiz-crossing" /><Car x={282} y={296} label="You" />{arrow('M282 250 V219 Q282 166 225 166 H116')}<circle cx="197" cy="217" r="9" className="quiz-person" /><path d="M197 229 V250 M184 240 H210" className="quiz-person-line" />{arrow('M197 260 V195', true)}<Impact x={197} y={166} /><circle cx="243" cy="298" r="7" className="quiz-green" /><circle cx="197" cy="110" r="7" className="quiz-green" /><Label x={22} y={55}>Both signals green</Label></>;
      break;
    case 'hit-and-run':
      scene = <><path d="M95 64 H548 V290 H95 Z" className="quiz-road" /><path d="M125 90 V250 H225 V90 M255 90 V250 H355 V90 M385 90 V250 H485 V90" className="quiz-edge" /><Car x={305} y={175} /><Impact x={282} y={190} /><Label x={104} y={326}>Your parked car · fresh damage · no other driver</Label></>;
      break;
    case 'wet-road':
      scene = <>{vertical}<ellipse cx="281" cy="173" rx="28" ry="60" className="quiz-water" /><Car x={283} y={279} label="You" />{arrow('M283 234 Q312 174 365 131 L400 95')}<path d="M407 30 V307" className="quiz-barrier" /><Impact x={407} y={95} /><Label x={442} y={110}>Barrier</Label><Label x={27} y={65}>Wet road</Label><Label x={27} y={92}>80 km/h</Label><path d="M50 124 l-8 16 m42 -16 l-8 16 m42 -16 l-8 16" className="quiz-route-other" /></>;
      break;
    case 'give-way-sign':
      scene = <>{horizontal}<path d="M250 270 H338 V360 H250 Z" className="quiz-road" /><path d="M0 282 H248 M340 282 H640" className="quiz-edge" /><Car x={285} y={321} label="You" /><Car x={485} y={167} angle={-90} label="Through car" />{arrow('M285 276 V231 Q285 166 233 166 H175')}{arrow('M439 167 H319', true)}<Impact x={285} y={167} /><Label x={383} y={326}>Driveway</Label><Label x={25} y={65}>Main road</Label></>;
      break;
    case 'towed-trailer':
      scene = <>{vertical}<Car x={282} y={73} label="You · towing" /><rect x="264" y="145" width="36" height="48" rx="4" className="quiz-car-you" /><path d="M282 111 V129 M272 134 l20 -8" className="quiz-edge" /><Car x={282} y={285} other label="Other car" />{arrow('M282 203 V239')}<Impact x={282} y={244} /><Label x={396} y={164}>Detached trailer</Label></>;
      break;
    case 'emergency-stop':
      scene = <>{vertical}<Car x={282} y={80} other label="Front car" /><Car x={282} y={183} label="You" /><Car x={282} y={294} other label="Rear car" />{arrow('M282 143 V124')}{arrow('M282 254 V228', true)}<Impact x={282} y={130} /><Impact x={282} y={238} /><path d="M269 18 h23 l8 9 m-27 -9 v14 m16 -14 v14" className="quiz-person-line" /><Label x={337} y={29}>Dog ahead</Label></>;
      break;
    case 'reversing-driveway':
      scene = <>{horizontal}<path d="M245 270 H333 V360 H245 Z" className="quiz-road" /><path d="M0 275 H240 M339 275 H640" className="quiz-edge" /><Car x={289} y={320} angle={180} /><Car x={278} y={243} angle={90} other />{arrow('M289 278 V259')}<Impact x={289} y={270} /><Label x={349} y={324}>You · reversing</Label><Label x={351} y={246}>Legally parked</Label><Label x={25} y={69}>Street</Label></>;
      break;
    case 'insurance-excess':
      scene = <><path d="M0 164 H640 V308 H0 Z" className="quiz-road" /><Car x={226} y={231} angle={90} /><Car x={311} y={231} angle={90} other /><Impact x={267} y={231} /><path d="M366 31 H578 V126 H456 L414 152 V126 H366 Z" className="quiz-bubble" /><Label x={388} y={70}>Other driver:</Label><Label x={388} y={101}>“It was my fault.”</Label><Label x={109} y={135}>You</Label><Label x={99} y={342}>Exchange driver and insurance details</Label></>;
      break;
  }
  return <svg viewBox="0 0 640 360" role="img" aria-label={description} className="quiz-diagram w-full h-auto block" data-scenario={id}>
    <defs><marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" className="quiz-arrowhead" /></marker></defs>
    <rect width="640" height="360" className="quiz-ground" />
    {scene}
  </svg>;
}