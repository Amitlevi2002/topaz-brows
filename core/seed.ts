// Starting data: the real studio starts from `emptyState`, the demo from `demoState`.
import type { Catalog, Settings, State } from './types';
import { addDays, todayIn } from './time';
import { priceOf } from './handler';

export const DEFAULT_CATALOG: Catalog = {
  services: [
    { id: 'design', name: 'עיצוב ושיקום גבות טבעיות', price: 60 },
    { id: 'lift', name: 'הרמת גבות', price: 180 },
    { id: 'sideburns', name: 'פאות פנים', price: 20 },
    { id: 'lip', name: 'שפם', price: 10 },
    { id: 'nose', name: 'אף', price: 5 },
  ],
  extras: [
    { id: 'lip', name: 'שפם', price: 10, perNail: false },
    { id: 'nose', name: 'אף', price: 5, perNail: false },
    { id: 'tint', name: 'צבע', price: 10, perNail: false },
    { id: 'sideburns', name: 'פאות פנים', price: 20, perNail: false },
  ],
};

const settings = (over: Partial<Settings> = {}): Settings => ({
  phone: '',
  address: '',
  instagram: '',
  about: '',
  cancelHours: 3,
  autoApprove: false,
  catalog: structuredClone(DEFAULT_CATALOG),
  ...over,
});

export const emptyState = (): State => ({
  settings: settings(),
  customers: [],
  days: [],
  requests: [],
  waitlist: [],
  gallery: [],
  nextId: 1,
});

/** A believable month around `now`: open days ahead, a few requests waiting, history to look at. */
export function demoState(now: Date, photos: string[], studio: Partial<Settings> = {}): State {
  const today = todayIn(now);
  const at = (n: number) => addDays(today, n);
  const state: State = {
    settings: settings({ about: 'עיצוב ושיקום גבות טבעיות · הרמת גבות · שפם ופאות', ...studio }),
    customers: [
      ['נועה אברהם', '0521112233', 'גבות דקות מטבען, לא לקצר בקצוות'],
      ['שירה לוי', '0547778899', ''],
      ['מאיה כהן', '0503334455', ''],
      ['יעל מזרחי', '0586665544', ''],
      ['רוני דהן', '0529990011', ''],
      ['הילה מזרחי', '0532223344', ''],
    ].map(([full_name, phone, note], i) => ({
      id: i + 1,
      full_name,
      phone,
      note,
      blocked: 0 as const,
      created_at: at(-60 + i * 7),
    })),
    days: [
      { id: 10, date: at(-26), open: 0, slots: ['11:00', '14:00'] },
      { id: 11, date: at(-2), open: 0, slots: ['10:00', '13:00', '16:00'] },
      { id: 12, date: at(2), open: 1, slots: ['10:00', '15:00', '17:30'] },
      { id: 13, date: at(4), open: 1, slots: ['11:00', '13:00', '15:30', '18:00'] },
      { id: 14, date: at(9), open: 1, slots: ['09:30', '12:00', '16:00'] },
    ],
    requests: [],
    waitlist: [{ id: 30, customer_id: 4, service: 'lift', note: 'ימים א׳-ג׳ אחרי 16:00', created_at: today }],
    gallery: photos.map((url, i) => ({ id: i + 1, url })),
    nextId: 100,
  };
  const book = (
    id: number,
    day_id: number,
    customer_id: number,
    time: string,
    service: string,
    extras: Record<string, number>,
    status: any,
    note = '',
    attended: 0 | 1 | null = null,
  ) =>
    state.requests.push({
      id,
      day_id,
      customer_id,
      time,
      service,
      extras,
      price: priceOf(state, service, extras)!,
      note,
      status,
      attended,
    });
  book(20, 10, 6, '11:00', 'design', {}, 'approved', '', 1);
  book(21, 11, 2, '10:00', 'design', { lip: 1 }, 'approved');
  book(22, 11, 3, '13:00', 'lift', {}, 'approved');
  book(23, 12, 1, '10:00', 'design', { lip: 1, nose: 1 }, 'pending');
  book(24, 12, 2, '15:00', 'design', { tint: 1 }, 'approved');
  book(25, 12, 4, '10:00', 'lift', { lip: 1 }, 'pending', 'פעם ראשונה');
  book(26, 13, 3, '13:00', 'design', {}, 'approved');
  book(27, 12, 5, '17:30', 'sideburns', {}, 'rejected');
  return state;
}
