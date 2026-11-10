import type { AdminDay, Api, Nav, RequestView } from '../lib/types';
import { useState } from 'react';
import { dateParts, dayLabel, todayIL, waLink } from '../lib/format';
import { Head, MSG, firstName } from './shared';
import { IconChat } from '../components/icons';
import { serviceName } from '../lib/catalog';
import { TimeChooser } from './pickers';

/* ---------- give a client another time ---------- */
export function Reschedule({ api, req, days, nav }: { api: Api; req: RequestView; days: AdminDay[]; nav: Nav }) {
  const [date, setDate] = useState(days[0]?.date ?? todayIL());
  const [time, setTime] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [askRemove, setAskRemove] = useState(false);
  const [done, setDone] = useState<{ dayId: number } | null>(null);
  async function save() {
    setErr('');
    setBusy(true);
    try {
      setDone({
        dayId: Number(
          (
            await api(`/api/admin/requests/${req.id}/move`, {
              method: 'POST',
              body: {
                date,
                time,
              },
            })
          ).dayId,
        ),
      });
      nav.reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    try {
      await api(`/api/admin/requests/${req.id}`, {
        method: 'DELETE',
      });
      nav.home();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  if (done)
    return (
      <div className="app">
        <div className="screen" key="moved">
          <div className="done">
            <div className="ring">✓</div>
            <h1 className="title">נקבע ל{firstName(req.fullName)}</h1>
            <p className="subtitle">
              {dayLabel(date)}
              {' \u00B7 '}
              <span className="ltr">{time}</span>
            </p>
          </div>
          <div className="bottom">
            <a
              className="btn wa-btn"
              href={waLink(req.phone, MSG.moved(req, date, time))}
              target="_blank"
              rel="noreferrer"
            >
              <IconChat />
              לעדכן אותה בוואטסאפ
            </a>
            <button
              className="link"
              onClick={() =>
                nav.go({
                  name: 'day',
                  id: done.dayId,
                })
              }
            >
              ליום הזה ביומן
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="app">
      <div className="screen" key={`move-${req.id}`}>
        <Head onBack={nav.home} />
        <h1 className="title">מועד אחר ל{firstName(req.fullName)}</h1>
        <p className="subtitle">
          {serviceName(req.service)}
          {' \u00B7 ביקשה '}
          {dayLabel(req.date)}
          {' ב-'}
          <span className="ltr">{req.time}</span>
        </p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <TimeChooser api={api} days={days} date={date} setDate={setDate} time={time} setTime={setTime} />
        <div className="bottom">
          <button className="btn" disabled={!time || busy} onClick={save}>
            {busy ? 'קובעת...' : time ? `קביעה ל${dateParts(date).dow} ${time}` : 'בחרי יום ושעה'}
          </button>
          {askRemove ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <button className="link" onClick={() => setAskRemove(false)}>
                לא
              </button>
              <button className="link danger" onClick={remove}>
                כן, להסיר מהרשימה
              </button>
            </div>
          ) : (
            <button className="link" onClick={() => setAskRemove(true)}>
              להסיר מהרשימה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
/* ---------- open a day from the calendar ---------- */
