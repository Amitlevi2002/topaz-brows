import type { AdminDay, Api } from '../lib/types';
import { useState, useEffect } from 'react';
import { GRID } from './shared';
import { dateParts, nowTimeIL, todayIL } from '../lib/format';

export function SlotPicker({
  value,
  onChange,
  locked = new Set<string>(),
}: {
  value: string[];
  onChange: (v: string[]) => void;
  locked?: Set<string>;
}) {
  const [custom, setCustom] = useState('');
  const all = [...new Set([...GRID, ...value])].sort();
  const toggle = (t) => {
    if (!locked.has(t)) onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t].sort());
  };
  return (
    <div className="picker">
      <div className="times four">
        {all.map((t) => (
          <button
            type="button"
            key={t}
            className={`time ${value.includes(t) ? 'on' : ''}`}
            aria-pressed={value.includes(t)}
            title={locked.has(t) ? 'יש תור מאושר בשעה הזו' : undefined}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="custom">
        <input
          className="input"
          type="time"
          aria-label="שעה אחרת"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          type="button"
          className="btn light"
          disabled={!custom}
          onClick={() => {
            if (!value.includes(custom)) onChange([...value, custom].sort());
            setCustom('');
          }}
        >
          הוספת שעה
        </button>
      </div>
    </div>
  );
}

export const SlotChips = ({ slots }: { slots: string[] }) => (
  <div className="chips">
    {slots.map((t) => (
      <span key={t} className="ltr">
        {t}
      </span>
    ))}
  </div>
);
/* ---------- one day ---------- */

/* ---------- time chooser used by reschedule + manual booking ---------- */
export function TimeChooser({
  api,
  days,
  date,
  setDate,
  time,
  setTime,
}: {
  api: Api;
  days: AdminDay[];
  date: string;
  setDate: (d: string) => void;
  time: string;
  setTime: (t: string) => void;
}) {
  const [taken, setTaken] = useState(new Set());
  const [custom, setCustom] = useState('');
  const day = days.find((d) => d.date === date);
  useEffect(() => {
    setTime('');
    setCustom('');
    setTaken(new Set());
    if (day)
      api(`/api/admin/days/${day.id}/requests`)
        .then((rs) => setTaken(new Set(rs.filter((r) => r.status === 'approved').map((r) => r.time))))
        .catch(() => {});
  }, [date]);
  const free = (day?.slots ?? []).filter((t) => !taken.has(t) && (date !== todayIL() || t > nowTimeIL()));
  return (
    <>
      <div className="section">איזה יום?</div>
      {days.length > 0 && (
        <div className="presets">
          {days.map((d) => {
            const q = dateParts(d.date);
            return (
              <button
                type="button"
                key={d.id}
                className={`preset ${date === d.date ? 'on' : ''}`}
                onClick={() => setDate(d.date)}
              >
                {q.dow} {q.num}
              </button>
            );
          })}
        </div>
      )}
      <div
        className="field"
        style={{
          marginTop: 12,
        }}
      >
        <label htmlFor="t-date">{days.length ? 'או תאריך אחר' : 'תאריך'}</label>
        <input
          id="t-date"
          className="input"
          type="date"
          min={todayIL()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="section">באיזו שעה?</div>
      {free.length > 0 && (
        <div
          className="times"
          style={{
            marginBottom: 12,
          }}
        >
          {free.map((t) => (
            <button
              type="button"
              key={t}
              className={`time ${time === t && !custom ? 'on' : ''}`}
              onClick={() => {
                setTime(t);
                setCustom('');
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="t-time">{free.length ? 'או שעה אחרת' : 'שעה'}</label>
        <input
          id="t-time"
          className="input"
          type="time"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setTime(e.target.value);
          }}
        />
      </div>
    </>
  );
}
/* ---------- give a client another time ---------- */
