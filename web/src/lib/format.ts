// ---------- formatting ----------
export function todayIL() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
  }).format(new Date());
}

export function nowTimeIL() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  const label = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  if (iso === todayIL()) return `היום · ${label}`;
  const t = new Date(todayIL() + 'T12:00:00');
  t.setDate(t.getDate() + 1);
  if (iso === t.toISOString().slice(0, 10)) return `מחר · ${label}`;
  return label;
}

export const DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export function dateParts(iso) {
  const d = new Date(iso + 'T12:00:00');
  const rel = iso === todayIL() ? 'היום' : iso === addDays(todayIL(), 1) ? 'מחר' : '';
  return {
    dow: rel || `יום ${DOW[d.getDay()]}`,
    num: d.getDate(),
    mon: new Intl.DateTimeFormat('he-IL', {
      month: 'short',
    }).format(d),
  };
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtPhone(p) {
  return p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}
/** 15-minute slots from start (inclusive) to end (exclusive). */

/** 15-minute slots from start (inclusive) to end (exclusive). */
export function slots(start, end, step = 15) {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: string[] = [];
  for (let m = toMin(start); m < toMin(end); m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}
/** wa.me link: opens a WhatsApp chat with the client (Topaz sends it herself — free, nothing automatic). */

/** wa.me link: opens a WhatsApp chat with the client (Topaz sends it herself — free, nothing automatic). */
export function waLink(phone, text = '') {
  const intl = '972' + phone.replace(/\D/g, '').replace(/^0/, '');
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
/** Minutes from now (Israel time) until date+time. */

/** Minutes from now (Israel time) until date+time. */
export function minutesUntil(date, time) {
  const toMin = (d, t) =>
    Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5)) / 60000;
  return toMin(date, time) - toMin(todayIL(), nowTimeIL());
}
/** "יום ד׳ 21 באוק׳" — the wording used in messages. */

/** "יום ד׳ 21 באוק׳" — the wording used in messages. */
export function dayLabel(iso) {
  const p = dateParts(iso);
  return `${p.dow} ${p.num} ${p.mon}`;
}
/** .ics file so a client can add her booking to her phone's calendar. */

/** .ics file so a client can add her booking to her phone's calendar. */
export function icsFor(date, time, title, location) {
  const d = date.replace(/-/g, ''),
    t = time.replace(':', '') + '00';
  const endH = String(Math.min(23, +time.slice(0, 2) + 2)).padStart(2, '0');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TopazEyebrows//HE',
    'BEGIN:VEVENT',
    `UID:${d}${t}-${Math.random().toString(36).slice(2)}@topazeyebrows`,
    `DTSTART;TZID=Asia/Jerusalem:${d}T${t}`,
    `DTEND;TZID=Asia/Jerusalem:${d}T${endH}${time.slice(3)}00`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת לתור',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export const STATUS_LABEL = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'טופז תקבע לך מועד אחר',
  cancelled: 'בוטל',
};
