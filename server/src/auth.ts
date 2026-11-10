// Stateless signed tokens: base64url(payload).hmac. Nothing to look up per request, and they can't be forged
// without SESSION_SECRET (unlike the demo's plain "admin" / "client:5" strings).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Session } from '../../core/types';

const DAY = 24 * 60 * 60 * 1000;
const TTL = { admin: 30 * DAY, client: 180 * DAY };

export function createAuth(secret: string, adminPassword: string) {
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const sign = (data: string) => createHmac('sha256', secret).update(data).digest('base64url');
  const sameBytes = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
  const hash = (s: string) => createHash('sha256').update(s).digest();

  return {
    issueToken(session: Session) {
      const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + TTL[session.role] })).toString(
        'base64url',
      );
      return `${payload}.${sign(payload)}`;
    },

    verify(header: string | undefined): Session | null {
      const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
      const [payload, sig] = token.split('.');
      if (!payload || !sig || !sameBytes(Buffer.from(sig), Buffer.from(sign(payload)))) return null;
      try {
        const { role, id, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (typeof exp !== 'number' || exp < Date.now()) return null;
        if (role === 'admin') return { role };
        if (role === 'client' && Number.isInteger(id)) return { role, id };
      } catch {
        /* malformed payload */
      }
      return null;
    },

    // compare hashes so the check takes the same time whatever the input length
    checkAdminPassword: (password: string) => sameBytes(hash(password), hash(adminPassword)),
  };
}

/** At most `limit` attempts per key per window; enough to stop password guessing on a one-person app. */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length <= limit;
  };
}
