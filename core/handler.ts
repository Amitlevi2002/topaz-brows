// All of the booking rules, as one function from (state, request) to response.
// The server runs it against SQLite-backed state; the hosted demo runs the very same code in the browser.
import type { ApiRequest, ApiResponse, Customer, Day, Extras, Request, Session, State } from './types';
import { addDays, minutesUntil, timeIn, todayIn } from './time';

export interface Context {
  now: Date;
  checkAdminPassword(password: string): boolean;
  issueToken(session: Session): string;
}

const ok = (body: unknown = { ok: true }, status = 200): ApiResponse => ({ status, body });
const fail = (error: string, status = 400): ApiResponse => ({ status, body: { error } });

const ACTIVE = ['pending', 'approved'];
const isTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const cleanPhone = (p: unknown) => String(p ?? '').replace(/\D/g, '');
const isPhone = (p: string) => /^05\d{8}$/.test(p);
const cleanSlots = (a: unknown) => (Array.isArray(a) ? [...new Set(a)].filter(isTime).sort() : []);
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

export function priceOf(state: State, serviceId: string, extras: Extras = {}) {
  const { services, extras: list } = state.settings.catalog;
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;
  return service.price + list.reduce((total, e) => total + Math.max(0, Math.floor(extras[e.id] || 0)) * e.price, 0);
}

