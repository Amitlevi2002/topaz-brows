import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, priceOf, type Context } from './handler';
import { emptyState } from './seed';
import type { Session, State } from './types';

// Sunday 1 Nov 2026, 09:00 in Israel (07:00 UTC).
const NOW = new Date('2026-11-01T07:00:00Z');
const ctx = (now = NOW): Context => ({
  now,
  checkAdminPassword: (p) => p === 'secret-pass',
  issueToken: (s) => JSON.stringify(s),
});
const ADMIN: Session = { role: 'admin' };

function call(state: State, method: string, path: string, body: any = {}, session: Session | null = ADMIN, now = NOW) {
  return handle(state, { method, path, body, session }, ctx(now)) as { status: number; body: any };
}

/** A studio with one open day (2 Nov) and one signed-in client. */
function studio() {
  const s = emptyState();
  call(s, 'POST', '/api/admin/days', { date: '2026-11-02', slots: ['10:00', '12:00'] });
  const login = call(s, 'POST', '/api/client/login', { fullName: 'Dana Rosen', phone: '054-987-6543' }, null);
  const client: Session = JSON.parse(login.body.token);
  return { s, client, dayId: s.days[0].id };
}

test('admin routes refuse requests without an admin session', () => {
  const { s, client } = studio();
  assert.equal(call(s, 'GET', '/api/admin/overview', {}, null).status, 401);
  assert.equal(call(s, 'GET', '/api/admin/overview', {}, client).status, 401);
  assert.equal(call(s, 'GET', '/api/admin/overview').status, 200);
});

test('admin login checks the password through the context', () => {
  const s = emptyState();
  assert.equal(call(s, 'POST', '/api/admin/login', { password: 'nope' }, null).status, 401);
  assert.equal(call(s, 'POST', '/api/admin/login', { password: 'secret-pass' }, null).status, 200);
});

test('client login validates name and Israeli mobile number, and reuses the customer by phone', () => {
  const s = emptyState();
  assert.equal(call(s, 'POST', '/api/client/login', { fullName: 'Dana', phone: '0549876543' }, null).status, 400);
  assert.equal(call(s, 'POST', '/api/client/login', { fullName: 'Dana Rosen', phone: '03-1234567' }, null).status, 400);
  call(s, 'POST', '/api/client/login', { fullName: 'Dana Rosen', phone: '0549876543' }, null);
  call(s, 'POST', '/api/client/login', { fullName: 'Dana  Levi', phone: '054 987 6543' }, null);
  assert.equal(s.customers.length, 1);
  assert.equal(s.customers[0].full_name, 'Dana Levi');
});

test('prices add up to the price list Topaz gave', () => {
  const s = emptyState();
  assert.equal(priceOf(s, 'design', {}), 60);
  assert.equal(priceOf(s, 'design', { lip: 1 }), 70, 'design and moustache');
  assert.equal(priceOf(s, 'design', { lip: 1, nose: 1 }), 75, 'design, moustache and nose');
  assert.equal(priceOf(s, 'lift', { lip: 1 }), 190, 'lift and moustache');
  assert.equal(priceOf(s, 'nope'), null);
  assert.equal(priceOf(s, 'design', { lip: -4 }), 60, 'negative quantities are ignored');
});

test('a client books a free slot; the request waits for Topaz', () => {
  const { s, client, dayId } = studio();
  const r = call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design' }, client);
  assert.equal(r.status, 201);
  assert.equal(r.body.status, 'pending');
  assert.equal(s.requests[0].price, 60);
});

test('a client cannot book a time that is not offered, has passed, or twice on the same day', () => {
  const { s, client, dayId } = studio();
  assert.equal(call(s, 'POST', '/api/client/requests', { dayId, time: '11:00', service: 'design' }, client).status, 400);
  assert.equal(call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design' }, client).status, 201);
  assert.equal(call(s, 'POST', '/api/client/requests', { dayId, time: '12:00', service: 'design' }, client).status, 400);
  const later = new Date('2026-11-02T09:30:00Z'); // 11:30 in Israel: 10:00 is gone
  const other = studio();
  assert.equal(
    call(
      other.s,
      'POST',
      '/api/client/requests',
      { dayId: other.dayId, time: '10:00', service: 'design' },
      other.client,
      later,
    ).status,
    400,
  );
});

test('approving takes the slot away from other clients and blocks a second approval at that time', () => {
  const { s, client, dayId } = studio();
  const second: Session = JSON.parse(
    call(s, 'POST', '/api/client/login', { fullName: 'Noa Avraham', phone: '0521112233' }, null).body.token,
  );
  call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design' }, client);
  call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'lift' }, second);
  const [a, b] = s.requests;
  assert.equal(call(s, 'PATCH', `/api/admin/requests/${a.id}`, { status: 'approved' }).status, 200);
  assert.equal(call(s, 'PATCH', `/api/admin/requests/${b.id}`, { status: 'approved' }).status, 409);
  const days = call(s, 'GET', '/api/client/days', {}, second).body;
  assert.deepEqual(days[0].slots, ['12:00']);
});

