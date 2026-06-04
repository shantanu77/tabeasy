# Deployment and Installation

TabsEasy is a Manifest V3 Chromium extension. It can be installed unpacked in Google Chrome and Microsoft Edge during development.

## Install in Google Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `tabseasy` project directory.
5. Open `chrome://extensions/shortcuts`.
6. Confirm or change the `TabsEasy` shortcut. The default is `Ctrl+Shift+F`.

## Install in Microsoft Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `tabseasy` project directory.
5. Open `edge://extensions/shortcuts`.
6. Confirm or change the `TabsEasy` shortcut. The default is `Ctrl+Shift+F`.

## Use

1. Press `Ctrl+Shift+F`.
2. Type at least two characters from a tab title or URL.
3. Press `Enter` to open the selected tab, or click a result.
4. Use `Close matching` to close all matching tabs after confirmation.
5. Use `Keep one each` to review duplicate groups and close duplicate tabs after confirmation.

## Package for Distribution

1. Make sure the extension loads without errors as an unpacked extension.
2. Bump the `version` field in `manifest.json`.
3. Create a zip archive from the committed source tree:

   ```bash
   git archive --format=zip -o tabseasy.zip HEAD
   ```

4. Upload the zip to the Chrome Web Store Developer Dashboard or Microsoft Partner Center.

## Local Validation

Run these checks before loading or packaging:

```bash
node --check search.js
node --check service-worker.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
git archive --format=zip -o tabseasy.zip HEAD
```

## Manual Test Checklist

Use a fresh browser window with several tabs open.

1. Load the extension unpacked from the `tabseasy` directory.
2. Confirm there are no red error messages on the extension card.
3. Open several test tabs with recognizable titles and URLs, for example GitHub, Gmail, Google Docs, and two copies of the same page.
4. Press `Ctrl+Shift+F`.
5. Type one character and confirm no results appear.
6. Type two or more characters from a known tab title and confirm matching tabs appear.
7. Type two or more characters from a known tab URL or domain and confirm matching tabs appear.
8. Use `ArrowDown` and `ArrowUp` to move through results.
9. Press `Enter` and confirm the selected tab becomes active.
10. Reopen TabsEasy and search for a title shared by multiple tabs.
11. Click `Close matching`, cancel the confirmation, and confirm no tabs close.
12. Click `Close matching` again, confirm, and verify only matching unpinned tabs close.
13. Open duplicate tabs, search for their shared title, click `Keep one each`, choose the tab to keep, confirm, and verify duplicates close.
14. Pin one matching tab and verify it is skipped unless `Include pinned tabs` is checked.
15. Repeat the shortcut and basic search flow in both Chrome and Edge.

## Troubleshooting

- If `Ctrl+Shift+F` does not open TabsEasy, open `chrome://extensions/shortcuts` or `edge://extensions/shortcuts` and assign the command manually.
- If no tabs appear, reload the extension from the extensions page and check for errors on the extension card.
- If bulk close skips tabs, confirm whether those tabs are pinned.
- If the popup closes too quickly while testing from the toolbar icon, use the keyboard shortcut to open the dedicated search window.

## Required Permissions

- `tabs`: reads tab titles and URLs, activates selected tabs, and closes tabs after confirmation.
- `storage`: reserved for extension preferences.

The extension does not request host permissions and does not send tab data to external services.
