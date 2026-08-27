# Atelier Problem Notes

The coding companion for Atelier. This local-first Chrome extension adds a native-looking **Notes** tab beside each site's LeetCode and NeetCode problem tabs, then syncs its data into Atelier while the app is running. It stores:

- notes per problem;
- the highest visible page-timer value;
- accepted and failed submission attempts;
- a **Hole in one** badge when the first recorded submission is accepted.
- whether the problem was solved in 20 minutes or less;
- whether hints were needed;
- whether the problem is still not understood.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Open a problem on LeetCode or NeetCode and select the new **Notes** tab.

The popup opens Atelier's Coding workspace at `http://localhost:3000/coding`. Problem data stays cached in `chrome.storage.local` for offline use and is reconciled with Atelier's local `data/coding.json` whenever Atelier is running.

The notebook includes card and category-grouped list views, pencil-based editing, and a 26-week submission activity graph. The embedded **Sync** button imports the signed-in LeetCode account history; on NeetCode it imports the current problem's submission table because NeetCode does not expose an account-wide history feed to the page.

## Detection notes

Atelier Problem Notes watches page text for a visible `MM:SS` or `HH:MM:SS` timer. Submission outcomes are read exclusively from each site's submission-history interface; there are no manual accepted/missed controls. The displayed submission total can be overridden from the Notes panel if a site's history count is incomplete, without changing any outcomes.
