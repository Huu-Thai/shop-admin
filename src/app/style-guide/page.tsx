import type { Metadata } from 'next';
import { StyleGuide } from '@/features/style-guide/style-guide';

export const metadata: Metadata = {
  title: 'Style guide',
  description: 'Design tokens, typography, layout and components of the Shop Admin theme.',
};

export default function StyleGuidePage() {
  return <StyleGuide />;
}
