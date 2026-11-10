import type { AdminDay, Api, Extras, Nav, Screen } from '../lib/types';
import { useState } from 'react';
import { todayIL } from '../lib/format';
import { fmtPrice, priceOf } from '../lib/catalog';
import { Head } from './shared';
import { TimeChooser } from './pickers';
import { ServicePicker } from '../components/ServicePicker';

/* ---------- manual booking ---------- */
export function ManualBook({
  api,
  days,
  prefill = {},
  nav,
}: {
  api: Api;
  days: AdminDay[];
  prefill?: Extract<Screen, { name: 'book' }>['prefill'];
  nav: Nav;
}) {
  const upcoming = days.filter((d) => d.date >= todayIL());
  const [fullName, setFullName] = useState(prefill?.fullName ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [date, setDate] = useState(upcoming[0]?.date ?? todayIL());
  const [time, setTime] = useState('');
  const [service, setService] = useState(prefill?.service ?? '');
  const [extras, setExtras] = useState<Extras>({});
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const price = service ? priceOf(service, extras) : null;
  async function save() {
    setErr('');
    setBusy(true);
    try {
      const r = await api('/api/admin/bookings', {
        method: 'POST',
        body: {
          fullName,
          phone,
          date,
          time,
          service,
          extras,
          note,
        },
      });
      await nav.reload();
      nav.go({
        name: 'day',
        id: Number(r.dayId),
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <div className="screen" key="book">
        <Head onBack={nav.home} />
        <h1 className="title">קביעת תור ידנית</h1>
        <p className="subtitle">ללקוחה שהתקשרה או כתבה לך. התור נקבע מיד</p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <div className="fields">
          <div className="field">
            <label htmlFor="b-name">שם</label>
            <input id="b-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="b-phone">טלפון</label>
            <input
              id="b-phone"
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <TimeChooser api={api} days={upcoming} date={date} setDate={setDate} time={time} setTime={setTime} />
        <div className="section">טיפול</div>
        <ServicePicker service={service} setService={setService} extras={extras} setExtras={setExtras} />
        <div
          className="field"
          style={{
            marginTop: 16,
          }}
        >
          <label htmlFor="b-note">הערה</label>
          <input id="b-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="bottom">
          <button className="btn" disabled={busy || !fullName || !phone || !time || !service} onClick={save}>
            {busy ? (
              'קובעת...'
            ) : price && time ? (
              <>
                {'קביעת התור '}
                <span className="btn-meta">{fmtPrice(price.total, price.from)}</span>
              </>
            ) : (
              'מלאי פרטים, שעה וטיפול'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ---------- clients ---------- */
