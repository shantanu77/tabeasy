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
2. Type at least two characters from a tab title.
3. Press `Enter` to open the selected tab, or click a result.
4. Use `Close matching` to close all matching tabs after confirmation.
5. Use `Keep one each` to review duplicate groups and close duplicate tabs after confirmation.

## Package for Distribution

1. Make sure the extension loads without errors as an unpacked extension.
2. Bump the `version` field in `manifest.json`.
3. Create a zip archive containing the extension files:

   ```bash
   zip -r tabseasy.zip manifest.json service-worker.js search.html search.js styles.css LICENSE spec.md deployment.md
   ```

4. Upload the zip to the Chrome Web Store Developer Dashboard or Microsoft Partner Center.

## Required Permissions

- `tabs`: reads tab titles and URLs, activates selected tabs, and closes tabs after confirmation.
- `storage`: reserved for extension preferences.

The extension does not request host permissions and does not send tab data to external services.
