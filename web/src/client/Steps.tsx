/** Five thin bars across the booking card: details, day, time, treatment, confirm. */
export function Steps({ at }: { at: number }) {
  return (
    <div className="steps" role="img" aria-label={`שלב ${at + 1} מתוך 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= at ? 'on' : ''} />
      ))}
    </div>
  );
}
