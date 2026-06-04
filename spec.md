# Tab Search Extension Spec

## Overview

Build a Chromium browser extension for Microsoft Edge and Google Chrome that lets users search across all open tabs in all open browser windows. The user presses a keyboard shortcut, types at least two characters, and sees matching tabs whose titles or URLs contain that text. From the results, the user can switch to a tab, close matching tabs, or use a deduplication summary to keep one tab from each group of similar tabs.

Working name: **TabsEasy**

## Goals

- Search open tabs across every browser window from a single keyboard shortcut.
- Match user input against tab titles and URLs quickly and predictably.
- Let users switch to any matching tab.
- Let users close all matching tabs after confirmation.
- Help users reduce duplicate or near-duplicate tabs by grouping similar results and keeping one representative tab.
- Support both Chrome and Edge using Manifest V3 and standard Chromium extension APIs.

## Non-Goals

- Search full page content inside tabs.
- Search browser history, bookmarks, downloads, or closed tabs.
- Sync tab state across devices.
- Provide cloud-based summarization in the initial release.
- Modify page content.

## Target Browsers

- Google Chrome, current stable release.
- Microsoft Edge, current stable release.
- Other Chromium browsers may work but are not part of the tested support matrix.

## User Stories

- As a user with many tabs open, I can press `Ctrl+Shift+F` and search tab titles and URLs without leaving my current browser context.
- As a user, I can type two or more characters and immediately see all tabs whose titles or URLs contain that sequence.
- As a user, I can select a result and jump directly to that tab and its window.
- As a user, I can close all tabs matching my current search after a clear confirmation.
- As a user, I can review duplicate-like tabs and keep one tab from each group while closing the others.
- As a keyboard-heavy user, I can navigate results and actions without using the mouse.

## Primary Workflow

1. User presses the configured shortcut, defaulting to `Ctrl+Shift+F`.
2. Extension opens a focused search UI.
3. User types a query.
4. Once the query has at least two non-whitespace characters, the extension lists matching tabs.
5. User chooses one of the available actions:
   - Open a selected tab.
   - Close all matching tabs.
   - Review duplicate groups and keep one tab per group.
6. Extension performs the selected action and closes or updates the UI depending on the action.

## Search Behavior

- Search source: all open tabs in all normal browser windows.
- Match fields: tab title, full URL, and URL host.
- Matching rule: case-insensitive substring match.
- Minimum query length: 2 characters after trimming leading and trailing whitespace.
- Empty and one-character queries show an idle state instead of results.
- Results update as the user types.
- Results should include tabs from minimized, background, and non-focused browser windows.
- Incognito tabs are excluded unless the extension is explicitly allowed to run in incognito mode by the browser and the implementation supports it.

## Result Display

Each result should show:

- Tab title.
- Site origin or URL host.
- Favicon when available.
- Window indicator, such as `Window 1`, `Window 2`, or the browser-provided window order.
- Active/current tab marker when applicable.

Sorting:

1. Current window results first.
2. Active tabs before inactive tabs within the same window.
3. Most recently accessed tabs before older tabs, if `lastAccessed` is available.
4. Stable fallback by window id and tab index.

Result states:

- No query: prompt to type at least two characters.
- Query too short: same as no query.
- No matches: show a clear no-results state.
- Matches found: show count and result list.
- Browser API error: show a recoverable error message.

## Actions

### Open Selected Tab

- User can click a result or press `Enter` on the highlighted result.
- Extension focuses the tab's window and activates the tab.
- Search UI closes after successful activation.

### Close All Matching Tabs

- User can trigger `Close matching`.
- Extension must show a confirmation before closing.
- Confirmation should include the number of tabs that will be closed.
- The current active tab should not be closed without explicit confirmation text indicating that the current tab is included.
- After confirmation, close every matching tab that still exists.
- If some tabs disappear before the action runs, skip them and continue.
- Show a completion message with closed and skipped counts.

### Deduplicate / Keep One Of Each Kind

Feature label: `Keep one each`

Purpose:

- Help users close duplicate or near-duplicate tabs from the current matching result set.

Grouping strategy for initial release:

