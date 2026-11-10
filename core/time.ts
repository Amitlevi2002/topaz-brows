// The studio works on Israel time no matter where the server runs.
const TZ = 'Asia/Jerusalem';

export const todayIn = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

export const timeIn = (now: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

/** "2026-11-02" shifted by n days. */
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Minutes from `now` until date+time, both read as Israel wall-clock time. Negative when it has passed. */
export function minutesUntil(date: string, time: string, now: Date) {
  const wall = (d: string, t: string) =>
    Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5));
  return (wall(date, time) - wall(todayIn(now), timeIn(now))) / 60000;
}
