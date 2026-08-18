export const queryKeys = {
  me: ['me'] as const,
  today: (tz: string, date?: string) => ['today', tz, date ?? 'now'] as const,
  tasks: (filters: Record<string, unknown> = {}) => ['tasks', filters] as const,
  task: (id: string) => ['tasks', 'detail', id] as const,
  spaces: ['spaces'] as const,
  events: (from: string, to: string) => ['events', from, to] as const,
  integrations: ['integrations'] as const,
  commandThreads: ['command', 'threads'] as const,
  commandThread: (id: string) => ['command', 'threads', id] as const,
} as const;