- Group tabs by normalized URL origin and normalized title.
- Normalized title rules:
  - Lowercase.
  - Trim whitespace.
  - Collapse repeated whitespace.
  - Remove common unread/count prefixes such as `(3)`.
  - Optionally remove trailing separators with site names, such as ` - YouTube` or ` | Docs`, when this is reliable.

Group eligibility:

- Only groups with two or more tabs are shown as duplicate groups.
- Unique tabs are listed separately and are not affected by deduplication.

Recommended keep candidate:

1. Active tab, if one tab in the group is active.
2. Tab in the current window.
3. Most recently accessed tab.
4. Lowest tab index as stable fallback.

User flow:

1. User clicks `Keep one each`.
2. Extension shows duplicate groups from current matches.
3. Each group shows the recommended tab to keep and the tabs proposed for closing.
4. User can change which tab to keep in each group.
5. User confirms.
6. Extension closes the non-kept tabs in selected groups.

Safety:

- No deduplication close action runs without confirmation.
- Pinned tabs are excluded from automatic close by default and marked as protected.
- User can enable `Include pinned tabs` for the current action only.

Future enhancement:

- Add richer similarity scoring using URL path, domain, and title token overlap.
- Add optional local AI summarization only if the browser platform and privacy model can support it clearly.

## Keyboard and Accessibility

Default shortcut:

- `Ctrl+Shift+F`

Important note:

- Browser or page shortcuts may conflict with this command. The extension must expose the command in `chrome://extensions/shortcuts` so users can change it.

Search UI keyboard controls:

- `Esc`: close search UI.
- `ArrowDown`: move selection down.
- `ArrowUp`: move selection up.
- `Enter`: open selected tab.
- `Ctrl+Enter` or `Cmd+Enter`: open selected tab without closing UI, if technically practical.
- `Alt+C`: trigger close matching.
- `Alt+K`: trigger keep one each.

Accessibility requirements:

- Search input is focused when UI opens.
- Results use proper listbox or list semantics.
- Selected result is exposed to screen readers.
- Buttons have accessible names.
- Confirmation dialogs trap focus and return focus correctly.
- UI supports keyboard-only operation.

## Extension Architecture

Manifest version:

- Manifest V3.

Core components:

- `manifest.json`: permissions, commands, extension metadata.
- Background service worker: handles shortcut command, tab queries, tab actions, and messaging.
- Search UI: extension popup-like page opened by command.
- Optional options page: configure behavior such as pinned-tab protection and dedupe rules.

Recommended UI surface:

- Open a small extension window using `chrome.windows.create` with `type: "popup"` when the command fires.
- Alternative: use the extension action popup for toolbar access, but keyboard command should open the dedicated search UI directly.

Required permissions:

- `tabs`: read tab titles, URLs, favicons, and perform tab activation/removal.

Optional permissions:

- `storage`: persist user preferences.

Avoid host permissions in initial release because only tab metadata is needed.

## Browser APIs

Expected APIs:

- `chrome.commands.onCommand`
- `chrome.tabs.query`
- `chrome.tabs.update`
- `chrome.tabs.remove`
- `chrome.windows.update`
- `chrome.windows.create`
- `chrome.runtime.sendMessage`
- `chrome.runtime.onMessage`
- `chrome.storage.sync` or `chrome.storage.local`, if preferences are added

Edge support:

- Use the `chrome.*` extension API namespace, which is supported by Edge Chromium.

## Data Model

Tab result object:

```json
{
  "id": 123,
  "windowId": 456,
  "index": 7,
  "title": "Example page title",
  "url": "https://example.com/path",
  "host": "example.com",
  "favIconUrl": "https://example.com/favicon.ico",
  "active": false,
  "pinned": false,
  "lastAccessed": 1770000000000
}
```

Duplicate group object:

```json
{
  "groupKey": "example.com::example page title",
  "recommendedKeepTabId": 123,
  "tabs": [123, 124, 125],
  "protectedTabIds": [125]
}
```

## UI Requirements

Search window:

- Compact, fast-loading interface.
- Width: approximately 640 px on desktop.
- Height: approximately 520 px, with scrollable results.
- Search box at top.
- Result count and action buttons below or beside search box.
- Results below controls.

Visual states:

