'use client';

import { Panel } from '@scalar/ui';
import { useAiStatus } from '@/lib/queries/command';

/**
 * Which model vendor this server talks to.
 *
 * Read only, deliberately. The provider is server configuration: a self hoster sets it in their
 * environment, and a web form that pretended otherwise would be lying. What this screen owes them
 * is an accurate answer to "is it on, and what is it talking to".
 */

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  ollama: 'Ollama (local)',
  openai_compatible: 'OpenAI-compatible endpoint',
};

export function AiStatus() {
  const status = useAiStatus();

  return (
    <Panel title="AI">
      {status.isPending ? (
        <p className="text-[13px] text-secondary">Checking…</p>
      ) : status.isError ? (
        <p className="text-[13px] text-secondary">
          Scalar could not check which provider this server uses.
        </p>
      ) : status.data.configured ? (
        <>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
            <dt className="text-secondary">Provider</dt>
            <dd className="text-primary">
              {PROVIDER_LABEL[status.data.provider ?? ''] ?? status.data.provider}
            </dd>
          </dl>
          <p className="mt-4 text-[13px] text-secondary">
            Configured on the server. Your requests go straight from this installation to that
            provider: nothing passes through infrastructure run by Scalar.
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] text-primary">No AI provider is configured.</p>
          <p className="mt-2 text-[13px] text-secondary">
            Tasks, calendar, planning, focus and search all work without one. Set{' '}
            <code className="font-mono text-[12px]">AI_PROVIDER</code> on the server to enable Ask
            Scalar, using a hosted provider or a local model.
          </p>
        </>
      )}
    </Panel>
  );
}
