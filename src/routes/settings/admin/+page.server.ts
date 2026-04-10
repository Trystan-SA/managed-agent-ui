import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.userRole !== 'admin') {
    throw redirect(303, '/settings');
  }
  return {};
};
