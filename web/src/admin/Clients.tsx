import type { Api, CustomerProfile, CustomerRow, Info, Nav } from '../lib/types';
import { useState, useEffect } from 'react';
import { Call, Head, WA, firstName, initials } from './shared';
import { dateParts, fmtPhone } from '../lib/format';
import { IconChevron } from '../components/icons';
import { serviceName } from '../lib/catalog';

/* ---------- clients ---------- */
export function Clients({ api, nav }: { api: Api; nav: Nav }) {
  const [list, setList] = useState<CustomerRow[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    api('/api/admin/customers')
      .then(setList)
      .catch((e: any) => setErr(e.message));
  }, []);
  const digits = q.replace(/\D/g, '');
  const shown = (list ?? []).filter(
    (c) => !q.trim() || c.fullName.includes(q.trim()) || (digits && c.phone.includes(digits)),
  );
  return (
    <div className="app">
      <div className="screen" key="clients">
        <Head onBack={nav.home} />
        <h1 className="title">לקוחות</h1>
        <p className="subtitle">{list ? `${list.length} לקוחות רשומות` : ' '}</p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <input
          id="search"
          className="input"
          placeholder="חיפוש לפי שם או טלפון"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            marginBottom: 14,
          }}
        />
        {list === null ? (
          <div className="empty">טוען...</div>
        ) : shown.length === 0 ? (
          <div className="empty">{list.length ? 'לא נמצאה לקוחה' : 'עוד אין לקוחות'}</div>
        ) : (
          <div className="list">
            {shown.map((c) => (
              <button
                className="row"
                key={c.id}
                onClick={() =>
                  nav.go({
                    name: 'client',
                    id: c.id,
                  })
                }
              >
                <div className="avatar">{initials(c.fullName)}</div>
                <div className="main">
                  <b>
                    {c.fullName}
                    {c.blocked ? ' · חסומה' : ''}
                  </b>
                  <span className="ltr">{fmtPhone(c.phone)}</span>
                </div>
                <span className="hint">
                  {c.approved}
                  {' תורים'}
                </span>
                <IconChevron />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientProfile({ api, id, info, nav }: { api: Api; id: number; info: Info; nav: Nav }) {
  const [p, setP] = useState<CustomerProfile | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const load = () =>
    api(`/api/admin/customers/${id}`)
      .then((x) => {
        setP(x);
        setNote(x.note);
      })
      .catch((e: any) => setErr(e.message));
  useEffect(() => {
    load();
  }, [id]);
  async function patch(body) {
    try {
      await api(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        body,
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  const STATUS = {
    pending: 'ממתין',
    approved: 'מאושר',
    rejected: 'לקבוע מחדש',
    cancelled: 'בוטל',
  };
  return (
    <div className="app">
      <div className="screen" key={`client-${id}`}>
        <Head
          onBack={() =>
            nav.go({
              name: 'clients',
            })
          }
        />
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        {!p ? (
          <div className="empty">טוען...</div>
        ) : (
          <>
            <div className="profile-head">
              <div className="avatar big">{initials(p.fullName)}</div>
              <h1
                className="title"
                style={{
                  margin: 0,
                }}
              >
                {p.fullName}
              </h1>
              <div
                className="mini-row"
                style={{
                  justifyContent: 'center',
                }}
              >
                <Call phone={p.phone} />
                <WA phone={p.phone} text={`היי ${firstName(p.fullName)} 🤍`} />
              </div>
            </div>
            <div className="stats4">
              <div>
                <b>{p.stats.visits}</b>
                <span>ביקורים</span>
              </div>
              <div>
                <b>{p.stats.spent.toLocaleString('he-IL')}</b>
                <span>₪ סה״כ</span>
              </div>
              <div>
                <b>{p.stats.cancelled}</b>
                <span>ביטולים</span>
              </div>
              <div className={p.stats.noShows ? 'bad' : ''}>
                <b>{p.stats.noShows}</b>
                <span>לא הגיעה</span>
              </div>
            </div>
            <div className="section">הערות שרק את רואה</div>
            <textarea
              id="c-note"
              className="input"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder="לדוגמה: עור רגיש, אוהבת גבות מלאות"
            />
            {note !== p.note && (
              <button
                className="btn light"
                style={{
                  marginTop: 8,
                }}
                onClick={() =>
                  patch({
                    note,
                  }).then(() => setSaved(true))
                }
              >
                שמירת הערה
              </button>
            )}
            {saved && (
              <p
                className="hint"
                style={{
                  marginTop: 6,
                }}
              >
                נשמר
              </p>
            )}
            <button
              className="btn"
              style={{
                marginTop: 20,
              }}
              onClick={() =>
                nav.go({
                  name: 'book',
                  prefill: {
                    fullName: p.fullName,
                    phone: p.phone,
                  },
                })
              }
            >
              קביעת תור ל{firstName(p.fullName)}
            </button>
            <div className="section">היסטוריה</div>
            {p.history.length === 0 ? (
              <div
                className="empty"
                style={{
                  padding: '12px 0',
                }}
              >
                אין עדיין
              </div>
            ) : (
              <div className="list">
                {p.history.map((h) => (
                  <div className="row" key={h.id}>
                    <div className="cal">
                      <b>{dateParts(h.date).num}</b>
                      <small>{dateParts(h.date).mon}</small>
                    </div>
                    <div className="main">
                      <b>{serviceName(h.service)}</b>
                      <span>
                        <span className="ltr">{h.time}</span>
                        {' \u00B7 '}
                        {h.price}
                        {' \u20AA \u00B7 '}
                        {h.attended === false ? 'לא הגיעה' : STATUS[h.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="small-actions">
              <button
                className={`link ${p.blocked ? '' : 'danger'}`}
                onClick={() =>
                  patch({
                    blocked: !p.blocked,
                  })
                }
              >
                {p.blocked ? 'ביטול חסימה' : 'חסימה (לא תוכל לשלוח בקשות)'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/* ---------- settings: details, rules, price list, gallery ---------- */
