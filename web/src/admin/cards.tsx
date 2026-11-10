import type { Api, RequestView } from '../lib/types';
import { useState } from 'react';
import { extrasLabel, fmtPrice, isFromPrice, serviceName } from '../lib/catalog';
import { Call, MSG, WA } from './shared';
import { dayLabel } from '../lib/format';

/** Whatever the client wrote with her request. */
function NoteLine({ note, className }: { note: string; className: string }) {
  return note ? <div className={className}>{note}</div> : null;
}

/* ---------- request + booking cards ---------- */
export function ReqCard({
  api,
  r,
  showDate = false,
  clash = false,
  onDone,
  onReschedule,
}: {
  api: Api;
  r: RequestView;
  showDate?: boolean;
  clash?: boolean;
  onDone: () => void;
  onReschedule: (r: RequestView) => void;
}) {
  const [err, setErr] = useState('');
  async function decide(status: 'approved' | 'rejected') {
    setErr('');
    try {
      await api(`/api/admin/requests/${r.id}`, {
        method: 'PATCH',
        body: {
          status,
        },
      });
    } catch (e: any) {
      // stay on the card so Topaz sees why (e.g. the slot was just taken)
      setErr(e.message);
      return;
    }
    if (status === 'rejected') onReschedule(r);
    else onDone();
  }
  const ex = extrasLabel(r.extras);
  return (
    <div className="req">
      <div className="top">
        <div>
          <div className="name">{r.fullName}</div>
          <Call phone={r.phone} />
        </div>
        <div
          style={{
            textAlign: 'left',
          }}
        >
          <div className="clock">{r.time}</div>
          {showDate && <div className="hint">{dayLabel(r.date)}</div>}
        </div>
      </div>
      <div className="service">
        <div>
          <b>{serviceName(r.service)}</b>
          {ex && <span>{ex}</span>}
        </div>
        <b>{fmtPrice(r.price, isFromPrice(r.service))}</b>
      </div>
      {r.note && <NoteLine note={r.note} className="note" />}
      {clash && <div className="warn">כבר אישרת לקוחה אחרת בשעה הזו</div>}
      {err && <div className="error">{err}</div>}
      <div className="actions">
        <button className="yes" onClick={() => decide('approved')}>
          אישור
        </button>
        <button className="no" onClick={() => decide('rejected')}>
          מועד אחר
        </button>
      </div>
    </div>
  );
}

export function BookingRow({
  api,
  r,
  address,
  showDate = false,
  onChanged,
}: {
  api: Api;
  r: RequestView;
  address?: string;
  showDate?: boolean;
  onChanged: () => void;
}) {
  const [ask, setAsk] = useState(false);
  async function cancel() {
    await api(`/api/admin/requests/${r.id}`, {
      method: 'DELETE',
    }).catch(() => {});
    setAsk(false);
    onChanged();
  }
  const ex = extrasLabel(r.extras);
  return (
    <div className="booking-row">
      <div className="line">
        <b className="ltr clock-s">{r.time}</b>
        <div className="main">
          <b>{r.fullName}</b>
          <span>
            {showDate ? `${dayLabel(r.date)} · ` : ''}
            {serviceName(r.service)}
            {ex ? ` · ${ex}` : ''}
            {' \u00B7 '}
            {r.price}
            {' \u20AA'}
          </span>
          {r.note && <NoteLine note={r.note} className="note-s" />}
        </div>
      </div>
      <div className="mini-row">
        <WA phone={r.phone} text={MSG.confirm(r, address)} label="שליחת אישור" />
        <Call phone={r.phone} />
        {ask ? (
          <>
            <button className="mini" onClick={() => setAsk(false)}>
              לא
            </button>
            <button className="mini danger" onClick={cancel}>
              כן, לבטל
            </button>
          </>
        ) : (
          <button className="mini" onClick={() => setAsk(true)}>
            ביטול
          </button>
        )}
      </div>
    </div>
  );
}
