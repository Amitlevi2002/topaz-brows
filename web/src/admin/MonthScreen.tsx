import type { AdminDay, Nav, Overview } from '../lib/types';
import { useState } from 'react';
import { dateParts, todayIL } from '../lib/format';
import { Head, WEEKDAYS, iso } from './shared';
import { serviceName } from '../lib/catalog';
import { IconBack, IconChevron } from '../components/icons';

export function MonthScreen({ ov, nav }: { ov: Overview; nav: Nav }) {
  const m = ov.month;
  const monthName = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
  }).format(new Date(todayIL() + 'T12:00:00'));
  const max = Math.max(1, ...m.byService.map((s) => s.income));
  return (
    <div className="app">
      <div className="screen" key="month">
        <Head onBack={nav.home} />
        <h1 className="title">{monthName}</h1>
        <p className="subtitle">הכנסה משוערת לפי התורים המאושרים</p>
        <div className="big-number">
          <b>
            {m.income.toLocaleString('he-IL')}
            {' \u20AA'}
          </b>
          <span>
            {m.count}
            {' תורים'}
          </span>
        </div>
        {m.byService.length > 0 && (
          <>
            <div className="section">לפי טיפול</div>
            <div className="bars">
              {m.byService.map((s) => (
                <div key={s.service} className="bar-row">
                  <div className="bar-label">
                    <span>{serviceName(s.service)}</span>
                    <b>
                      {s.income.toLocaleString('he-IL')}
                      {' \u20AA \u00B7 '}
                      {s.count}
                    </b>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${(s.income / max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {m.bookings.length > 0 && (
          <>
            <div className="section">כל התורים החודש</div>
            <div className="list">
              {m.bookings.map((r) => (
                <div className="row" key={r.id}>
                  <div className="cal">
                    <b>{dateParts(r.date).num}</b>
                    <small>{dateParts(r.date).mon}</small>
                  </div>
                  <div className="main">
                    <b>{r.fullName}</b>
                    <span>
                      {serviceName(r.service)}
                      {' \u00B7 '}
                      <span className="ltr">{r.time}</span>
                    </span>
                  </div>
                  <b>
                    {r.price}
                    {' \u20AA'}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/* ---------- calendar ---------- */

export function MonthCalendar({ days, onPick }: { days: AdminDay[]; onPick: (date: string, day?: AdminDay) => void }) {
  const today = todayIL();
  const [month, setMonth] = useState(() => {
    const d = new Date(today + 'T12:00:00');
    return new Date(d.getFullYear(), d.getMonth(), 1, 12);
  });
  const byDay = new Map(days.map((d) => [d.date, d]));
  const isCurrent = iso(month).slice(0, 7) === today.slice(0, 7);
  const cells = Array(month.getDay()).fill(null);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= count; i++) cells.push(iso(new Date(month.getFullYear(), month.getMonth(), i, 12)));
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1, 12));
  const openCount = cells.filter((c) => c && c >= today && byDay.get(c)?.isOpen).length;
  return (
    <div className="calendar">
      <div className="cal-head">
        <button
          className="icon"
          onClick={() => shift(-1)}
          disabled={isCurrent}
          aria-label="חודש קודם"
          style={
            isCurrent
              ? {
                  opacity: 0.25,
                }
              : undefined
          }
        >
          <IconBack />
        </button>
        <div>
          <b>
            {new Intl.DateTimeFormat('he-IL', {
              month: 'long',
              year: 'numeric',
            }).format(month)}
          </b>
          <small>{openCount ? `${openCount} ימים פתוחים` : 'לחצי על תאריך כדי לפתוח אותו'}</small>
        </div>
        <button className="icon" onClick={() => shift(1)} aria-label="חודש הבא">
          <IconChevron />
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="wd">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`x${i}`} />;
          const d = byDay.get(date) ?? null;
          const past = date < today;
          const cls = [
            'cell',
            d ? (d.isOpen ? 'open' : 'held') : '',
            date === today ? 'now' : '',
            past ? 'past' : '',
          ].join(' ');
          return (
            <button
              key={date}
              className={cls}
              disabled={past && !d}
              onClick={() => onPick(date, d ?? undefined)}
              aria-label={`${dateParts(date).dow} ${Number(date.slice(8))}${d ? `, ${d.slots.length} שעות, ${d.approved} תורים` : ''}`}
            >
              <span className="n">{Number(date.slice(8))}</span>
              {d && (
                <span className="s">
                  {d.approved}/{d.slots.length}
                </span>
              )}
              {d && d.pending > 0 && <span className="p">{d.pending}</span>}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="open" />
          פתוח · תורים/שעות
        </span>
        <span>
          <i className="p" />
          מחכות לאישור
        </span>
      </div>
    </div>
  );
}
/* ---------- slot picker ---------- */
