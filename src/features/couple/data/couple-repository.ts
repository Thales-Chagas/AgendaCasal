import type { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { AppError, toAppError } from '@/core/errors/app-error';
import type { Database } from '@/core/supabase/database.types';

import { normalizeInviteCode } from '../domain/invite-code';

const AVATAR_BUCKET = 'avatars';
/** Validade das URLs assinadas das fotos (o app renova antes de vencer). */
export const AVATAR_URL_TTL_S = 24 * 60 * 60;

export type AvatarColorKey = 'rose' | 'plum' | 'indigo' | 'teal' | 'amber' | 'sage';

export type Person = {
  id: string;
  displayName: string;
  avatarColor: AvatarColorKey;
  /** Foto de perfil no bucket privado `avatars` (null = só iniciais). */
  avatarPath: string | null;
};

export type MySpace = {
  coupleId: string;
  connectedAt: string | null;
  syncEpoch: number;
  me: Person;
  partner: Person | null;
};

export type ActiveInvite = { code: string; expiresAt: string };
export type InvitePreview = { inviterName: string; expiresAt: string; myEventCount: number };

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function toPerson(row: ProfileRow): Person {
  // O rosé é reservado para o casal: perfis antigos com rosé aparecem em índigo.
  const color = row.avatar_color === 'rose' ? 'indigo' : (row.avatar_color as AvatarColorKey);
  return { id: row.id, displayName: row.display_name, avatarColor: color, avatarPath: row.avatar_path };
}

/** Espaço do casal, convites e perfil. Autorização real: RLS + RPCs no servidor. */
export function createCoupleRepository(client: SupabaseClient<Database>) {
  async function unwrapNullable<T>(promise: PromiseLike<{ data: T; error: unknown }>): Promise<T | null> {
    const { data, error } = await promise;
    if (error) throw toAppError(error);
    return data ?? null;
  }

  async function unwrap<T>(promise: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
    const data = await unwrapNullable(promise);
    if (data === null || data === undefined) throw new AppError('not_found');
    return data as NonNullable<T>;
  }

  return {
    async getMySpace(userId: string): Promise<MySpace> {
      const couple = await unwrap(client.from('couples').select('id, connected_at, sync_epoch').single());
      const members = await unwrap(
        client.from('couple_members').select('user_id').eq('couple_id', couple.id),
      );
      const profiles = await unwrap(
        client
          .from('profiles')
          .select('*')
          .in(
            'id',
            members.map((m) => m.user_id),
          ),
      );
      const me = profiles.find((p) => p.id === userId);
      if (!me) throw new AppError('not_found');
      const partner = profiles.find((p) => p.id !== userId) ?? null;
      return {
        coupleId: couple.id,
        connectedAt: couple.connected_at,
        syncEpoch: couple.sync_epoch,
        me: toPerson(me),
        partner: partner ? toPerson(partner) : null,
      };
    },

    async updateMyProfile(userId: string, input: { displayName?: string; avatarColor?: AvatarColorKey }) {
      await unwrapNullable(
        client
          .from('profiles')
          .update({
            ...(input.displayName !== undefined && { display_name: input.displayName.trim() }),
            ...(input.avatarColor !== undefined && { avatar_color: input.avatarColor }),
          })
          .eq('id', userId),
      );
    },

    /** Envia a foto já recortada (JPEG) e troca a do perfil; a antiga é apagada. */
    async setMyAvatar(userId: string, jpeg: ArrayBuffer, previousPath: string | null): Promise<string> {
      const path = `${userId}/${Crypto.randomUUID()}.jpg`;
      const { error } = await client.storage
        .from(AVATAR_BUCKET)
        .upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
      if (error) throw toAppError(error);
      await unwrapNullable(client.from('profiles').update({ avatar_path: path }).eq('id', userId));
      if (previousPath) await client.storage.from(AVATAR_BUCKET).remove([previousPath]);
      return path;
    },

    async removeMyAvatar(userId: string, path: string | null): Promise<void> {
      await unwrapNullable(client.from('profiles').update({ avatar_path: null }).eq('id', userId));
      if (path) await client.storage.from(AVATAR_BUCKET).remove([path]);
    },

    /** Apaga todas as minhas fotos (usado ao excluir a conta). */
    async removeAllMyAvatars(userId: string): Promise<void> {
      const { data } = await client.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
      const paths = (data ?? []).map((f) => `${userId}/${f.name}`);
      if (paths.length) await client.storage.from(AVATAR_BUCKET).remove(paths);
    },

    /** URL temporária (a foto nunca fica pública). */
    async avatarUrl(path: string): Promise<string> {
      const { data, error } = await client.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, AVATAR_URL_TTL_S);
      if (error || !data) throw toAppError(error ?? new Error('signed url'));
      return data.signedUrl;
    },

    async createInvite(): Promise<ActiveInvite> {
      const row = await unwrap(client.rpc('create_couple_invite').single());
      return { code: row.code, expiresAt: row.expires_at };
    },

    async revokeInvites(): Promise<void> {
      await unwrapNullable(client.rpc('revoke_couple_invites'));
    },

    /** `null` quando o convite é inválido/expirado/usado. */
    async previewInvite(code: string): Promise<InvitePreview | null> {
      const rows = await unwrap(client.rpc('preview_invite', { p_code: normalizeInviteCode(code) }));
      const row = rows[0];
      if (!row) return null;
      return { inviterName: row.inviter_name, expiresAt: row.expires_at, myEventCount: row.my_event_count };
    },

    async acceptInvite(code: string, bringMyEvents: boolean): Promise<string> {
      const coupleId = await unwrapNullable(
        client.rpc('accept_invite', { p_code: normalizeInviteCode(code), p_bring_events: bringMyEvents }),
      );
      if (!coupleId) throw new AppError('invite_invalid');
      return coupleId;
    },

    async leaveCouple(keepSharedCopy: boolean): Promise<string> {
      return unwrap(client.rpc('leave_couple', { p_keep_shared_copy: keepSharedCopy }));
    },

    async exportMyData(): Promise<unknown> {
      return unwrap(client.rpc('export_my_data'));
    },

    async deleteMyAccount(): Promise<void> {
      await unwrapNullable(client.rpc('delete_my_account'));
    },
  };
}

export type CoupleRepository = ReturnType<typeof createCoupleRepository>;
