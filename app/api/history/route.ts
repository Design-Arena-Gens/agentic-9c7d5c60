import { NextRequest } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { z } from 'zod';
import { normalizeSymbol } from '@/lib/symbols';

const querySchema = z.object({
  symbol: z.string().min(1),
  range: z.string().optional().default('5y'),
  interval: z.string().optional().default('1d'),
});

function subtractFromNow(range: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  const m = range.match(/^(\d+)([dwmy])$/i);
  if (!m) {
    // default 5y
    start.setFullYear(end.getFullYear() - 5);
    return { start, end };
  }
  const value = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case 'd':
      start.setDate(end.getDate() - value);
      break;
    case 'w':
      start.setDate(end.getDate() - value * 7);
      break;
    case 'm':
      start.setMonth(end.getMonth() - value);
      break;
    case 'y':
      start.setFullYear(end.getFullYear() - value);
      break;
  }
  return { start, end };
}

function mapInterval(interval: string): '1d' | '1wk' | '1mo' {
  if (interval === '1wk' || interval === '1mo') return interval as any;
  return '1d';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    symbol: url.searchParams.get('symbol') ?? '',
    range: url.searchParams.get('range') ?? undefined,
    interval: url.searchParams.get('interval') ?? undefined,
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
  }
  const { symbol, range, interval } = parsed.data;
  const normalized = normalizeSymbol(symbol);
  const { start, end } = subtractFromNow(range);

  try {
    const candles = (await yahooFinance.historical(normalized, {
      period1: start,
      period2: end,
      interval: mapInterval(interval),
    })) as Array<{ date: Date; close: number | null }>;

    const data = candles
      .filter(c => c.close != null && c.date != null)
      .map(c => ({ date: c.date.toISOString().slice(0, 10), close: Number(c.close) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return new Response(
      JSON.stringify({ symbol: normalized, data }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data', detail: err?.message ?? String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
