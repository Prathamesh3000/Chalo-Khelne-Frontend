const KEY = "ck.search.recent.v1";
const MAX = 5;

export function getRecentItems() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentItem(item) {
  if (!item || !item.id || !item.type || item.type === "action") return;
  try {
    const existing = getRecentItems();
    const filtered = existing.filter(
      (i) => !(i.id === item.id && i.type === item.type)
    );
    const next = [
      {
        id: item.id,
        type: item.type,
        label: item.label,
        sublabel: item.sublabel,
        route: item.route,
      },
      ...filtered,
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort — ignore quota / disabled-storage errors
  }
}

export function clearRecentItems() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // best-effort — ignore disabled-storage errors
  }
}
