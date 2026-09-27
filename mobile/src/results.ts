// Draw results: downloaded from the public results site, cached on the phone,
// with a bundled snapshot so the very first launch works offline.
import { File, Paths } from 'expo-file-system';
import bundled from '../assets/results.json';

export const RESULTS_URL = 'https://bondcheck.hundredships.com/data/results.json';
export const SITE_URL = 'https://bondcheck.hundredships.com';

export interface Prize { rank: 1 | 2 | 3 | 4 | 5; amount: number; numbers: string[] }
export interface Draw { draw: number; date: string; prizes: Prize[] }
export interface Results {
  version: number;
  updatedAt: string;
  latestDraw: number;
  nextDrawExpected: string;
  claimYears: number;
  taxRate: number;
  draws: Draw[];
}

export interface Win {
  bond: string;
  draw: number;
  date: string;
  rank: number;
  amount: number;
  afterTax: number;
  claimBy: string;
}

const cacheFile = () => new File(Paths.document, 'results.json');

export function cachedResults(): Results {
  try {
    const f = cacheFile();
    if (f.exists) {
      const cached = JSON.parse(f.textSync()) as Results;
      if (cached.latestDraw >= (bundled as Results).latestDraw) return cached;
    }
  } catch {}
  return bundled as Results;
}

/** Fetches fresh results; returns null when offline (callers keep the cached copy). */
export async function fetchResults(): Promise<Results | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(RESULTS_URL, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as Results;
    if (!Array.isArray(data.draws) || !data.draws.length) return null;
    try { cacheFile().write(JSON.stringify(data)); } catch {}
    return data;
  } catch {
    return null;
  }
}

function addYears(iso: string, years: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Every prize any of [bonds] won across the published draws, newest first. */
export function findWins(bonds: Iterable<string>, results: Results): Win[] {
  const index = new Map<string, { draw: Draw; prize: Prize }[]>();
  for (const draw of results.draws) {
    for (const prize of draw.prizes) {
      for (const n of prize.numbers) {
        const list = index.get(n) ?? [];
        list.push({ draw, prize });
        index.set(n, list);
      }
    }
  }
  const wins: Win[] = [];
  for (const bond of bonds) {
    for (const { draw, prize } of index.get(bond) ?? []) {
      wins.push({
        bond,
        draw: draw.draw,
        date: draw.date,
        rank: prize.rank,
        amount: prize.amount,
        afterTax: Math.round(prize.amount * (1 - results.taxRate)),
        claimBy: addYears(draw.date, results.claimYears),
      });
    }
  }
  return wins.sort((a, b) => b.draw - a.draw || a.rank - b.rank);
}

export const winKey = (w: Win) => `${w.draw}:${w.bond}`;

export function daysUntil(iso: string) {
  const target = new Date(iso + 'T00:00:00').getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}
