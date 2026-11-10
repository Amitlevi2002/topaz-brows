import type { AdminDay, Api, Info, Nav, RequestView } from '../lib/types';
import { useState, useEffect } from 'react';
import { dateParts, todayIL } from '../lib/format';
import { Head } from './shared';
import { SlotChips, SlotPicker } from './pickers';
import { BookingRow, ReqCard } from './cards';

/* ---------- one day ---------- */
export function DayScreen({ api, day, info, nav }: { api: Api; day: AdminDay; info: Info; nav: Nav }) {
  const [reqs, setReqs] = useState<RequestView[] | null>(null);
  const [err, setErr] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(day.slots);
  const p = dateParts(day.date);
  const past = day.date < todayIL();
  const load = () =>
    api(`/api/admin/days/${day.id}/requests`)
      .then(setReqs)
      .catch((e: any) => setErr(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [day.id]);
  const changed = () => {
    load();
    nav.reload();
  };
  async function patch(body) {
    try {
      await api(`/api/admin/days/${day.id}`, {
        method: 'PATCH',
        body,
      });
      setEditing(false);
      nav.reload();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function remove() {
    try {
      await api(`/api/admin/days/${day.id}`, {
        method: 'DELETE',
      });
      nav.home();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  const withDate = (r) => ({
    ...r,
    date: day.date,
  });
  const pending = (reqs ?? []).filter((r) => r.status === 'pending').map(withDate);
  const approved = (reqs ?? []).filter((r) => r.status === 'approved').map(withDate);
  const taken = new Set(approved.map((r) => r.time));
  const income = approved.reduce((s, r) => s + r.price, 0);
  return (
    <div className="app">
      <div className="screen" key={`day-${day.id}`}>
        <Head onBack={nav.home} />
        <h1 className="title">
          {p.dow} {p.num} {p.mon}
        </h1>
        <p className="subtitle">
          {approved.length}
          {' תורים \u00B7 '}
          {income}
          {' \u20AA'}
          {!day.isOpen ? ' · סגור לבקשות' : ''}
        </p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        {editing ? (
          <div className="panel">
            <b>השעות שפתוחות ביום הזה</b>
            <SlotPicker value={sel} onChange={setSel} locked={taken} />
            <button
              className="btn"
              disabled={!sel.length}
              onClick={() =>
                patch({
                  slots: sel,
                })
              }
            >
              שמירה
            </button>
            <button
              className="link"
              onClick={() => {
                setSel(day.slots);
                setEditing(false);
              }}
            >
              ביטול
            </button>
          </div>
        ) : (
          <div className="slots-line">
            <SlotChips slots={day.slots} />
            {!past && (
              <button className="link" onClick={() => setEditing(true)}>
                עריכה
              </button>
            )}
          </div>
        )}
        {reqs === null ? (
          <div className="empty">טוען...</div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <div className="section">מחכות לאישור ({pending.length})</div>
                <div className="list">
                  {pending.map((r) => (
                    <ReqCard
                      key={r.id}
                      api={api}
                      r={r}
                      clash={taken.has(r.time)}
                      onDone={changed}
                      onReschedule={(x) =>
                        nav.go({
                          name: 'move',
                          req: x,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            <div className="section">תורים ({approved.length})</div>
            {approved.length === 0 ? (
              <div
                className="empty"
                style={{
                  padding: '16px 0',
                }}
              >
                עדיין אין
              </div>
            ) : (
              <div className="list">
                {approved.map((r) => (
                  <BookingRow key={r.id} api={api} r={r} address={info.address} onChanged={changed} />
                ))}
              </div>
            )}
          </>
        )}
        {!past && (
          <div className="small-actions">
            <button
              className="link"
              onClick={() =>
                patch({
                  isOpen: !day.isOpen,
                })
              }
            >
              {day.isOpen ? 'הפסקת קבלת בקשות' : 'פתיחה מחדש לבקשות'}
            </button>
            {askDelete ? (
              <>
                <button className="link" onClick={() => setAskDelete(false)}>
                  לא
                </button>
                <button className="link danger" onClick={remove}>
                  כן, למחוק את היום
                </button>
              </>
            ) : (
              <button className="link danger" onClick={() => setAskDelete(true)}>
                מחיקת היום
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
/* ---------- time chooser used by reschedule + manual booking ---------- */

/* ---------- open a day from the calendar ---------- */
export function OpenDay({ api, initialDate, nav }: { api: Api; initialDate?: string; nav: Nav }) {
  const [sel, setSel] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const p = dateParts(initialDate);
  async function submit() {
    setErr('');
    setBusy(true);
    try {
      const r = await api('/api/admin/days', {
        method: 'POST',
        body: {
          date: initialDate,
          slots: sel,
        },
      });
      await nav.reload();
      nav.go({
        name: 'day',
        id: Number(r.id),
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <div className="screen" key="open">
        <Head onBack={nav.home} />
        <h1 className="title">
          {p.dow} {p.num} {p.mon}
        </h1>
        <p className="subtitle">סמני את השעות שאת פותחת ביום הזה</p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <SlotPicker value={sel} onChange={setSel} />
        <div className="bottom">
          <button className="btn" disabled={busy || !sel.length} onClick={submit}>
            {busy ? 'פותחת...' : sel.length ? `פרסום ${sel.length} שעות ללקוחות` : 'סמני שעות'}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ---------- manual booking ---------- */