test('a client may cancel an approved appointment only until the cutoff', () => {
  const { s, client, dayId } = studio();
  call(s, 'POST', '/api/client/requests', { dayId, time: '12:00', service: 'design' }, client);
  const id = s.requests[0].id;
  call(s, 'PATCH', `/api/admin/requests/${id}`, { status: 'approved' });
  const twoHoursBefore = new Date('2026-11-02T08:00:00Z'); // 10:00 Israel, cutoff is 3h
  assert.equal(call(s, 'DELETE', `/api/client/requests/${id}`, {}, client, twoHoursBefore).status, 409);
  assert.equal(call(s, 'DELETE', `/api/client/requests/${id}`, {}, client).status, 200);
  assert.equal(s.requests[0].status, 'cancelled');
});

test('a client only sees and cancels her own requests', () => {
  const { s, client, dayId } = studio();
  const other: Session = JSON.parse(
    call(s, 'POST', '/api/client/login', { fullName: 'Noa Avraham', phone: '0521112233' }, null).body.token,
  );
  call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design' }, client);
  assert.deepEqual(call(s, 'GET', '/api/client/requests', {}, other).body, []);
  assert.equal(call(s, 'DELETE', `/api/client/requests/${s.requests[0].id}`, {}, other).status, 404);
});

test('a blocked client cannot send requests', () => {
  const { s, client, dayId } = studio();
  call(s, 'PATCH', `/api/admin/customers/${s.customers[0].id}`, { blocked: true });
  assert.equal(call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design' }, client).status, 403);
});

test('a manual booking on a closed day does not duplicate the day when Topaz later opens it', () => {
  const s = emptyState();
  call(s, 'POST', '/api/admin/bookings', {
    fullName: 'Maya Cohen',
    phone: '0503334455',
    date: '2026-11-05',
    time: '09:00',
    service: 'lift',
  });
  assert.equal(call(s, 'POST', '/api/admin/days', { date: '2026-11-05', slots: ['11:00'] }).status, 201);
  assert.equal(s.days.length, 1);
  assert.deepEqual(s.days[0].slots, ['09:00', '11:00']);
});

test('monthly income counts approved appointments only', () => {
  const { s, client, dayId } = studio();
  call(s, 'POST', '/api/client/requests', { dayId, time: '10:00', service: 'design', extras: { lip: 1 } }, client);
  call(s, 'POST', '/api/admin/bookings', {
    fullName: 'Maya Cohen',
    phone: '0503334455',
    date: '2026-11-02',
    time: '12:00',
    service: 'lift',
  });
  const month = call(s, 'GET', '/api/admin/overview').body.month;
  assert.equal(month.count, 1);
  assert.equal(month.income, 180);
});

test('gallery accepts only reasonably sized images', () => {
  const s = emptyState();
  assert.equal(call(s, 'POST', '/api/admin/gallery', { dataUrl: 'data:text/html;base64,PGgxPg==' }).status, 400);
  assert.equal(
    call(s, 'POST', '/api/admin/gallery', { dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(3_000_000) }).status,
    400,
  );
  assert.equal(call(s, 'POST', '/api/admin/gallery', { dataUrl: 'data:image/jpeg;base64,/9j/4AAQ' }).status, 201);
});

test('the public info names the nearest free time, and moves on once it is taken', () => {
  const { s, dayId } = studio();
  assert.deepEqual(call(s, 'GET', '/api/info', {}, null).body.nextFree, { date: '2026-11-02', time: '10:00' });
  call(s, 'POST', '/api/admin/bookings', { fullName: 'Maya Cohen', phone: '0503334455', date: '2026-11-02', time: '10:00', service: 'design' });
  assert.equal(s.days.filter((d) => d.id === dayId).length, 1);
  assert.deepEqual(call(s, 'GET', '/api/info', {}, null).body.nextFree, { date: '2026-11-02', time: '12:00' });
  assert.equal(call(s, 'GET', '/api/info', {}, null, new Date('2026-11-03T07:00:00Z')).body.nextFree, null);
});
