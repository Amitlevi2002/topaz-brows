import { STUDIO } from '../lib/brand';

/** The strip on top of every client screen: Topaz's gold monogram and name. */
export function BrandBar({ end }: { end?: React.ReactNode }) {
  return (
    <header className="brand-bar">
      <div className="brand" aria-label={`${STUDIO} Eyebrows`}>
        <img src="/mark-gold.png" alt="" />
        <span>
          <b>{STUDIO}</b>
          <small>eyebrows</small>
        </span>
      </div>
      {end}
    </header>
  );
}
