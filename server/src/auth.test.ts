import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createAuth, rateLimiter } from './auth';

const auth = createAuth('x'.repeat(40), 'correct horse');

test('a token round-trips and keeps the role', () => {
  assert.deepEqual(auth.verify('Bearer ' + auth.issueToken({ role: 'client', id: 7 })), { role: 'client', id: 7 });
  assert.deepEqual(auth.verify('Bearer ' + auth.issueToken({ role: 'admin' })), { role: 'admin' });
});

test('a changed payload or a token from another secret is rejected', () => {
  const [payload, sig] = auth.issueToken({ role: 'client', id: 7 }).split('.');
  const forged = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1e9 })).toString('base64url');
  assert.equal(auth.verify(`Bearer ${forged}.${sig}`), null);
  const other = createAuth('y'.repeat(40), 'correct horse');
  assert.equal(other.verify(`Bearer ${payload}.${sig}`), null);
  assert.equal(auth.verify('Bearer admin'), null);
  assert.equal(auth.verify(undefined), null);
});

test('an expired token is rejected', () => {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() - 1 })).toString('base64url');
  const sig = createHmac('sha256', 'x'.repeat(40)).update(payload).digest('base64url');
  assert.equal(auth.verify(`Bearer ${payload}.${sig}`), null);
});

test('admin password check', () => {
  assert.equal(auth.checkAdminPassword('correct horse'), true);
  assert.equal(auth.checkAdminPassword('correct hors'), false);
  assert.equal(auth.checkAdminPassword(''), false);
});

test('weak configuration is refused at startup', () => {
  assert.throws(() => createAuth('short', 'correct horse'));
  assert.throws(() => createAuth('x'.repeat(40), '1234'));
});

test('rate limiter allows the limit, then blocks until the window passes', () => {
  const allow = rateLimiter(2, 60_000);
  assert.equal(allow('ip'), true);
  assert.equal(allow('ip'), true);
  assert.equal(allow('ip'), false);
  assert.equal(allow('other-ip'), true);
});