- Idle state for query length below two characters.
- Loading state only if tab query takes noticeable time.
- No-results state.
- Results state.
- Confirmation modal for destructive actions.
- Deduplication review state.

Actions should be disabled when not applicable:

- `Close matching` disabled when there are zero matches.
- `Keep one each` disabled when there are no duplicate groups.

## Privacy and Security

- All processing happens locally in the extension.
- No tab titles, URLs, or browsing data are sent to external services.
- Do not request broad host permissions.
- Do not inject scripts into pages for the initial release.
- Do not persist tab lists unless a future feature explicitly requires it.
- If analytics are ever added, they must be opt-in and must not include URLs or tab titles.

## Error Handling

- If a tab cannot be activated, show an error and refresh the result list.
- If a tab cannot be closed, skip it and report the skipped count.
- If permissions are missing, show a clear message with instructions to grant required extension permissions.
- If the command shortcut is unavailable or conflicting, document how to set it manually in browser extension shortcut settings.

## Performance Requirements

- Query all tabs and render results in under 150 ms for up to 500 open tabs on a typical laptop.
- Debounce search input by 50-100 ms if needed.
- Avoid querying tabs on every keystroke if a cached tab list from the currently open search session is fresh.
- Refresh tab list before destructive actions to avoid acting on stale tab ids.
- Keep the extension service worker lightweight.

## Settings

Initial settings:

- Protect pinned tabs from bulk close: enabled by default.
- Include incognito tabs: disabled by default and available only when browser support and permissions allow.
- Default action after opening a tab: close search UI.
- Dedupe grouping strictness:
  - Strict: same origin and same normalized title.
  - Balanced: same origin and highly similar normalized title.

Settings can be implemented after the core workflow if needed.

## Acceptance Criteria

- Pressing `Ctrl+Shift+F` opens the search UI in Chrome.
- Pressing `Ctrl+Shift+F` opens the search UI in Edge.
- Typing fewer than two characters does not show tab matches.
- Typing two or more characters shows every open tab whose title or URL contains that string, case-insensitively.
- Search covers tabs across all open normal browser windows.
- Selecting a result focuses the correct window and activates the correct tab.
- `Close matching` asks for confirmation and then closes matching tabs.
- `Close matching` reports how many tabs were closed and how many were skipped.
- `Keep one each` shows duplicate groups for matching tabs.
- Deduplication keeps one selected tab in each group and closes the others only after confirmation.
- Pinned tabs are protected from bulk close and dedupe close by default.
- The extension does not request unnecessary host permissions.

## Test Plan

Manual test cases:

- Search in one window with several matching and non-matching tabs.
- Search across two or more windows.
- Search with different casing.
- Search with whitespace around the query.
- Search with exactly one character.
- Search with no matches.
- Open a result from another window.
- Close all matching tabs after confirmation.
- Cancel close confirmation and verify no tabs are closed.
- Run dedupe with exact duplicate titles and origins.
- Change the kept tab in a duplicate group.
- Verify pinned tabs are not closed by default.
- Verify behavior when a matching tab is manually closed before confirming an action.
- Verify shortcut can be changed from browser extension shortcut settings.

Automated tests, where practical:

- Unit tests for title and URL matching.
- Unit tests for title normalization.
- Unit tests for duplicate grouping.
- Unit tests for keep-candidate selection.
- Integration tests with mocked `chrome.tabs` and `chrome.windows` APIs.

## Implementation Milestones

1. Create Manifest V3 extension skeleton with command registration.
2. Implement keyboard command and search window opening.
3. Implement tab querying and title/URL search.
4. Implement result list and keyboard navigation.
5. Implement tab activation.
6. Implement close matching with confirmation.
7. Implement duplicate grouping and review UI.
8. Implement pinned-tab protection.
9. Add settings persistence.
10. Test in Chrome and Edge.

## Open Questions

- Should title matches rank above URL-only matches?
- Should the default shortcut be changed if `Ctrl+Shift+F` conflicts too often with browser or web-app shortcuts?
- Should duplicate grouping be strict-only for v1, with balanced matching deferred?
- Should the extension remember the previous query when reopened?
- Should the UI remain open after activating a tab, or close by default with a setting to change it?
