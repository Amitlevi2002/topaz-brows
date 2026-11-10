import type { Api, Info, Nav, Settings } from '../lib/types';
import { useState, useEffect, useRef } from 'react';
import { setCatalog } from '../lib/catalog';
import { Head, shrink } from './shared';
import { IconPlus, IconTrash } from '../components/icons';

export function SettingsScreen({
  api,
  info,
  onInfo,
  nav,
}: {
  api: Api;
  info: Info;
  onInfo: (i: Info) => void;
  nav: Nav;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [gallery, setGallery] = useState(info.gallery);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [askDel, setAskDel] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api('/api/admin/settings')
      .then(setS)
      .catch((e: any) => setErr(e.message));
  }, []);
  const set = (k, v) => {
    setS(
      (x) =>
        x && {
          ...x,
          [k]: v,
        },
    );
    setMsg('');
  };
  const setCat = (f) =>
    setS(
      (x) =>
        x && {
          ...x,
          catalog: f(x.catalog),
        },
    );
  async function save() {
    if (!s) return;
    setErr('');
    setBusy(true);
    try {
      const out = await api('/api/admin/settings', {
        method: 'PATCH',
        body: s,
      });
      setS(out);
      setCatalog(out.catalog);
      onInfo({
        ...info,
        ...out,
        gallery,
      });
      setMsg('נשמר ✓');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files) {
    if (!files?.length) return;
    setErr('');
    setUploading(files.length);
    let list = gallery;
    for (const f of Array.from(files)) {
      try {
        const g = await api('/api/admin/gallery', {
          method: 'POST',
          body: {
            dataUrl: await shrink(f),
          },
        });
        list = [g, ...list];
        setGallery(list);
      } catch (e: any) {
        setErr(e.message || 'העלאה נכשלה');
      }
      setUploading((n) => n - 1);
    }
    onInfo({
      ...info,
      gallery: list,
    });
    if (fileRef.current) fileRef.current.value = '';
  }
  async function removePhoto(id) {
    setAskDel(null);
    try {
      await api(`/api/admin/gallery/${id}`, {
        method: 'DELETE',
      });
      const list = gallery.filter((g) => g.id !== id);
      setGallery(list);
      onInfo({
        ...info,
        gallery: list,
      });
    } catch (e: any) {
      setErr(e.message);
    }
  }
  if (!s)
    return (
      <div className="app">
        <div className="screen">
          <Head onBack={nav.home} />
          <div className="empty">{err || 'טוען...'}</div>
        </div>
      </div>
    );
  return (
    <div className="app">
      <div className="screen" key="settings">
        <Head onBack={nav.home} />
        <h1 className="title">הגדרות</h1>
        <p className="subtitle">מה שהלקוחות רואות ואיך המערכת עובדת</p>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <div className="section">גלריית עבודות ({gallery.length})</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <div className="gallery admin">
          <button className="shot add" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            <IconPlus />
            <span>{uploading ? `מעלה ${uploading}...` : 'הוספת תמונות'}</span>
          </button>
          {gallery.map((g) => (
            <div key={g.id} className="shot">
              <img src={g.url} alt="" loading="lazy" />
              {askDel === g.id ? (
                <div className="shot-confirm">
                  <button onClick={() => removePhoto(g.id)}>מחיקה</button>
                  <button onClick={() => setAskDel(null)}>ביטול</button>
                </div>
              ) : (
                <button className="shot-del" onClick={() => setAskDel(g.id)} aria-label="מחיקת תמונה">
                  <IconTrash />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="section">כללים</div>
        <div className="panel">
          <div className="setting">
            <div>
              <b>אישור אוטומטי</b>
              <span>בקשות נקבעות מיד בלי לחכות לך</span>
            </div>
            <button
              className={`toggle ${s.autoApprove ? 'on' : ''}`}
              role="switch"
              aria-checked={s.autoApprove}
              aria-label="אישור אוטומטי"
              onClick={() => set('autoApprove', !s.autoApprove)}
            >
              <span />
            </button>
          </div>
          <div className="setting">
            <div>
              <b>ביטול עד</b>
              <span>כמה שעות לפני התור לקוחה יכולה לבטל לבד</span>
            </div>
            <div className="stepper">
              <button onClick={() => set('cancelHours', Math.min(72, s.cancelHours + 1))} aria-label="עוד שעה">
                +
              </button>
              <output>{s.cancelHours}</output>
              <button onClick={() => set('cancelHours', Math.max(0, s.cancelHours - 1))} aria-label="פחות שעה">
                −
              </button>
            </div>
          </div>
        </div>
        <div className="section">פרטי העסק</div>
        <div className="fields">
          <div className="field">
            <label htmlFor="s-phone">הוואטסאפ שלך (הלקוחות יראו)</label>
            <input
              id="s-phone"
              className="input"
              type="tel"
              value={s.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="050-000-0000"
            />
          </div>
          <div className="field">
            <label htmlFor="s-address">כתובת</label>
            <input
              id="s-address"
              className="input"
              value={s.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="s-ig">אינסטגרם</label>
            <input
              id="s-ig"
              className="input ltr-input"
              value={s.instagram}
              onChange={(e) => set('instagram', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="s-about">שורת תיאור</label>
            <input id="s-about" className="input" value={s.about} onChange={(e) => set('about', e.target.value)} />
          </div>
        </div>
        <div className="section">מחירון</div>
        <div className="price-edit">
          {s.catalog.services.map((sv, i) => (
            <div className="pe-row" key={sv.id}>
              <input
                className="input"
                aria-label="שם הטיפול"
                value={sv.name}
                onChange={(e) =>
                  setCat((c) => ({
                    ...c,
                    services: c.services.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            name: e.target.value,
                          }
                        : x,
                    ),
                  }))
                }
              />
              <input
                className="input num"
                aria-label="מחיר"
                inputMode="numeric"
                value={sv.price}
                onChange={(e) =>
                  setCat((c) => ({
                    ...c,
                    services: c.services.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            price: Number(e.target.value.replace(/\D/g, '')) || 0,
                          }
                        : x,
                    ),
                  }))
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!sv.from}
                  onChange={(e) =>
                    setCat((c) => ({
                      ...c,
                      services: c.services.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              from: e.target.checked,
                            }
                          : x,
                      ),
                    }))
                  }
                />
                החל מ
              </label>
              <button
                className="icon"
                aria-label="מחיקת טיפול"
                onClick={() =>
                  setCat((c) => ({
                    ...c,
                    services: c.services.filter((_, j) => j !== i),
                  }))
                }
              >
                <IconTrash />
              </button>
            </div>
          ))}
          <button
            className="link"
            onClick={() =>
              setCat((c) => ({
                ...c,
                services: [
                  ...c.services,
                  {
                    id: `s${Date.now()}`,
                    name: '',
                    price: 0,
                  },
                ],
              }))
            }
          >
            + הוספת טיפול
          </button>
        </div>
        <div className="section">תוספות</div>
        <div className="price-edit">
          {s.catalog.extras.map((ex, i) => (
            <div className="pe-row" key={ex.id}>
              <input
                className="input"
                aria-label="שם התוספת"
                value={ex.name}
                onChange={(e) =>
                  setCat((c) => ({
                    ...c,
                    extras: c.extras.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            name: e.target.value,
                          }
                        : x,
                    ),
                  }))
                }
              />
              <input
                className="input num"
                aria-label="מחיר"
                inputMode="numeric"
                value={ex.price}
                onChange={(e) =>
                  setCat((c) => ({
                    ...c,
                    extras: c.extras.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            price: Number(e.target.value.replace(/\D/g, '')) || 0,
                          }
                        : x,
                    ),
                  }))
                }
              />
              <button
                className="icon"
                aria-label="מחיקת תוספת"
                onClick={() =>
                  setCat((c) => ({
                    ...c,
                    extras: c.extras.filter((_, j) => j !== i),
                  }))
                }
              >
                <IconTrash />
              </button>
            </div>
          ))}
          <button
            className="link"
            onClick={() =>
              setCat((c) => ({
                ...c,
                extras: [
                  ...c.extras,
                  {
                    id: `e${Date.now()}`,
                    name: '',
                    price: 0,
                    perNail: false,
                  },
                ],
              }))
            }
          >
            + הוספת תוספת
          </button>
        </div>
        <div className="bottom sticky">
          {msg && (
            <p
              className="hint"
              style={{
                textAlign: 'center',
              }}
            >
              {msg}
            </p>
          )}
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'שומרת...' : 'שמירת הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
}
