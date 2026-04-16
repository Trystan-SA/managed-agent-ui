import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { invites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const [invite] = await db
    .select({
      id: invites.id,
      email: invites.email,
      expiresAt: invites.expiresAt,
      acceptedAt: invites.acceptedAt,
      hasTemporaryPassword: invites.temporaryPassword
    })
    .from(invites)
    .where(eq(invites.token, params.token))
    .limit(1);

  if (!invite) throw error(404, 'Invite not found');
  if (invite.acceptedAt) throw error(410, 'This invite has already been used');
  if (new Date(invite.expiresAt) < new Date()) throw error(410, 'This invite has expired');

  return {
    email: invite.email,
    hasTemporaryPassword: !!invite.hasTemporaryPassword,
    token: params.token
  };
};
