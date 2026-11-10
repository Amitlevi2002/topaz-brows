import { useState } from 'react';
import { AdminApp } from './admin/AdminApp';
import { ClientApp } from './client/ClientApp';
import { isDemo, publicApi } from './lib/api';
import { setCatalog } from './lib/catalog';
import { store } from './lib/storage';

type View = 'admin' | 'client';

/** The demo shows both sides of the system with a switch on top. */
function Demo({ initial }: { initial: any }) {
  const [view, setView] = useState<View>(() => (store.get('topaz_demo_view') as View) || 'client');
  const [info, setInfo] = useState(initial);
  const [n, setN] = useState(0);
  const [intro, setIntro] = useState(() => !store.get('topaz_demo_seen'));

  const switchTo = async (v: View) => {
    const fresh = await publicApi('/api/info');
    setCatalog(fresh.catalog);
    setInfo(fresh);
    setView(v);
    setN((x) => x + 1); // remount so each side reloads what the other just changed
    window.scrollTo(0, 0);
    store.set('topaz_demo_view', v);
  };
  const closeIntro = () => {
    setIntro(false);
    store.set('topaz_demo_seen', '1');
  };

  return (
    <>
      <div className="demo-bar">
        <div className="demo-in">
          <div className="demo-seg" role="tablist">
            <button
              className={view === 'admin' ? 'on' : ''}
              onClick={() => switchTo('admin')}
              role="tab"
              aria-selected={view === 'admin'}
            >
              צד הניהול
            </button>
            <button
              className={view === 'client' ? 'on' : ''}
              onClick={() => switchTo('client')}
              role="tab"
              aria-selected={view === 'client'}
            >
              צד הלקוחות
            </button>
          </div>
          <button className="demo-reset" onClick={() => import('./lib/demo').then((m) => m.resetDemo())}>
            איפוס
          </button>
        </div>
      </div>
      {view === 'admin' ? <AdminApp key={'a' + n} info={info} /> : <ClientApp key={'c' + n} info={info} />}
      {intro && (
        <div className="demo-intro" onClick={closeIntro}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Topaz Mudahi Eyebrows</h2>
            <p className="subtitle" style={{ margin: 0 }}>
              מערכת תורים לעיצוב גבות. זו גרסת דמו עם נתונים לדוגמה, אפשר לשחק חופשי.
            </p>
            <ol>
              <li>למעלה עוברים בין צד הניהול לצד הלקוחות</li>
              <li>קבעו תור כלקוחה, ואז חזרו לניהול ואשרו אותו</li>
              <li>בהגדרות (גלגל השיניים) אפשר לשנות מחירים ולהעלות תמונות</li>
              <li>הכל נשמר בדפדפן. ״איפוס״ מחזיר להתחלה</li>
            </ol>
            <button className="btn" onClick={closeIntro}>
              יאללה
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function App({ info }: { info: any }) {
  if (isDemo) {
    // the demo opens on the client side; Topaz's side is already signed in for the switch
    if (!store.get('topaz_admin_token')) store.set('topaz_admin_token', 'admin');
    return <Demo initial={info} />;
  }
  return location.pathname.startsWith('/admin') ? <AdminApp info={info} /> : <ClientApp info={info} />;
}
