'use client';

import type { ApplyPlanInput, PreviewPlanInput } from '@scalar/sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';

/**
 * Preview is a mutation rather than a query on purpose: a plan is something a person asks for at a
 * moment, not something the screen keeps refetching underneath them while they read it.
 */
export function usePreviewPlan() {
  return useMutation({
    mutationFn: (input: PreviewPlanInput = {}) => scalar.planner.preview(input),
  });
}

export function useApplyPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyPlanInput) => scalar.planner.apply(input),
    onSuccess: () => {
      // Applying a plan changes the day, the task list and what needs attention.
      void client.invalidateQueries({ queryKey: ['timeline'] });
      void client.invalidateQueries({ queryKey: ['today'] });
      void client.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
