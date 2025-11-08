"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export function SpectrumChart({ periods, powers }: { periods: number[]; powers: number[] }) {
  const data = {
    labels: periods.map(p => p.toFixed(0)),
    datasets: [
      {
        label: 'Normalized Power',
        data: powers,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items: any) => `${items[0].label}d period` } } },
    scales: {
      x: {
        title: { display: true, text: 'Period (days)' },
        ticks: { maxTicksLimit: 10 },
      },
      y: { title: { display: true, text: 'Power (normalized)' }, min: 0, max: 1 },
    },
  };

  return (
    <div className="h-64">
      <Line data={data} options={options as any} />
    </div>
  );
}
