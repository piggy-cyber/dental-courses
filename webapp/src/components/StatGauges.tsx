type Gauge = { label: string; value: string | number; unit?: string };

export function StatGauges({ gauges }: { gauges: Gauge[] }) {
  return (
    <div className="flex flex-wrap gap-px border border-brand-line bg-brand-line">
      {gauges.map((g) => (
        <div
          key={g.label}
          className="flex min-w-[120px] flex-1 flex-col items-center justify-center bg-brand-panel px-4 py-3"
        >
          <span className="cockpit-gauge-value text-2xl leading-none">
            {g.value}
            {g.unit && (
              <span className="ml-0.5 text-xs font-normal text-brand-muted">{g.unit}</span>
            )}
          </span>
          <span className="cockpit-readout-label mt-1.5">{g.label}</span>
        </div>
      ))}
    </div>
  );
}
