import type { Metadata } from 'next';
import { FocusView } from './FocusView';

export const metadata: Metadata = { title: 'Focus' };

export default function FocusPage() {
  return <FocusView />;
}
