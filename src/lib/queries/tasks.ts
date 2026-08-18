'use client';

import type { CreateTaskInput, ListTasksQuery, Task, UpdateTaskInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useTasks(query: ListTasksQuery = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(query),
    queryFn: () => scalar.tasks.list(query),
  });
}

function invalidateTaskViews(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['tasks'] });
  void client.invalidateQueries({ queryKey: ['today'] });
}

export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => scalar.tasks.create(input),
    onSuccess: () => invalidateTaskViews(client),
  });
}

export function useUpdateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      scalar.tasks.update(id, input),
    onMutate: async ({ id, input }) => {
      await client.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = client.getQueriesData<{ data: Task[]; nextCursor: string | null }>({
        queryKey: ['tasks'],
      });
      for (const [key, page] of snapshots) {
        if (!page) continue;
        client.setQueryData(key, {
          ...page,
          data: page.data.map((task) => (task.id === id ? { ...task, ...input } : task)),
        });
      }
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      for (const [key, page] of context?.snapshots ?? []) client.setQueryData(key, page);
    },
    onSettled: () => invalidateTaskViews(client),
  });
}

export function useDeleteTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scalar.tasks.delete(id),
    onSuccess: () => invalidateTaskViews(client),
  });
}
