const MIN_QUERY_LENGTH = 2;
const state = {
  allTabs: [],
  matches: [],
  selectedIndex: 0,
  duplicateGroups: [],
  pendingCloseIds: []
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  refreshButton: document.querySelector("#refreshButton"),
  statusText: document.querySelector("#statusText"),
  results: document.querySelector("#results"),
  closeMatchingButton: document.querySelector("#closeMatchingButton"),
  keepOneButton: document.querySelector("#keepOneButton"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  includePinnedCheck: document.querySelector("#includePinnedCheck"),
  confirmActionButton: document.querySelector("#confirmActionButton"),
  dedupeDialog: document.querySelector("#dedupeDialog"),
  dedupeMessage: document.querySelector("#dedupeMessage"),
  dedupeGroups: document.querySelector("#dedupeGroups"),
  dedupeIncludePinnedCheck: document.querySelector("#dedupeIncludePinnedCheck"),
  confirmDedupeButton: document.querySelector("#confirmDedupeButton")
};

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  bindEvents();
  await refreshTabs();
  elements.searchInput.focus();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", render);
  elements.searchInput.addEventListener("keydown", handleSearchKeydown);
  elements.refreshButton.addEventListener("click", refreshTabs);
  elements.closeMatchingButton.addEventListener("click", confirmCloseMatching);
  elements.keepOneButton.addEventListener("click", openDedupeReview);

  elements.confirmDialog.addEventListener("close", async () => {
    if (elements.confirmDialog.returnValue === "confirm") {
      await closeTabs(state.pendingCloseIds, elements.includePinnedCheck.checked);
    }
    state.pendingCloseIds = [];
    elements.confirmDialog.returnValue = "";
  });

  elements.dedupeDialog.addEventListener("close", async () => {
    if (elements.dedupeDialog.returnValue === "confirm") {
      await closeSelectedDuplicates();
    }
    elements.dedupeDialog.returnValue = "";
  });
}

async function refreshTabs() {
  setStatus("Refreshing tabs...");
  const response = await sendMessage({ type: "tabs:list" });
  state.allTabs = response.tabs || [];
  render();
}

function render() {
  const query = normalizeQuery(elements.searchInput.value);

  if (query.length < MIN_QUERY_LENGTH) {
    state.matches = [];
    state.duplicateGroups = [];
    state.selectedIndex = 0;
    elements.closeMatchingButton.disabled = true;
    elements.keepOneButton.disabled = true;
    setStatus("Type at least 2 characters.");
    renderEmpty("Search all open tab titles and URLs across browser windows.");
    return;
  }

  state.matches = state.allTabs
    .filter((tab) => tabMatchesQuery(tab, query))
    .sort(sortTabs);

  state.duplicateGroups = findDuplicateGroups(state.matches);
  state.selectedIndex = Math.min(state.selectedIndex, Math.max(state.matches.length - 1, 0));

  elements.closeMatchingButton.disabled = state.matches.length === 0;
  elements.keepOneButton.disabled = state.duplicateGroups.length === 0;

  if (state.matches.length === 0) {
    setStatus("No matching tabs.");
    renderEmpty("No tab titles or URLs contain this search.");
    return;
  }

  const duplicateCount = state.duplicateGroups.reduce((total, group) => total + group.tabs.length, 0);
  setStatus(`${state.matches.length} match${state.matches.length === 1 ? "" : "es"} found${duplicateCount ? `, ${duplicateCount} in duplicate groups` : ""}.`);
  renderResults();
}

function renderResults() {
  elements.results.replaceChildren(...state.matches.map((tab, index) => createResultButton(tab, index)));
}

function createResultButton(tab, index) {
  const button = document.createElement("button");
  button.className = "result";
  button.type = "button";
  button.role = "option";
  button.dataset.index = String(index);
  button.setAttribute("aria-selected", String(index === state.selectedIndex));

  const favicon = createFavicon(tab);
  const text = document.createElement("div");
  text.className = "tab-text";

  const title = document.createElement("div");
  title.className = "tab-title";
  title.textContent = tab.title;

  const subtitle = document.createElement("div");
  subtitle.className = "tab-subtitle";

  const host = document.createElement("span");
  host.className = "tab-host";
  host.textContent = tab.host || "Browser tab";

  const windowLabel = document.createElement("span");
  windowLabel.textContent = tab.currentWindow ? "Current window" : `Window ${tab.windowId}`;

  subtitle.append(host, windowLabel);
  text.append(title, subtitle);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = tab.pinned ? "Pinned" : tab.active ? "Active" : `#${tab.index + 1}`;

  button.append(favicon, text, badge);
  button.addEventListener("click", () => activateTab(tab.id));
  button.addEventListener("mouseenter", () => updateSelection(index));

  return button;
}

function createFavicon(tab) {
  if (tab.favIconUrl) {
    const img = document.createElement("img");
    img.className = "favicon";
    img.src = tab.favIconUrl;
    img.alt = "";
    return img;
  }

  const fallback = document.createElement("span");
  fallback.className = "favicon fallback";
  fallback.textContent = (tab.host || tab.title || "?").slice(0, 1).toUpperCase();
  return fallback;
}

function renderEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  elements.results.replaceChildren(empty);
}

function handleSearchKeydown(event) {
  if (event.key === "Escape") {
    closeSearchWindow();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    updateSelection(Math.min(state.selectedIndex + 1, state.matches.length - 1));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    updateSelection(Math.max(state.selectedIndex - 1, 0));
    return;
  }

  if (event.key === "Enter" && state.matches[state.selectedIndex]) {
    event.preventDefault();
    activateTab(state.matches[state.selectedIndex].id);
    return;
  }

  if (event.altKey && event.key.toLocaleLowerCase() === "c" && state.matches.length > 0) {
    event.preventDefault();
    confirmCloseMatching();
    return;
  }

  if (event.altKey && event.key.toLocaleLowerCase() === "k" && state.duplicateGroups.length > 0) {
    event.preventDefault();
    openDedupeReview();
  }
}

