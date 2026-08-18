import type { Metadata } from 'next';
import { AskView } from './AskView';

export const metadata: Metadata = { title: 'Ask' };

/** `?q=` carries a question handed over from the command palette. */
export default async function AskPage({ searchParams }: PageProps<'/ask'>) {
  const params = await searchParams;
  const raw = params.q;
  const question = Array.isArray(raw) ? raw[0] : raw;

  return <AskView {...(question ? { initialQuestion: question } : {})} />;
}
