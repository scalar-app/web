'use client';

import type { CreateWorkspaceInput, InviteToWorkspaceInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useWorkspaces() {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: () => scalar.workspaces.list() });
}

/**
 * Everything on screen belongs to a workspace, so switching invalidates the whole cache rather
 * than a list of keys somebody has to keep up to date. Missing one would leave the last
 * workspace's tasks on screen under the new workspace's name, which is worse than a reload.
 */
function useWorkspaceSwitchInvalidation() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function useActivateWorkspace() {
  const invalidate = useWorkspaceSwitchInvalidation();
  return useMutation({
    mutationFn: (id: string) => scalar.workspaces.activate(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateWorkspace() {
  const invalidate = useWorkspaceSwitchInvalidation();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => scalar.workspaces.create(input),
    onSuccess: async (created) => {
      // Made and then entered: nobody creates a workspace in order to stay where they were.
      await scalar.workspaces.activate(created.id);
      await invalidate();
    },
  });
}

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId ?? ''),
    queryFn: () => scalar.workspaces.members(workspaceId ?? ''),
    enabled: workspaceId !== null,
  });
}

export function useInvitations(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.workspaceInvitations(workspaceId ?? ''),
    queryFn: () => scalar.workspaces.invitations(workspaceId ?? ''),
    enabled: workspaceId !== null && enabled,
  });
}

function useMembershipInvalidation(workspaceId: string | null) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.workspaceMembers(workspaceId ?? '') });
    void client.invalidateQueries({ queryKey: queryKeys.workspaceInvitations(workspaceId ?? '') });
  };
}

export function useInvite(workspaceId: string | null) {
  const invalidate = useMembershipInvalidation(workspaceId);
  return useMutation({
    mutationFn: (input: InviteToWorkspaceInput) =>
      scalar.workspaces.invite(workspaceId ?? '', input),
    onSuccess: invalidate,
  });
}

export function useRevokeInvitation(workspaceId: string | null) {
  const invalidate = useMembershipInvalidation(workspaceId);
  return useMutation({
    mutationFn: (invitationId: string) =>
      scalar.workspaces.revokeInvitation(workspaceId ?? '', invitationId),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole(workspaceId: string | null) {
  const invalidate = useMembershipInvalidation(workspaceId);
  return useMutation({
    mutationFn: (input: { userId: string; role: 'admin' | 'member' }) =>
      scalar.workspaces.updateMemberRole(workspaceId ?? '', input.userId, { role: input.role }),
    onSuccess: invalidate,
  });
}

/**
 * Removing somebody and leaving are one call. Leaving changes which workspace the session is in,
 * so the whole cache goes rather than the two membership keys.
 */
export function useRemoveMember(workspaceId: string | null) {
  const client = useQueryClient();
  const invalidate = useMembershipInvalidation(workspaceId);
  return useMutation({
    mutationFn: (input: { userId: string; leaving: boolean }) =>
      scalar.workspaces.removeMember(workspaceId ?? '', input.userId),
    onSuccess: async (_result, input) => {
      if (input.leaving) await client.invalidateQueries();
      else invalidate();
    },
  });
}

export function useTransferOwnership(workspaceId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      scalar.workspaces.transferOwnership(workspaceId ?? '', { userId }),
    // The caller's own role changed, so the session context is stale as well as the member list.
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useDeleteWorkspace(workspaceId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => scalar.workspaces.delete(workspaceId ?? '', { name }),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: () => scalar.invitations.preview(token),
    retry: false,
  });
}

export function useAcceptInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => scalar.invitations.accept(token),
    onSuccess: async (joined) => {
      await scalar.workspaces.activate(joined.id);
      await client.invalidateQueries();
    },
  });
}
