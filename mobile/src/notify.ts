// Checks for new draws in the background and on app open, then notifies:
// a win gets its own notification; a new draw without wins gets a quiet one.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { fetchResults, findWins, winKey, type Results } from './results';
import { loadPersisted, savePersisted, useApp } from './store';
import { strings, ordinalDraw, taka } from './i18n';

const TASK = 'bondcheck-draw-check';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function ensureChannel() {
  await Notifications.setNotificationChannelAsync('draws', {
    name: 'Draw results',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Compares fresh results with what the user has already been told, sends at most
 * one notification, and records what was announced. Safe to call from the
 * background (no React) and from the UI.
 */
export async function announce(results: Results, fromBackground: boolean) {
  const p = fromBackground ? loadPersisted() : { ...useApp.getState() };
  const t = strings[p.lang];
  const wins = findWins(p.bonds, results).filter((w) => !p.notifiedWins.includes(winKey(w)));
  const newDraw = results.latestDraw > p.lastSeenDraw;
  if (!wins.length && !newDraw) return;

  const firstRun = p.lastSeenDraw === 0;
  if (p.notifications && !firstRun) {
    const top = wins[0];
    await Notifications.scheduleNotificationAsync({
      content: top
        ? { title: t.notifTitleWin, body: t.notifBodyWin(ordinalDraw(p.lang, top.draw), taka(p.lang, top.amount)), data: { screen: 'home' } }
        : { title: t.notifTitleNew(ordinalDraw(p.lang, results.latestDraw)), body: t.notifBodyNone, data: { screen: 'results' } },
      trigger: { channelId: 'draws' } as any,
    });
  }
  const patch = {
    lastSeenDraw: Math.max(p.lastSeenDraw, results.latestDraw),
    notifiedWins: [...new Set([...p.notifiedWins, ...wins.map(winKey)])],
  };
  if (fromBackground) savePersisted({ ...loadPersisted(), ...patch });
  else useApp.getState().set(patch);
}

TaskManager.defineTask(TASK, async () => {
  try {
    const results = await fetchResults();
    if (results) await announce(results, true);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundCheck() {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK);
    // Every 12 hours is plenty for quarterly draws and gentle on the battery.
    if (!registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 12 * 60 });
  } catch {}
}

export async function askNotificationPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
