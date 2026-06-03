const SEARCH_WINDOW_URL = chrome.runtime.getURL("search.html?mode=window");
let searchWindowId = null;
let sourceWindowId = null;

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-tab-search") {
    openSearchWindow();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const actions = {
    "tabs:list": handleListTabs,
    "tabs:activate": handleActivateTab,
    "tabs:close": handleCloseTabs,
    "window:close-search": handleCloseSearchWindow
  };

  const handler = actions[message?.type];
  if (!handler) {
    return false;
  }

  handler(message, sender)
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === searchWindowId) {
    searchWindowId = null;
  }
});

async function openSearchWindow() {
  if (searchWindowId !== null) {
    try {
      await chrome.windows.update(searchWindowId, { focused: true });
      return;
    } catch (_error) {
      searchWindowId = null;
    }
  }

  const currentWindow = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
  sourceWindowId = currentWindow?.id ?? null;
  const left = currentWindow?.left !== undefined ? currentWindow.left + 80 : undefined;
  const top = currentWindow?.top !== undefined ? currentWindow.top + 80 : undefined;

  const created = await chrome.windows.create({
    url: SEARCH_WINDOW_URL,
    type: "popup",
    width: 680,
    height: 560,
    focused: true,
    left,
    top
  });

  searchWindowId = created.id ?? null;
}

async function handleListTabs() {
  const [tabs, focusedWindow] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null)
  ]);
  const currentWindowId = sourceWindowId ?? focusedWindow?.id;

  return {
    tabs: tabs
      .filter((tab) => tab.id !== undefined && tab.windowId !== searchWindowId)
      .map((tab) => normalizeTab(tab, currentWindowId))
  };
}

async function handleActivateTab(message) {
  const tabId = Number(message.tabId);
  if (!Number.isInteger(tabId)) {
    throw new Error("Invalid tab id.");
  }

  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });

  return {};
}

async function handleCloseTabs(message) {
  const requestedIds = Array.isArray(message.tabIds) ? message.tabIds : [];
  const includePinned = Boolean(message.includePinned);
  const uniqueIds = [...new Set(requestedIds.map(Number).filter(Number.isInteger))];

  let closed = 0;
  let skipped = 0;

  for (const tabId of uniqueIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.pinned && !includePinned) {
        skipped += 1;
        continue;
      }

      await chrome.tabs.remove(tabId);
      closed += 1;
    } catch (_error) {
      skipped += 1;
    }
  }

  return { closed, skipped };
}

async function handleCloseSearchWindow(_message, sender) {
  const windowId = sender.tab?.windowId;
  if (windowId === undefined) {
    return {};
  }

  await chrome.windows.remove(windowId);
  return {};
}

function normalizeTab(tab, currentWindowId) {
  const url = tab.url || "";

  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || "(Untitled tab)",
    url,
    host: getHost(url),
    favIconUrl: tab.favIconUrl || "",
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    muted: Boolean(tab.mutedInfo?.muted),
    lastAccessed: tab.lastAccessed || 0,
    currentWindow: tab.windowId === currentWindowId
  };
}

function getHost(value) {
  try {
    const url = new URL(value);
    return url.host || value;
  } catch (_error) {
    return value;
  }
}
