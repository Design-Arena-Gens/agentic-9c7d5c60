import FFT from 'fft.js';

export type SpectrumPoint = { periodDays: number; power: number };
export type CycleResult = {
  spectrum: SpectrumPoint[];
  detrended: number[];
  topCycles: { periodDays: number; power: number }[];
};

function linearDetrend(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const detrended = new Array(n);
  for (let i = 0; i < n; i++) {
    const trend = slope * i + intercept;
    detrended[i] = values[i] - trend;
  }
  return detrended;
}

function nextPow2(n: number) {
  return 1 << (32 - Math.clz32(n - 1));
}

export function computeCycles(closes: number[], samplingIntervalDays = 1): CycleResult {
  // Detrend
  const detrended = linearDetrend(closes);

  // Window (Hann)
  const n = detrended.length;
  const hann = new Array(n);
  for (let i = 0; i < n; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  const windowed = detrended.map((v, i) => v * hann[i]);

  // Zero-pad to next power of 2
  const N = nextPow2(Math.max(8, windowed.length));

  const fft = new FFT(N);
  const input = fft.createComplexArray();
  const output = fft.createComplexArray();
  for (let i = 0; i < N; i++) {
    const value = i < windowed.length ? windowed[i] : 0;
    input[2 * i] = value; // real
    input[2 * i + 1] = 0; // imag
  }
  fft.transform(output, input);

  const half = Math.floor(N / 2);
  const spectrum: SpectrumPoint[] = [];
  for (let k = 1; k < half; k++) {
    const re = output[2 * k];
    const im = output[2 * k + 1];
    const power = re * re + im * im;
    const freqPerSample = k / N; // cycles per sample
    const periodSamples = 1 / freqPerSample; // samples per cycle
    const periodDays = periodSamples * samplingIntervalDays;
    spectrum.push({ periodDays, power });
  }

  // Normalize power
  const maxPower = spectrum.reduce((m, p) => (p.power > m ? p.power : m), 0) || 1;
  for (const p of spectrum) p.power = p.power / maxPower;

  // Peak picking: local maxima, ignore periods < 5 days
  const MIN_PERIOD = 5;
  const peaks: { idx: number; power: number }[] = [];
  for (let i = 1; i < spectrum.length - 1; i++) {
    if (
      spectrum[i].power > spectrum[i - 1].power &&
      spectrum[i].power > spectrum[i + 1].power &&
      spectrum[i].periodDays >= MIN_PERIOD
    ) {
      peaks.push({ idx: i, power: spectrum[i].power });
    }
  }
  peaks.sort((a, b) => b.power - a.power);
  const topCycles = peaks.slice(0, 3).map(p => ({
    periodDays: spectrum[p.idx].periodDays,
    power: spectrum[p.idx].power,
  }));

  return { spectrum, detrended, topCycles };
}
