import driving from '@/assets/quiz/nz-driving.jpg';
import accident from '@/assets/quiz/accident-help.jpg';
import privacy from '@/assets/quiz/privacy-rights.jpg';
import insurance from '@/assets/quiz/insurance-cover.jpg';
import type { QuizTopic } from '@/lib/fault-quiz';

const artwork = {
  driving: { src: driving, alt: 'Illustration of a green car exploring New Zealand' },
  accident: { src: accident, alt: 'Illustration of people checking on each other after a minor accident' },
  privacy: { src: privacy, alt: 'Illustration of a person protecting their phone and personal documents' },
  insurance: { src: insurance, alt: 'Illustration of a driver reviewing their car insurance policy' },
};

export default function QuizArtwork({ topic }: { topic?: QuizTopic }) {
  if (!topic || topic === 'fault') return null;
  const image = artwork[topic];
  return <img src={image.src} alt={image.alt} width={1152} height={576} loading="lazy" className="w-full h-auto max-h-44 object-contain" />;
}