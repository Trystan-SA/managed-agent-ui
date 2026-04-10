import { createConnection } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { db } from './db';
import { smtpSettings } from './db/schema';
import { decrypt } from './crypto';

export async function getSmtpConfig(): Promise<{
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
} | null> {
  const [config] = await db.select().from(smtpSettings).limit(1);
  if (!config) return null;

  const password = decrypt(config.encryptedPassword, config.iv);
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password,
    fromEmail: config.fromEmail
  };
}

/**
 * Minimal SMTP email sender using raw sockets.
 * Supports STARTTLS on port 587 and implicit TLS on port 465.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) return false;

  const smtpHost = config.host;
  const smtpPort = config.port;
  const smtpUser = config.username;
  const smtpPass = config.password;
  const smtpFrom = config.fromEmail;

  return new Promise((resolve, reject) => {
    const message = [
      `From: ${smtpFrom}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html
    ].join('\r\n');

    let socket: any;
    let buffer = '';
    let step = 0;

    function send(cmd: string) {
      socket.write(cmd + '\r\n');
    }

    function handleData(data: Buffer) {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3));

        switch (step) {
          case 0: // greeting
            if (code === 220) { step = 1; send(`EHLO localhost`); }
            break;
          case 1: // EHLO response
            if (line.startsWith('250 ') || (code === 250 && !line.startsWith('250-'))) {
              step = 2;
              send(`AUTH LOGIN`);
            }
            break;
          case 2: // AUTH LOGIN
            if (code === 334) { step = 3; send(Buffer.from(smtpUser).toString('base64')); }
            break;
          case 3: // username
            if (code === 334) { step = 4; send(Buffer.from(smtpPass).toString('base64')); }
            break;
          case 4: // password
            if (code === 235) { step = 5; send(`MAIL FROM:<${smtpFrom}>`); }
            else { reject(new Error(`Auth failed: ${line}`)); socket.end(); }
            break;
          case 5: // MAIL FROM
            if (code === 250) { step = 6; send(`RCPT TO:<${to}>`); }
            break;
          case 6: // RCPT TO
            if (code === 250) { step = 7; send('DATA'); }
            break;
          case 7: // DATA
            if (code === 354) { step = 8; send(message + '\r\n.'); }
            break;
          case 8: // message sent
            if (code === 250) { step = 9; send('QUIT'); resolve(true); }
            break;
        }
      }
    }

    if (smtpPort === 465) {
      socket = tlsConnect({ host: smtpHost, port: smtpPort }, () => {});
    } else {
      socket = createConnection({ host: smtpHost, port: smtpPort });
    }

    socket.on('data', handleData);
    socket.on('error', (err: Error) => reject(err));
    socket.setTimeout(15000, () => { socket.destroy(); reject(new Error('SMTP timeout')); });
  });
}

export async function sendInviteEmail(email: string, inviteUrl: string): Promise<boolean> {
  try {
    return await sendEmail(
      email,
      'You\'ve been invited to Managed Agents',
      `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">You're invited</h2>
        <p style="color: #52526b;">You've been invited to join the Managed Agents dashboard. Click the link below to set up your account.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Invite</a>
        </p>
        <p style="color: #9090a7; font-size: 14px;">This invite expires in 48 hours.</p>
      </div>`
    );
  } catch {
    return false;
  }
}
