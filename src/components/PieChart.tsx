import { useState } from 'react';

export default function PieChart({ data }: { data: Record<string, number> }) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const colors = {
    reservado: '#2563eb',
    cancelado: '#ef4444',
    asistio: '#10b981',
    'no-asistio': '#f59e0b'
  };

  const entries = Object.entries(data).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let currentAngle = 0;

  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Sin datos</div>
    );
  }

  const activeEntry = activeStatus ? entries.find(([status]) => status === activeStatus) : null;
  const centerLabel = activeEntry ? activeEntry[0].replace('-', ' ') : 'Total';
  const centerValue = activeEntry ? activeEntry[1] : total;
  const centerPct = activeEntry ? Math.round((activeEntry[1] / total) * 100) : null;

  const slices = entries.map(([status, value]) => {
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
    const isActive = activeStatus === status;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return (
      <path
        key={status}
        d={pathData}
        fill={colors[status as keyof typeof colors]}
        stroke="white"
        strokeWidth={isActive ? 3 : 2}
        opacity={isActive ? 1 : 0.95}
        style={{ transition: 'all 150ms ease' }}
        onMouseEnter={() => setActiveStatus(status)}
        onMouseLeave={() => setActiveStatus(null)}
        cursor="pointer"
      >
        <title>{`${status.replace('-', ' ')}: ${value} (${Math.round(percentage * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <div className="relative w-40 h-40">
      <svg width="160" height="160" viewBox="0 0 100 100" className="drop-shadow-lg">
        {slices}
        <circle cx="50" cy="50" r="22" fill="white" />
        <text
          x="50"
          y="42"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"
          fill="#475569"
        >
          {centerLabel}
        </text>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xl font-black text-slate-900"
        >
          {centerValue}
        </text>
        {centerPct !== null && (
          <text
            x="50"
            y="68"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400"
            fill="#64748b"
          >
            {centerPct}%
          </text>
        )}
      </svg>
    </div>
  );
}