# Play Console "Data safety" answers

Does your app collect or share any of the required user data types? **Yes** (because of AdMob).

| Data type | Collected | Shared | Why | Optional |
|---|---|---|---|---|
| Device or other IDs (advertising ID) | Yes | Yes (Google AdMob) | Advertising, analytics | No (Pro removes ads) |
| Approximate location (from IP, by AdMob) | Yes | Yes (Google AdMob) | Advertising | No |
| App interactions (ad interactions) | Yes | Yes (Google AdMob) | Advertising, analytics | No |
| Crash logs / diagnostics (AdMob SDK) | Yes | Yes | Analytics | No |
| Purchase history | Yes (Google Play) | No | App functionality (Pro unlock) | Yes |

- Encrypted in transit: **Yes**.
- Users can request deletion: **Yes**. All app data is on the device; uninstalling deletes it.
- Bond numbers: **not collected** (they never leave the device, except in a backup file the user makes).

Other declarations (2026-09-27): ads yes; sign-in not required (Pro only lifts the bond limit and removes ads); advertising ID yes (advertising); target audience 18+; government/financial/health: no; privacy policy https://bondcheck.hundredships.com/privacy/.
