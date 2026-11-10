import type { Api, Info, ListName, Nav, Overview, ReactNode } from '../lib/types';
import { Call, Head, MSG, WA, byDate, initials } from './shared';
import { dayLabel } from '../lib/format';
import { BookingRow, ReqCard } from './cards';
import { serviceName } from '../lib/catalog';
import { IconChevron, IconTrash } from '../components/icons';

/* ---------- lists behind the tiles ---------- */
export function ListScreen({
  api,
  list,
  ov,
  info,
  nav,
}: {
  api: Api;
  list: ListName;
  ov: Overview;
  info: Info;
  nav: Nav;
}) {
  const refresh = () => {
    nav.reload();
  };
  const T = {
    pending: ['ממתינות לאישור', 'בקשות שמחכות להחלטה שלך'],
    upcoming: ['תורים שקבעת', 'כל התורים המאושרים מהיום והלאה'],
    reschedule: ['לקבוע מחדש', 'לקוחות שצריך לתת להן מועד אחר'],
    toMark: ['לסמן מי הגיעה', 'תורים שעברו. הסימון נשמר בכרטיס הלקוחה'],
    due: ['הגיע הזמן לחזור', 'לקוחות שעברו 3 שבועות מהטיפול ואין להן תור'],
    waitlist: ['רשימת המתנה', 'לקוחות שמחכות שיתפנה מקום'],
  };
  const [title, sub] = T[list];
  const taken = new Set(ov.upcoming.map((r) => `${r.date} ${r.time}`));
  const empty = (
    <div className="empty">
      <b>אין כאן כלום כרגע</b>
    </div>
  );
  let body: ReactNode = null;
  if (list === 'pending')
    body = ov.pending.length
      ? byDate(ov.pending).map(([date, rs]) => (
          <div key={date}>
            <div className="section">{dayLabel(date)}</div>
            <div className="list">
              {rs.map((r) => (
                <ReqCard
                  key={r.id}
                  api={api}
                  r={r}
                  clash={taken.has(`${r.date} ${r.time}`)}
                  onDone={refresh}
                  onReschedule={(x) =>
                    nav.go({
                      name: 'move',
                      req: x,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ))
      : empty;
  if (list === 'upcoming')
    body = ov.upcoming.length
      ? byDate(ov.upcoming).map(([date, rs]) => (
          <div key={date}>
            <div className="section">
              {dayLabel(date)}
              {' \u00B7 '}
              {rs.length}
              {' תורים'}
            </div>
            <div className="list">
              {rs.map((r) => (
                <BookingRow key={r.id} api={api} r={r} address={info.address} onChanged={refresh} />
              ))}
            </div>
          </div>
        ))
      : empty;
  if (list === 'reschedule')
    body = ov.reschedule.length ? (
      <div className="list">
        {ov.reschedule.map((r) => (
          <button
            key={r.id}
            className="row"
            onClick={() =>
              nav.go({
                name: 'move',
                req: r,
              })
            }
          >
            <div className="avatar">{initials(r.fullName)}</div>
            <div className="main">
              <b>{r.fullName}</b>
              <span>
                {serviceName(r.service)}
                {' \u00B7 ביקשה '}
                {dayLabel(r.date)} <span className="ltr">{r.time}</span>
              </span>
            </div>
            <IconChevron />
          </button>
        ))}
      </div>
    ) : (
      empty
    );
  if (list === 'toMark')
    body = ov.toMark.length ? (
      <div className="list">
        {ov.toMark.map((r) => (
          <div key={r.id} className="req">
            <div className="top">
              <div>
                <div className="name">{r.fullName}</div>
                <span className="hint">
                  {dayLabel(r.date)}
                  {' \u00B7 '}
                  <span className="ltr">{r.time}</span>
                  {' \u00B7 '}
                  {serviceName(r.service)}
                </span>
              </div>
            </div>
            <div className="actions">
              <button
                className="yes"
                onClick={() =>
                  api(`/api/admin/requests/${r.id}/attendance`, {
                    method: 'PATCH',
                    body: {
                      attended: true,
                    },
                  }).then(refresh)
                }
              >
                הגיעה
              </button>
              <button
                className="no"
                onClick={() =>
                  api(`/api/admin/requests/${r.id}/attendance`, {
                    method: 'PATCH',
                    body: {
                      attended: false,
                    },
                  }).then(refresh)
                }
              >
                לא הגיעה
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      empty
    );
  if (list === 'due')
    body = ov.due.length ? (
      <div className="list">
        {ov.due.map((c) => (
          <div key={c.id} className="booking-row">
            <button
              className="line plain"
              onClick={() =>
                nav.go({
                  name: 'client',
                  id: c.id,
                })
              }
            >
              <div className="avatar">{initials(c.fullName)}</div>
              <div className="main">
                <b>{c.fullName}</b>
                <span>
                  {'ביקור אחרון: '}
                  {dayLabel(c.lastVisit)}
                </span>
              </div>
              <IconChevron />
            </button>
            <div className="mini-row">
              <WA phone={c.phone} text={MSG.due(c.fullName)} label="להזמין לחזור" />
              <Call phone={c.phone} />
            </div>
          </div>
        ))}
      </div>
    ) : (
      empty
    );
  if (list === 'waitlist')
    body = ov.waitlist.length ? (
      <div className="list">
        {ov.waitlist.map((w) => (
          <div key={w.id} className="booking-row">
            <button
              className="line plain"
              onClick={() =>
                nav.go({
                  name: 'client',
                  id: w.customerId,
                })
              }
            >
              <div className="avatar">{initials(w.fullName)}</div>
              <div className="main">
                <b>{w.fullName}</b>
                <span>
                  {serviceName(w.service)}
                  {w.note ? ` · ${w.note}` : ''}
                </span>
              </div>
              <IconChevron />
            </button>
            <div className="mini-row">
              <WA phone={w.phone} text={MSG.waitlist(w.fullName)} label="התפנה מקום" />
              <button
                className="mini"
                onClick={() =>
                  nav.go({
                    name: 'book',
                    prefill: {
                      fullName: w.fullName,
                      phone: w.phone,
                      service: w.service,
                    },
                  })
                }
              >
                קביעת תור
              </button>
              <button
                className="mini"
                onClick={() =>
                  api(`/api/admin/waitlist/${w.id}`, {
                    method: 'DELETE',
                  }).then(refresh)
                }
                aria-label="הסרה מהרשימה"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      empty
    );
  return (
    <div className="app">
      <div className="screen" key={`list-${list}`}>
        <Head onBack={nav.home} />
        <h1 className="title">{title}</h1>
        <p className="subtitle">{sub}</p>
        {body}
      </div>
    </div>
  );
}
