// App state, persisted as one small JSON file in the app's documents folder
// (included in Android's automatic backup). No accounts, no server.
import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import type { Lang } from './i18n';
import { cachedResults, type Results } from './results';

export const FREE_LIMIT = 30;
export const SLOTS_PER_AD = 3;
export const MAX_FREE_LIMIT = 60;
export const MAX_RANGE = 1000;

export interface Persisted {
  lang: Lang;
  onboarded: boolean;
  bonds: string[]; // sorted, unique, 7 digits
  bonusSlots: number;
  isPro: boolean;
  notifications: boolean;
  lastSeenDraw: number; // latest draw the user has been told about
  notifiedWins: string[]; // "draw:bond" keys already announced
}

const defaults = (): Persisted => ({
  lang: getLocales()[0]?.languageCode === 'en' ? 'en' : 'bn',
  onboarded: false,
  bonds: [],
  bonusSlots: 0,
  isPro: false,
  notifications: true,
  lastSeenDraw: 0,
  notifiedWins: [],
});

const stateFile = () => new File(Paths.document, 'state.json');

export function loadPersisted(): Persisted {
  try {
    const f = stateFile();
    if (f.exists) return { ...defaults(), ...JSON.parse(f.textSync()) };
  } catch {}
  return defaults();
}

export function savePersisted(p: Persisted) {
  try {
    stateFile().write(JSON.stringify(p));
  } catch {}
}

export const bondLimit = (p: Pick<Persisted, 'isPro' | 'bonusSlots'>) =>
  p.isPro ? Infinity : Math.min(FREE_LIMIT + p.bonusSlots, MAX_FREE_LIMIT);

interface AppState extends Persisted {
  results: Results;
  offline: boolean;
  set: (patch: Partial<Persisted>) => void;
  setResults: (r: Results | null) => void;
  addBonds: (numbers: string[]) => { added: number; skipped: number };
  removeBond: (n: string) => void;
}

const PERSISTED_KEYS: (keyof Persisted)[] = ['lang', 'onboarded', 'bonds', 'bonusSlots', 'isPro', 'notifications', 'lastSeenDraw', 'notifiedWins'];
const pick = (s: AppState): Persisted => Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])) as unknown as Persisted;

export const useApp = create<AppState>((set, get) => ({
  ...loadPersisted(),
  results: cachedResults(),
  offline: false,
  set: (patch) => {
    set(patch);
    savePersisted(pick(get()));
  },
  setResults: (r) => set(r ? { results: r, offline: false } : { offline: true }),
  addBonds: (numbers) => {
    const existing = new Set(get().bonds);
    let added = 0;
    for (const n of numbers) {
      if (!existing.has(n)) {
        existing.add(n);
        added++;
      }
    }
    const bonds = [...existing].sort();
    set({ bonds });
    savePersisted(pick(get()));
    return { added, skipped: numbers.length - added };
  },
  removeBond: (n) => {
    set({ bonds: get().bonds.filter((b) => b !== n) });
    savePersisted(pick(get()));
  },
}));

/** Numbers from..to inclusive, zero-padded to 7 digits. */
export function rangeNumbers(from: string, to: string): string[] {
  const a = parseInt(from, 10);
  const b = parseInt(to, 10);
  const out: string[] = [];
  for (let n = a; n <= b; n++) out.push(String(n).padStart(7, '0'));
  return out;
}
