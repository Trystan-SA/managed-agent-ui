declare global {
  namespace App {
    interface Locals {
      userId: string | null;
      userRole: 'admin' | 'member' | null;
      mustResetPassword: boolean;
    }
  }
}

export {};
