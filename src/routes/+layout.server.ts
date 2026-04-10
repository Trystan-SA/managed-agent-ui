import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    userId: locals.userId,
    userRole: locals.userRole,
    mustResetPassword: locals.mustResetPassword
  };
};
