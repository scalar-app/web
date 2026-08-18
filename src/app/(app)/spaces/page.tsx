import type { Metadata } from 'next';
import { SpacesView } from './SpacesView';

export const metadata: Metadata = { title: 'Spaces' };

export default function SpacesPage() {
  return <SpacesView />;
}
