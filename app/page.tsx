'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PriceChart } from '@/components/PriceChart';
import { SpectrumChart } from '@/components/SpectrumChart';
import { computeCycles } from '@/lib/cycle';

type Candle = { date: string; close: number };

export default function Page() {
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [range, setRange] = useState('5y');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Candle[] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symbol, range, interval });
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const json = await res.json();
      setData(json.data as Candle[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol, range, interval]);

  useEffect(() => {
    fetchData();
  }, []); // initial load

  const analysis = useMemo(() => {
    if (!data || data.length < 32) return null;
    const closes = data.map(d => d.close);
    const { spectrum, topCycles } = computeCycles(closes, interval === '1d' ? 1 : interval === '1wk' ? 7 : 30);
    const periods = spectrum.map(s => s.periodDays);
    const powers = spectrum.map(s => s.power);
    return { periods, powers, topCycles };
  }, [data, interval]);

  return (
    <main className="space-y-6">
      <section className="bg-white shadow-sm border rounded-lg p-4">
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          onSubmit={e => {
            e.preventDefault();
            fetchData();
          }}
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Symbol</label>
            <input
              className="w-full rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., RELIANCE or RELIANCE.NS"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Range</label>
            <select
              className="w-full rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={range}
              onChange={e => setRange(e.target.value)}
            >
              <option value="1y">1 year</option>
              <option value="2y">2 years</option>
              <option value="5y">5 years</option>
              <option value="10y">10 years</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Interval</label>
            <select
              className="w-full rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={interval}
              onChange={e => setInterval(e.target.value)}
            >
              <option value="1d">Daily</option>
              <option value="1wk">Weekly</option>
              <option value="1mo">Monthly</option>
            </select>
          </div>
          <button
            className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading?' : 'Analyze'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Price</h2>
          {data && data.length > 0 ? (
            <PriceChart labels={data.map(d => d.date)} values={data.map(d => d.close)} />
          ) : (
            <p className="text-slate-500">No data</p>
          )}
        </div>
        <div className="bg-white shadow-sm border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Spectrum</h2>
          {analysis ? (
            <SpectrumChart periods={analysis.periods} powers={analysis.powers} />
          ) : (
            <p className="text-slate-500">Insufficient data for spectrum</p>
          )}
        </div>
      </section>

      {analysis && (
        <section className="bg-white shadow-sm border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Top Cycles</h2>
          <ul className="list-disc pl-6 space-y-1">
            {analysis.topCycles.map((c, idx) => (
              <li key={idx}>
                <span className="font-medium">~{c.periodDays.toFixed(0)} days</span>
                <span className="text-slate-500"> ? power {(c.power * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">Note: Cycles are estimated via FFT on detrended prices and normalized.</p>
        </section>
      )}
    </main>
  );
}