function updateSelection(index) {
  if (state.matches.length === 0) {
    state.selectedIndex = 0;
    return;
  }

  state.selectedIndex = index;
  [...elements.results.querySelectorAll(".result")].forEach((result, resultIndex) => {
    const selected = resultIndex === state.selectedIndex;
    result.setAttribute("aria-selected", String(selected));
    if (selected) {
      result.scrollIntoView({ block: "nearest" });
    }
  });
}

async function activateTab(tabId) {
  const response = await sendMessage({ type: "tabs:activate", tabId });
  if (response.ok === false) {
    setStatus(response.error || "Could not activate tab.");
    await refreshTabs();
    return;
  }

  closeSearchWindow();
}

function confirmCloseMatching() {
  const protectedCount = state.matches.filter((tab) => tab.pinned).length;
  state.pendingCloseIds = state.matches.map((tab) => tab.id);
  elements.includePinnedCheck.checked = false;
  elements.confirmTitle.textContent = "Close matching tabs?";
  elements.confirmMessage.textContent = `This will close ${state.matches.length} matching tab${state.matches.length === 1 ? "" : "s"}${protectedCount ? `, excluding ${protectedCount} pinned tab${protectedCount === 1 ? "" : "s"} by default` : ""}.`;
  elements.confirmDialog.showModal();
}

async function closeTabs(tabIds, includePinned) {
  const response = await sendMessage({ type: "tabs:close", tabIds, includePinned });
  if (response.ok === false) {
    setStatus(response.error || "Could not close tabs.");
  } else {
    setStatus(`Closed ${response.closed} tab${response.closed === 1 ? "" : "s"}${response.skipped ? `, skipped ${response.skipped}` : ""}.`);
  }
  await refreshTabs();
}

function openDedupeReview() {
  elements.dedupeGroups.replaceChildren(...state.duplicateGroups.map(createDedupeGroup));
  const closingCount = state.duplicateGroups.reduce((total, group) => total + group.tabs.length - 1, 0);
  elements.dedupeMessage.textContent = `${state.duplicateGroups.length} duplicate group${state.duplicateGroups.length === 1 ? "" : "s"} found. ${closingCount} tab${closingCount === 1 ? "" : "s"} can be closed.`;
  elements.dedupeIncludePinnedCheck.checked = false;
  elements.dedupeDialog.showModal();
}

function createDedupeGroup(group) {
  const section = document.createElement("section");
  section.className = "dedupe-group";
  section.dataset.groupKey = group.groupKey;

  const heading = document.createElement("h3");
  heading.textContent = group.label;
  section.append(heading);

  group.tabs.forEach((tab) => {
    const label = document.createElement("label");
    label.className = "radio-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `keep-${group.groupKey}`;
    radio.value = String(tab.id);
    radio.checked = tab.id === group.recommendedKeepTabId;

    const text = document.createElement("span");
    text.textContent = `${tab.title} - ${tab.host}${tab.pinned ? " - pinned" : ""}`;

    label.append(radio, text);
    section.append(label);
  });

  return section;
}

async function closeSelectedDuplicates() {
  const idsToClose = [];

  for (const group of state.duplicateGroups) {
    const selected = elements.dedupeGroups.querySelector(`input[name="keep-${cssEscape(group.groupKey)}"]:checked`);
    const keepId = Number(selected?.value || group.recommendedKeepTabId);
    group.tabs.forEach((tab) => {
      if (tab.id !== keepId) {
        idsToClose.push(tab.id);
      }
    });
  }

  await closeTabs(idsToClose, elements.dedupeIncludePinnedCheck.checked);
}

function findDuplicateGroups(tabs) {
  const groups = new Map();

  for (const tab of tabs) {
    const key = `${normalizeOrigin(tab.url)}::${normalizeTitle(tab.title)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tab);
  }

  return [...groups.entries()]
    .filter(([_key, groupTabs]) => groupTabs.length > 1)
    .map(([groupKey, groupTabs]) => {
      const sorted = [...groupTabs].sort(sortKeepCandidate);
      return {
        groupKey,
        label: sorted[0].title,
        recommendedKeepTabId: sorted[0].id,
        tabs: sorted
      };
    });
}

function sortTabs(a, b) {
  return Number(b.currentWindow) - Number(a.currentWindow)
    || Number(b.active) - Number(a.active)
    || (b.lastAccessed || 0) - (a.lastAccessed || 0)
    || a.windowId - b.windowId
    || a.index - b.index;
}

function sortKeepCandidate(a, b) {
  return Number(b.active) - Number(a.active)
    || Number(b.currentWindow) - Number(a.currentWindow)
    || (b.lastAccessed || 0) - (a.lastAccessed || 0)
    || a.index - b.index;
}

function normalizeQuery(value) {
  return value.trim().toLocaleLowerCase();
}

function tabMatchesQuery(tab, query) {
  return [
    tab.title,
    tab.url,
    tab.host
  ].some((value) => (value || "").toLocaleLowerCase().includes(query));
}

function normalizeTitle(title) {
  return title
    .toLocaleLowerCase()
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/\s+[-|]\s+(youtube|google docs|docs|github|gmail|notion|slack)$/i, "")
    .trim();
}

function normalizeOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin.toLocaleLowerCase();
  } catch (_error) {
    return "";
  }
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function closeSearchWindow() {
  chrome.runtime
    .sendMessage({ type: "window:close-search" })
    .finally(() => window.close());
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}