export function handle(state: State, req: ApiRequest, ctx: Context): ApiResponse {
  const { method, body = {}, session } = req;
  const path = req.path.split('?')[0];
  const today = todayIn(ctx.now);
  const now = timeIn(ctx.now);
  const nextId = () => ++state.nextId;

  const customer = (id: number) => state.customers.find((c) => c.id === id);
  const day = (id: number) => state.days.find((d) => d.id === id);
  const takenTimes = (dayId: number) =>
    new Set(state.requests.filter((r) => r.day_id === dayId && r.status === 'approved').map((r) => r.time));
  const view = (r: Request) => {
    const c = customer(r.customer_id)!;
    return {
      id: r.id,
      time: r.time,
      note: r.note,
      status: r.status,
      service: r.service,
      extras: r.extras,
      price: r.price,
      attended: r.attended == null ? null : !!r.attended,
      customerId: c.id,
      fullName: c.full_name,
      phone: c.phone,
      date: day(r.day_id)!.date,
    };
  };
  const sorted = (rs: Request[]) => rs.map(view).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const dayFor = (date: string, time: string): Day => {
    let d = state.days.find((x) => x.date === date);
    if (!d) state.days.push((d = { id: nextId(), date, open: 0, slots: [] }));
    if (!d.slots.includes(time)) d.slots.push(time);
    return d;
  };
  const findOrCreateCustomer = (fullName: string, phone: string): Customer => {
    let c = state.customers.find((x) => x.phone === phone);
    if (!c)
      state.customers.push((c = { id: nextId(), full_name: fullName, phone, note: '', blocked: 0, created_at: today }));
    return c;
  };
  let m: RegExpMatchArray | null;

  /** Open days from today on, with the times still free to ask for. */
  const freeDays = () =>
    state.days
      .filter((d) => d.open && d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const taken = takenTimes(d.id);
        return {
          id: d.id,
          date: d.date,
          slots: [...d.slots].sort().filter((t) => !taken.has(t) && minutesUntil(d.date, t, ctx.now) > 0),
        };
      })
      .filter((d) => d.slots.length);

  /* ---------- public ---------- */
  if (path === '/api/info' && method === 'GET') {
    const { phone, address, instagram, about, cancelHours, catalog } = state.settings;
    // the nearest free time, so the front page can say when she could come without signing in
    const first = freeDays()[0];
    const nextFree = first ? { date: first.date, time: first.slots[0] } : null;
    return ok({ phone, address, instagram, about, cancelHours, catalog, nextFree, gallery: [...state.gallery].reverse() });
  }

  if (path === '/api/admin/login' && method === 'POST') {
    if (!ctx.checkAdminPassword(String(body.password ?? ''))) return fail('סיסמה שגויה', 401);
    return ok({ token: ctx.issueToken({ role: 'admin' }) });
  }

  if (path === '/api/client/login' && method === 'POST') {
    const fullName = String(body.fullName ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60);
    const phone = cleanPhone(body.phone);
    if (fullName.split(' ').length < 2) return fail('נא להזין שם פרטי ושם משפחה');
    if (!isPhone(phone)) return fail('מספר טלפון לא תקין (לדוגמה 0501234567)');
    const c = findOrCreateCustomer(fullName, phone);
    c.full_name = fullName;
    return ok({ token: ctx.issueToken({ role: 'client', id: c.id }), customer: { id: c.id, fullName, phone } });
  }

  /* ---------- client ---------- */
  if (path.startsWith('/api/client/')) {
    if (session?.role !== 'client' || !customer(session.id)) return fail('יש להתחבר מחדש', 401);
    const me = session.id;

    if (path === '/api/client/days' && method === 'GET') {
      return ok(freeDays());
    }

    if (path === '/api/client/requests' && method === 'GET') {
      return ok(sorted(state.requests.filter((r) => r.customer_id === me)).filter((r) => r.date >= today));
    }

    if (path === '/api/client/requests' && method === 'POST') {
      const d = day(Number(body.dayId));
      if (
        !d ||
        !d.open ||
        !d.slots.includes(body.time) ||
        takenTimes(d.id).has(body.time) ||
        minutesUntil(d.date, body.time, ctx.now) <= 0
      ) {
        return fail('השעה הזו כבר לא פנויה, נא לבחור שעה אחרת');
      }
      if (customer(me)!.blocked) return fail('לא ניתן לשלוח בקשה כרגע. אפשר לפנות לטופז ישירות', 403);
      if (state.requests.some((r) => r.day_id === d.id && r.customer_id === me && ACTIVE.includes(r.status)))
        return fail('כבר שלחת בקשה ליום הזה');
      const extras: Extras = body.extras ?? {};
      const price = priceOf(state, body.service, extras);
      if (price == null) return fail('נא לבחור טיפול');
      const status = state.settings.autoApprove ? 'approved' : 'pending';
      const id = nextId();
      state.requests.push({
        id,
        day_id: d.id,
        customer_id: me,
        time: body.time,
        service: body.service,
        extras,
        price,
        note: String(body.note ?? '').slice(0, 300),
        status,
        attended: null,
      });
      return ok({ id, status }, 201);
    }

    if ((m = path.match(/^\/api\/client\/requests\/(\d+)$/)) && method === 'DELETE') {
      const r = state.requests.find((x) => x.id === +m![1] && x.customer_id === me && ACTIVE.includes(x.status));
      if (!r) return fail('לא נמצאה בקשה פעילה', 404);
      const hours = state.settings.cancelHours;
      if (r.status === 'approved' && minutesUntil(day(r.day_id)!.date, r.time, ctx.now) < hours * 60) {
        return fail(`אפשר לבטל עד ${hours} שעות לפני התור. לביטול עכשיו כתבי לטופז`, 409);
      }
      r.status = 'cancelled';
      return ok();
    }

    if (path === '/api/client/waitlist' && method === 'POST') {
      if (!state.settings.catalog.services.some((s) => s.id === body.service)) return fail('נא לבחור טיפול');
      state.waitlist = state.waitlist.filter((w) => w.customer_id !== me);
      state.waitlist.push({
        id: nextId(),
        customer_id: me,
        service: body.service,
        note: String(body.note ?? '').slice(0, 300),
        created_at: today,
      });
      return ok(undefined, 201);
    }
  }

  /* ---------- admin ---------- */
  if (path.startsWith('/api/admin/')) {
    if (session?.role !== 'admin') return fail('יש להתחבר מחדש', 401);

    if (path === '/api/admin/overview' && method === 'GET') {
      const all = sorted(state.requests);
      const month = today.slice(0, 7);
      const monthRows = all.filter((r) => r.status === 'approved' && r.date.slice(0, 7) === month);
      const byService = new Map<string, { count: number; income: number }>();
      for (const r of monthRows) {
        const s = byService.get(r.service) ?? { count: 0, income: 0 };
        s.count++;
        s.income += r.price;
        byService.set(r.service, s);
      }
      // Regulars who were last here three or more weeks ago and have nothing booked: worth a message.
      const cutoff = addDays(today, -21);
      const due = state.customers
        .filter((c) => !c.blocked)
        .flatMap((c) => {
          const mine = all.filter((r) => r.customerId === c.id);
          const past = mine
            .filter((r) => r.status === 'approved' && r.date < today)
            .map((r) => r.date)
            .sort();
          const booked = mine.some((r) => ACTIVE.includes(r.status) && r.date >= today);
          const last = past.at(-1);
          return last && !booked && last <= cutoff
            ? [{ id: c.id, fullName: c.full_name, phone: c.phone, lastVisit: last }]
            : [];
        });
      return ok({
        pending: all.filter((r) => r.status === 'pending' && r.date >= today),
        upcoming: all.filter((r) => r.status === 'approved' && (r.date > today || (r.date === today && r.time >= now))),
        reschedule: all.filter((r) => r.status === 'rejected' && r.date >= today),
        toMark: all.filter(
          (r) =>
            r.status === 'approved' && r.attended === null && (r.date < today || (r.date === today && r.time < now)),
        ),
        due,
        waitlist: state.waitlist.flatMap((w) => {
          const c = customer(w.customer_id);
          return c
            ? [
                {
                  id: w.id,
                  service: w.service,
                  note: w.note,
                  createdAt: w.created_at,
                  customerId: c.id,
                  fullName: c.full_name,
                  phone: c.phone,
                },
              ]
            : [];
        }),
        month: {
          count: monthRows.length,
          income: monthRows.reduce((a, r) => a + r.price, 0),
          byService: [...byService].map(([service, v]) => ({ service, ...v })).sort((a, b) => b.income - a.income),
          bookings: monthRows,
        },
      });
    }

    if (path === '/api/admin/days' && method === 'GET') {
      return ok(
        state.days
          .filter((d) => d.date.slice(0, 7) >= today.slice(0, 7))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => {
            const rs = state.requests.filter((r) => r.day_id === d.id);
            return {
              id: d.id,
              date: d.date,
              isOpen: !!d.open,
              slots: [...d.slots].sort(),
              pending: rs.filter((r) => r.status === 'pending').length,
              approved: rs.filter((r) => r.status === 'approved').length,
            };
          }),
      );
    }

    if (path === '/api/admin/days' && method === 'POST') {
      const slots = cleanSlots(body.slots);
      if (!isDate(body.date) || body.date < today) return fail('תאריך לא תקין');
      if (!slots.length) return fail('נא לבחור לפחות שעה אחת');
      const existing = state.days.find((d) => d.date === body.date);
      if (existing?.open) return fail('היום הזה כבר פתוח');
      // A day can already exist closed, created by a booking Topaz entered by hand: open it instead of duplicating it.
      if (existing) {
        existing.open = 1;
        existing.slots = [...new Set([...existing.slots, ...slots])].sort();
        return ok({ id: existing.id }, 201);
      }
      const id = nextId();
      state.days.push({ id, date: body.date, open: 1, slots });
      return ok({ id }, 201);
    }

    if ((m = path.match(/^\/api\/admin\/days\/(\d+)\/requests$/)) && method === 'GET') {
      return ok(sorted(state.requests.filter((r) => r.day_id === +m![1])));
    }

    if ((m = path.match(/^\/api\/admin\/days\/(\d+)$/))) {
      const d = day(+m[1]);
      if (!d) return fail('היום לא נמצא', 404);
      if (method === 'DELETE') {
        state.days = state.days.filter((x) => x.id !== d.id);
        state.requests = state.requests.filter((r) => r.day_id !== d.id);
        return ok();
      }
      if (method === 'PATCH') {
        if (body.slots !== undefined) {
          const slots = cleanSlots(body.slots);
          if (!slots.length) return fail('נא לבחור לפחות שעה אחת');
          d.slots = slots;
        }
        if (typeof body.isOpen === 'boolean') d.open = body.isOpen ? 1 : 0;
        return ok();
      }
    }

    if ((m = path.match(/^\/api\/admin\/requests\/(\d+)\/attendance$/)) && method === 'PATCH') {
      const r = state.requests.find((x) => x.id === +m![1]);
      if (!r) return fail('התור לא נמצא', 404);
      r.attended = body.attended === null ? null : body.attended ? 1 : 0;
      return ok();
    }

    if ((m = path.match(/^\/api\/admin\/requests\/(\d+)\/move$/)) && method === 'POST') {
      const r = state.requests.find((x) => x.id === +m![1]);
      if (!r || r.status === 'cancelled') return fail('הבקשה בוטלה על ידי הלקוחה', 409);
      if (!isDate(body.date) || body.date < today) return fail('תאריך לא תקין');
      if (!isTime(body.time)) return fail('שעה לא תקינה');
      const d = dayFor(body.date, body.time);
      if (
        state.requests.some(
          (x) => x.id !== r.id && x.day_id === d.id && x.time === body.time && x.status === 'approved',
        )
      ) {
        return fail('בשעה הזו כבר יש תור מאושר');
      }
      Object.assign(r, { day_id: d.id, time: body.time, status: 'approved' });
      return ok({ ok: true, dayId: d.id });
    }

    if ((m = path.match(/^\/api\/admin\/requests\/(\d+)$/))) {
      const r = state.requests.find((x) => x.id === +m![1]);
      if (method === 'DELETE') {
        if (r) r.status = 'cancelled';
        return ok();
      }
      if (method === 'PATCH') {
        if (!r || r.status === 'cancelled') return fail('הבקשה בוטלה על ידי הלקוחה', 409);
        if (body.status !== 'approved' && body.status !== 'rejected') return fail('סטטוס לא תקין');
        if (
          body.status === 'approved' &&
          state.requests.some(
            (x) => x.id !== r.id && x.day_id === r.day_id && x.time === r.time && x.status === 'approved',
          )
        ) {
          return fail('כבר אישרת לקוחה אחרת בשעה הזו', 409);
        }
        r.status = body.status;
        return ok();
      }
    }

    if (path === '/api/admin/bookings' && method === 'POST') {
      const fullName = String(body.fullName ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60);
      const phone = cleanPhone(body.phone);
      if (!fullName) return fail('נא להזין שם');
      if (!isPhone(phone)) return fail('מספר טלפון לא תקין');
      if (!isDate(body.date) || body.date < today) return fail('תאריך לא תקין');
      if (!isTime(body.time)) return fail('שעה לא תקינה');
      const extras: Extras = body.extras ?? {};
      const price = priceOf(state, body.service, extras);
      if (price == null) return fail('נא לבחור טיפול');
      const c = findOrCreateCustomer(fullName, phone);
      const d = dayFor(body.date, body.time);
      state.requests.push({
        id: nextId(),
        day_id: d.id,
        customer_id: c.id,
        time: body.time,
        service: body.service,
        extras,
        price,
        note: String(body.note ?? '').slice(0, 300),
        status: 'approved',
        attended: null,
      });
      state.waitlist = state.waitlist.filter((w) => w.customer_id !== c.id);
      return ok({ dayId: d.id }, 201);
    }

    if ((m = path.match(/^\/api\/admin\/waitlist\/(\d+)$/)) && method === 'DELETE') {
      state.waitlist = state.waitlist.filter((w) => w.id !== +m![1]);
      return ok();
    }

    if (path === '/api/admin/customers' && method === 'GET') {
      return ok(
        state.customers
          .map((c) => {
            const rs = state.requests.filter((r) => r.customer_id === c.id);
            const visits = rs
              .filter((r) => r.status === 'approved')
              .map((r) => day(r.day_id)!.date)
              .filter((d) => d < today)
              .sort();
            return {
              id: c.id,
              fullName: c.full_name,
              phone: c.phone,
              blocked: !!c.blocked,
              createdAt: c.created_at,
              total: rs.length,
              approved: rs.filter((r) => r.status === 'approved').length,
              lastVisit: visits.at(-1) ?? null,
            };
          })
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'he')),
      );
    }

    if ((m = path.match(/^\/api\/admin\/customers\/(\d+)$/))) {
      const c = customer(+m[1]);
      if (!c) return fail('לקוחה לא נמצאה', 404);
      if (method === 'PATCH') {
        if (typeof body.note === 'string') c.note = body.note.slice(0, 500);
        if (typeof body.blocked === 'boolean') c.blocked = body.blocked ? 1 : 0;
        return ok();
      }
      if (method === 'GET') {
        const history = sorted(state.requests.filter((r) => r.customer_id === c.id)).reverse();
        const past = history.filter((h) => h.status === 'approved' && h.date < today && h.attended !== false);
        return ok({
          id: c.id,
          fullName: c.full_name,
          phone: c.phone,
          note: c.note,
          blocked: !!c.blocked,
          createdAt: c.created_at,
          history,
          stats: {
            visits: past.length,
            spent: past.reduce((a, h) => a + h.price, 0),
            cancelled: history.filter((h) => h.status === 'cancelled').length,
            noShows: history.filter((h) => h.attended === false).length,
          },
        });
      }
    }

    if (path === '/api/admin/settings') {
      const s = state.settings;
      if (method === 'PATCH') {
        if (typeof body.phone === 'string') s.phone = cleanPhone(body.phone);
        for (const k of ['address', 'instagram', 'about'] as const)
          if (typeof body[k] === 'string') s[k] = body[k].slice(0, 200);
        if (Number.isFinite(body.cancelHours)) s.cancelHours = Math.min(72, Math.max(0, Math.round(body.cancelHours)));
        if (typeof body.autoApprove === 'boolean') s.autoApprove = body.autoApprove;
        if (body.catalog) {
          const services = (body.catalog.services ?? []).filter((x: any) => x?.name && Number.isFinite(x.price));
          const extras = (body.catalog.extras ?? []).filter((x: any) => x?.name && Number.isFinite(x.price));
          if (!services.length) return fail('המחירון חייב לכלול לפחות טיפול אחד עם שם');
          s.catalog = { services, extras };
        }
      }
      if (method === 'PATCH' || method === 'GET') return ok(s);
    }

    if (path === '/api/admin/gallery' && method === 'POST') {
      const url = String(body.dataUrl ?? '');
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(url)) return fail('אפשר להעלות רק תמונות');
      if (url.length * 0.75 > MAX_PHOTO_BYTES) return fail('התמונה גדולה מדי');
      const photo = { id: nextId(), url };
      state.gallery.push(photo);
      return ok(photo, 201);
    }

    if ((m = path.match(/^\/api\/admin\/gallery\/(\d+)$/)) && method === 'DELETE') {
      state.gallery = state.gallery.filter((g) => g.id !== +m![1]);
      return ok();
    }
  }

  return fail('לא נמצא', 404);
}

/** Requests that change nothing don't need to be saved. */
export const isWrite = (method: string) => method !== 'GET';
