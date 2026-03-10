export interface SupplementTab {
  id: string;
  name: string;
  brand: string;
}

const KEY = "supplement_tabs";
const MAX_TABS = 8;
const EVENT = "supplementTabsUpdated";

export function getTabs(): SupplementTab[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SupplementTab[];
  } catch {
    return [];
  }
}

export function upsertTab(tab: SupplementTab): void {
  if (typeof window === "undefined") return;
  const tabs = getTabs();
  if (tabs.some((t) => t.id === tab.id)) return;
  const next = [...tabs, tab].slice(-MAX_TABS);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function removeTab(id: string): void {
  if (typeof window === "undefined") return;
  const next = getTabs().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export const TABS_EVENT = EVENT;
