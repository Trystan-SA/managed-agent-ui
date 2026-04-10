import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { smtpSettings } from '$lib/server/db/schema';
import { encrypt, decrypt } from '$lib/server/crypto';
import { sendEmail } from '$lib/server/email';

function requireAdmin(locals: App.Locals) {
  if (!locals.userId || locals.userRole !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// Get SMTP settings (password masked)
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const [config] = await db.select().from(smtpSettings).limit(1);
  if (!config) return json(null);

  return json({
    host: config.host,
    port: config.port,
    username: config.username,
    fromEmail: config.fromEmail,
    hasPassword: true
  });
};

// Save SMTP settings
export const PUT: RequestHandler = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { host, port, username, password, fromEmail } = await request.json();
  if (!host || !port || !username || !password || !fromEmail) {
    return json({ error: 'All SMTP fields are required' }, { status: 400 });
  }

  const { encrypted, iv } = encrypt(password);

  // Upsert: delete existing and insert new (single-row table)
  await db.delete(smtpSettings);
  await db.insert(smtpSettings).values({
    host,
    port: Number(port),
    username,
    encryptedPassword: encrypted,
    iv,
    fromEmail,
    updatedBy: locals.userId!
  });

  return json({ success: true });
};

// Test SMTP
export const POST: RequestHandler = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { testEmail } = await request.json();
  if (!testEmail) return json({ error: 'Test email address is required' }, { status: 400 });

  try {
    const sent = await sendEmail(testEmail, 'Managed Agents — SMTP Test', '<p>SMTP is configured correctly.</p>');
    if (!sent) return json({ error: 'SMTP is not configured' }, { status: 400 });
    return json({ success: true });
  } catch (e: any) {
    return json({ error: `SMTP test failed: ${e.message}` }, { status: 500 });
  }
};
