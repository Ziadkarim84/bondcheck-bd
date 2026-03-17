import cron from 'node-cron';
import { fetchLatestResults, saveDrawResults } from '../services/resultFetcher';
import { runMatchingEngine } from '../services/matchingEngine';

/**
 * Draw schedule: last day of January, April, July, October.
 * We run at 6:00 AM and 12:00 PM on every day in draw months,
 * so we catch results as soon as they are published.
 */
export function startScheduler() {
  // Run at 06:00 and 12:00 on all days in Jan, Apr, Jul, Oct
  cron.schedule('0 6,12 * 1,4,7,10 *', async () => {
    console.log('[Scheduler] Checking for new prize bond results...');
    try {
      const scraped = await fetchLatestResults();
      if (scraped.length === 0) {
        console.log('[Scheduler] No new results found');
        return;
      }
      const saved = await saveDrawResults(scraped);
      const matches = await runMatchingEngine();
      console.log(`[Scheduler] Saved ${saved} results, found ${matches} new matches`);
    } catch (err) {
      console.error('[Scheduler] Error fetching results:', err);
    }
  });

  console.log('[Scheduler] Prize bond result check scheduled (Jan/Apr/Jul/Oct at 06:00 & 12:00)');
}
