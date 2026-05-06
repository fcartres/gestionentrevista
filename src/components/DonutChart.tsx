

export default function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let currentAngle = 0;

  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Sin datos</div>
    );
  }

  const getColor = (index: number) => `hsl(${index * 72 % 360}, 76%, 57%)`;

  const slices = entries.map(([label, value], index) => {
    const percentage = value / total;
    const sliceAngle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;

    return (
      <path
        key={label}
        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={getColor(index)}
        stroke="white"
        strokeWidth="2"
      >
        <title>{`${label}: ${value} (${Math.round(percentage * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg width="160" height="160" viewBox="0 0 100 100" className="drop-shadow-lg">
        {slices}
        <circle cx="50" cy="50" r="22" fill="white" />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total</text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle" className="text-xl font-black text-slate-900">{total}</text>
      </svg>
    </div>
  );
}