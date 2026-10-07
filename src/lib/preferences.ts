/** Per-browser UI preferences (not sensitive): stored in readable cookies so the server renders them. */
export function setPreference(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export const SIDEBAR_COOKIE = 'sa_sidebar';

/** Switches the accent preset now and for the next visits. */
export function applyPreset(id: string): void {
  document.documentElement.dataset.theme = id;
  setPreference('sa_preset', id);
}
