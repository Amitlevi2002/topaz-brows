import type { AdminDay, Api, Info, ListName, Nav, Overview, Screen, Settings } from '../lib/types';
import { useState, useEffect } from 'react';
import { DayScreen, OpenDay } from './DayScreen';
import { Reschedule } from './Reschedule';
import { dayLabel, todayIL } from '../lib/format';
import { ListScreen } from './ListScreen';
import { MonthCalendar, MonthScreen } from './MonthScreen';
import { ClientProfile, Clients } from './Clients';
import { ManualBook } from './ManualBook';
import { SettingsScreen } from './Settings';
import { Head } from './shared';
import { IconChevron, IconLogout, IconPlus, IconSettings, IconUsers } from '../components/icons';

/* ---------- main router ---------- */
export function Admin({ api, info: initialInfo, onLogout }: { api: Api; info: Info; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>({
    name: 'home',
  });
  const [days, setDays] = useState<AdminDay[] | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [info, setInfo] = useState(initialInfo);
  const [err, setErr] = useState('');
  const load = () =>
    Promise.all([api('/api/admin/days').then(setDays), api('/api/admin/overview').then(setOv)]).catch((e: any) =>
      setErr(e.message),
    );
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };
  const home = () => {
    load();
    go({
      name: 'home',
    });
  };
  const nav: Nav = {
    go,
    home,
    reload: load,
  };
  switch (screen.name) {
    case 'day': {
      const day = days?.find((d) => d.id === screen.id);
      if (day) return <DayScreen api={api} day={day} info={info} nav={nav} />;
      break;
    }
    case 'move':
      return <Reschedule api={api} req={screen.req} days={(days ?? []).filter((d) => d.date >= todayIL())} nav={nav} />;
    case 'open':
      return <OpenDay api={api} initialDate={screen.date} nav={nav} />;
    case 'list':
      if (ov) return <ListScreen api={api} list={screen.list} ov={ov} info={info} nav={nav} />;
      break;
    case 'month':
      if (ov) return <MonthScreen ov={ov} nav={nav} />;
      break;
    case 'clients':
      return <Clients api={api} nav={nav} />;
    case 'client':
      return <ClientProfile api={api} id={screen.id} info={info} nav={nav} />;
    case 'book':
      return <ManualBook api={api} days={days ?? []} prefill={screen.prefill} nav={nav} />;
    case 'settings':
      return <SettingsScreen api={api} info={info} onInfo={setInfo} nav={nav} />;
  }
  const alerts = ov
    ? [
        {
          list: 'toMark' as ListName,
          label: 'לסמן מי הגיעה',
          n: ov.toMark.length,
        },
        {
          list: 'due' as ListName,
          label: 'הגיע הזמן לחזור',
          n: ov.due.length,
        },
        {
          list: 'waitlist' as ListName,
          label: 'רשימת המתנה',
          n: ov.waitlist.length,
        },
      ].filter((a) => a.n > 0)
    : [];
  return (
    <div className="app">
      <div className="screen" key="home">
        <Head
          end={
            <>
              <button
                className="icon"
                onClick={() =>
                  go({
                    name: 'clients',
                  })
                }
                aria-label="לקוחות"
              >
                <IconUsers />
              </button>
              <button
                className="icon"
                onClick={() =>
                  go({
                    name: 'settings',
                  })
                }
                aria-label="הגדרות"
              >
                <IconSettings />
              </button>
              <button className="icon" onClick={onLogout} aria-label="יציאה">
                <IconLogout />
              </button>
            </>
          }
        />
        <h1 className="title">היי טופז</h1>
        <p className="subtitle">{dayLabel(todayIL())}</p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <div className="tiles">
          <button
            className="tile wait"
            onClick={() =>
              go({
                name: 'list',
                list: 'pending',
              })
            }
            disabled={!ov}
          >
            <b>{ov?.pending.length ?? '–'}</b>
            <span>ממתינות לאישור</span>
          </button>
          <button
            className="tile ok"
            onClick={() =>
              go({
                name: 'list',
                list: 'upcoming',
              })
            }
            disabled={!ov}
          >
            <b>{ov?.upcoming.length ?? '–'}</b>
            <span>תורים שקבעת</span>
          </button>
          <button
            className="tile no"
            onClick={() =>
              go({
                name: 'list',
                list: 'reschedule',
              })
            }
            disabled={!ov}
          >
            <b>{ov?.reschedule.length ?? '–'}</b>
            <span>לקבוע מחדש</span>
          </button>
          <button
            className="tile ink"
            onClick={() =>
              go({
                name: 'month',
              })
            }
            disabled={!ov}
          >
            <b>{ov ? `${ov.month.income.toLocaleString('he-IL')} ₪` : '–'}</b>
            <span>
              {'החודש \u00B7 '}
              {ov?.month.count ?? 0}
              {' תורים'}
            </span>
          </button>
        </div>
        {alerts.length > 0 && (
          <div
            className="list"
            style={{
              marginTop: 12,
            }}
          >
            {alerts.map((a) => (
              <button
                key={a.list}
                className="row slim"
                onClick={() =>
                  go({
                    name: 'list',
                    list: a.list,
                  })
                }
              >
                <div className="main">
                  <b>{a.label}</b>
                </div>
                <span className="badge">{a.n}</span>
                <IconChevron />
              </button>
            ))}
          </div>
        )}
        <div className="section">לוח שנה</div>
        {days === null ? (
          <div className="empty">טוען...</div>
        ) : (
          <MonthCalendar
            days={days}
            onPick={(date, day) =>
              go(
                day
                  ? {
                      name: 'day',
                      id: day.id,
                    }
                  : {
                      name: 'open',
                      date,
                    },
              )
            }
          />
        )}
        <div className="bottom">
          <button
            className="btn"
            onClick={() =>
              go({
                name: 'book',
              })
            }
          >
            <IconPlus />
            קביעת תור ידנית
          </button>
        </div>
      </div>
    </div>
  );
}
/* ---------- request + booking cards ---------- */
