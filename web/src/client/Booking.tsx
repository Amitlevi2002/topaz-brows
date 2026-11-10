import type { Api, ClientDay, Extras, Info, RequestView } from '../lib/types';
import { useState, useEffect } from 'react';
import { extrasLabel, fmtPrice, priceOf, serviceName } from '../lib/catalog';
import { STATUS_LABEL, dateParts, dayLabel, icsFor, minutesUntil, waLink } from '../lib/format';
import { Head } from './Head';
import { IconCheck, IconChevron, IconLogout } from '../components/icons';
import { ServicePicker } from '../components/ServicePicker';
import { STUDIO } from '../lib/brand';
import { Steps } from './Steps';
import { StudioInfo } from './StudioInfo';
import { readPick } from './pick';

/* ---------- booking flow ---------- */
export function Booking({
  api,
  info,
  name,
  onLogout,
}: {
  api: Api;
  info: Info;
  name: string;
  onLogout: () => void;
}) {
  const [screen, setScreen] = useState('days');
  const [days, setDays] = useState<ClientDay[] | null>(null);
  const [mine, setMine] = useState<RequestView[]>([]);
  const [day, setDay] = useState<ClientDay | null>(null);
  const [time, setTime] = useState('');
  // she may have put the treatment together on the front page already
  const [service, setService] = useState(() => readPick().service);
  const [extras, setExtras] = useState<Extras>(() => readPick().extras);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false); // auto-approved
  const [waitDone, setWaitDone] = useState(false);
  const [askCancel, setAskCancel] = useState<number | null>(null);
  async function load() {
    try {
      const [d, m] = await Promise.all([api('/api/client/days'), api('/api/client/requests')]);
      setDays(d);
      setMine(m);
    } catch (e: any) {
      setErr(e.message);
      setDays([]);
    }
  }
  useEffect(() => {
    window.scrollTo(0, 0); // she arrives from the bottom of the front page
    load();
  }, []);
  const go = (s) => {
    setErr('');
    setScreen(s);
    window.scrollTo(0, 0);
  };
  const taken = new Set(mine.filter((r) => r.status === 'pending' || r.status === 'approved').map((r) => r.date));
  const price = service ? priceOf(service, extras) : null;
  const first = name.split(' ')[0];
  const reset = () => {
    const pick = readPick();
    setTime('');
    setService(pick.service);
    setExtras(pick.extras);
    setNote('');
  };
  async function send() {
    if (!day || !time || !service) return;
    setErr('');
    setBusy(true);
    try {
      const r = await api('/api/client/requests', {
        method: 'POST',
        body: {
          dayId: day.id,
          time,
          service,
          extras,
          note,
        },
      });
      setBooked(r.status === 'approved');
      setWaitDone(false);
      await load();
      go('done');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id) {
    setAskCancel(null);
    setErr('');
    try {
      await api(`/api/client/requests/${id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function joinWaitlist() {
    setErr('');
    setBusy(true);
    try {
      await api('/api/client/waitlist', {
        method: 'POST',
        body: {
          service,
          note,
        },
      });
      reset();
      setBooked(false);
      setWaitDone(true);
      go('done');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  function addToCalendar(r) {
    const blob = new Blob([icsFor(r.date, r.time, `${STUDIO} · ${serviceName(r.service)}`, info.address)], {
      type: 'text/calendar',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'topaz-eyebrows.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /* 1. day */
  if (screen === 'days')
    return (
      <div className="app">
        <div className="screen" key="days">
          <Head
            end={
              <button className="icon" onClick={onLogout} aria-label="יציאה">
                <IconLogout />
              </button>
            }
          />
          <Steps at={1} />
          <h1 className="title">
            {'היי '}
            {first}, מתי נוח לך?
          </h1>
          <p className="subtitle">בחרי יום מהימים הפתוחים</p>
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          {days === null ? (
            <div className="empty">טוען...</div>
          ) : days.length === 0 ? (
            <div className="empty">
              <b>אין כרגע תורים פנויים</b>אפשר להצטרף לרשימת ההמתנה וטופז תחזור אלייך
            </div>
          ) : (
            <div className="list">
              {days.map((d) => {
                const p = dateParts(d.date);
                const isTaken = taken.has(d.date);
                return (
                  <button
                    key={d.id}
                    className="row"
                    disabled={isTaken}
                    style={
                      isTaken
                        ? {
                            opacity: 0.5,
                          }
                        : undefined
                    }
                    onClick={() => {
                      setDay(d);
                      reset();
                      go('times');
                    }}
                  >
                    <div className="cal">
                      <b>{p.num}</b>
                      <small>{p.mon}</small>
                    </div>
                    <div className="main">
                      <b>{p.dow}</b>
                      <span>{d.slots.length === 1 ? 'שעה אחת פנויה' : `${d.slots.length} שעות פנויות`}</span>
                    </div>
                    {isTaken ? <span className="pill pending">כבר ביקשת</span> : <IconChevron />}
                  </button>
                );
              })}
            </div>
          )}
          <button
            className="link"
            style={{
              marginTop: 14,
            }}
            onClick={() => {
              reset();
              go('waitlist');
            }}
          >
            לא מצאת שעה שמתאימה? רשימת המתנה
          </button>
          <div className="bottom">
            <div className="two">
              <button className="btn light" onClick={() => go('info')}>
                עבודות ומחירון
              </button>
              <button className="btn light" onClick={() => go('mine')}>
                התורים שלי
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  /* 2. time */
  if (screen === 'times' && day) {
    const p = dateParts(day.date);
    return (
      <div className="app">
        <div className="screen" key="times">
          <Head onBack={() => go('days')} />
          <Steps at={2} />
          <h1 className="title">באיזו שעה?</h1>
          <p className="subtitle">
            {p.dow} {p.num} {p.mon}
          </p>
          <div className="times">
            {day.slots.map((t) => (
              <button
                key={t}
                className={`time ${time === t ? 'on' : ''}`}
                aria-pressed={time === t}
                onClick={() => setTime(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn" disabled={!time} onClick={() => go('service')}>
              המשך
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* 3. service */
  if (screen === 'service' && day)
    return (
      <div className="app">
        <div className="screen" key="service">
          <Head onBack={() => go('times')} />
          <Steps at={3} />
          <h1 className="title">מה עושות?</h1>
          <p className="subtitle">בחרי טיפול ותוספות</p>
          <ServicePicker service={service} setService={setService} extras={extras} setExtras={setExtras} />
          <div className="bottom">
            <button className="btn" disabled={!service} onClick={() => go('confirm')}>
              {price ? (
                <>
                  {'המשך '}
                  <span className="btn-meta">{fmtPrice(price.total, price.from)}</span>
                </>
              ) : (
                'בחרי טיפול'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  /* 4. confirm */
  if (screen === 'confirm' && day && price) {
    const ex = extrasLabel(extras);
    return (
      <div className="app">
        <div className="screen" key="confirm">
          <Head onBack={() => go('service')} />
          <Steps at={4} />
          <h1 className="title">הכל נכון?</h1>
          <p className="subtitle">
            {'אפשר לבטל עד '}
            {info.cancelHours}
            {' שעות לפני התור'}
          </p>
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <div className="summary">
            <div>
              <span>מתי</span>
              <b>
                {dayLabel(day.date)}
                {' \u00B7 '}
                <span className="ltr">{time}</span>
              </b>
            </div>
            <div>
              <span>טיפול</span>
              <b>{serviceName(service)}</b>
            </div>
            {ex && (
              <div>
                <span>תוספות</span>
                <b>{ex}</b>
              </div>
            )}
            <div className="total">
              <span>מחיר משוער</span>
              <b>{fmtPrice(price.total, price.from)}</b>
            </div>
          </div>
          <div className="field">
            <label htmlFor="note">הערה לטופז (לא חובה)</label>
            <textarea
              id="note"
              className="input"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="לדוגמה: רוצה גבות קצת יותר עבות"
            />
          </div>
          <div className="bottom">
            <button className="btn" disabled={busy} onClick={send}>
              {busy ? 'שולחת...' : 'שליחה'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* done */
  if (screen === 'done')
    return (
      <div className="app">
        <div className="screen" key="done">
          <div className="done">
            <div className="ring">
              <IconCheck />
            </div>
            <h1 className="title">{waitDone ? 'נרשמת לרשימת ההמתנה' : booked ? 'התור נקבע!' : 'הבקשה נשלחה'}</h1>
            <p className="subtitle">
              {waitDone
                ? 'כשיתפנה מקום טופז תחזור אלייך'
                : booked
                  ? 'מחכה לך 🤍'
                  : 'ברגע שטופז תאשר, תראי את זה ב״התורים שלי״'}
            </p>
          </div>
          <div className="bottom">
            {!waitDone && (
              <button
                className="btn"
                onClick={() => {
                  reset();
                  go('mine');
                }}
              >
                התורים שלי
              </button>
            )}
            <button
              className="link"
              onClick={() => {
                reset();
                setWaitDone(false);
                go('days');
              }}
            >
              חזרה להתחלה
            </button>
          </div>
        </div>
      </div>
    );
  /* studio info */
  if (screen === 'info')
    return (
      <div className="app">
        <div className="screen" key="info">
          <Head onBack={() => go('days')} />
          <h1 className="title">{STUDIO}</h1>
          <p className="subtitle">{info.about}</p>
          <StudioInfo info={info} />
        </div>
      </div>
    );
  /* waitlist */
  if (screen === 'waitlist')
    return (
      <div className="app">
        <div className="screen" key="waitlist">
          <Head onBack={() => go('days')} />
          <h1 className="title">רשימת המתנה</h1>
          <p className="subtitle">כשיתפנה מקום, טופז תחזור אלייך</p>
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <ServicePicker
            service={service}
            setService={setService}
            extras={extras}
            setExtras={setExtras}
            withExtras={false}
          />
          <div
            className="field"
            style={{
              marginTop: 18,
            }}
          >
            <label htmlFor="w-note">מתי נוח לך?</label>
            <textarea
              id="w-note"
              className="input"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="לדוגמה: ימים א׳-ג׳ אחרי 16:00"
            />
          </div>
          <div className="bottom">
            <button className="btn" disabled={!service || busy} onClick={joinWaitlist}>
              הצטרפות לרשימה
            </button>
          </div>
        </div>
      </div>
    );
  /* my bookings */
  const active = mine.filter((r) => r.status !== 'cancelled');
  return (
    <div className="app">
      <div className="screen" key="mine">
        <Head onBack={() => go('days')} />
        <h1 className="title">התורים שלי</h1>
        <p className="subtitle">
          {'ביטול אפשרי עד '}
          {info.cancelHours}
          {' שעות לפני התור'}
        </p>
        {err && (
          <div className="error" role="alert">
            {err}
            {info.phone && (
              <>
                {' \u00B7 '}
                <a href={waLink(info.phone)} target="_blank" rel="noreferrer">
                  לוואטסאפ של טופז
                </a>
              </>
            )}
          </div>
        )}
        {active.length === 0 ? (
          <div className="empty">
            <b>אין לך תורים כרגע</b>
          </div>
        ) : (
          <div className="list">
            {active.map((r) => {
              const p = dateParts(r.date);
              const late = r.status === 'approved' && minutesUntil(r.date, r.time) < info.cancelHours * 60;
              const canCancel = (r.status === 'pending' || r.status === 'approved') && !late;
              return (
                <div
                  className="row"
                  key={r.id}
                  style={{
                    flexWrap: 'wrap',
                  }}
                >
                  <div className="cal">
                    <b>{p.num}</b>
                    <small>{p.mon}</small>
                  </div>
                  <div className="main">
                    <b>
                      {p.dow}
                      {' \u00B7 '}
                      <span className="ltr">{r.time}</span>
                    </b>
                    <span>
                      {serviceName(r.service)}
                      {' \u00B7 '}
                      {r.price}
                      {' \u20AA'}
                    </span>
                  </div>
                  <span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  <div className="row-actions">
                    {r.status === 'approved' && (
                      <button className="link" onClick={() => addToCalendar(r)}>
                        הוספה ליומן
                      </button>
                    )}
                    {late && info.phone && (
                      <a
                        className="link"
                        href={waLink(info.phone, `היי טופז, לגבי התור שלי ${dayLabel(r.date)} ב-${r.time}`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        לביטול כתבי לטופז
                      </a>
                    )}
                    {canCancel &&
                      (askCancel === r.id ? (
                        <>
                          <button className="link" onClick={() => setAskCancel(null)}>
                            לא
                          </button>
                          <button
                            className="no"
                            style={{
                              padding: '8px 14px',
                            }}
                            onClick={() => cancel(r.id)}
                          >
                            כן, לבטל
                          </button>
                        </>
                      ) : (
                        <button className="link" onClick={() => setAskCancel(r.id)}>
                          ביטול
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="bottom">
          <button className="btn light" onClick={() => go('days')}>
            קביעת תור נוסף
          </button>
        </div>
      </div>
    </div>
  );
}
