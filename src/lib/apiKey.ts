const STORAGE_KEY = 'gemini_api_keys';
const LEGACY_STORAGE_KEY = 'gemini_api_key';

function readKeysRaw(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((k) => String(k).trim()).filter(Boolean);
}

function migrateLegacyKey(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy?.trim()) return;

    const keys = readKeysRaw();
    if (!keys.includes(legacy.trim())) {
      setStoredApiKeys([...keys, legacy.trim()]);
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredApiKeys(): string[] {
  try {
    migrateLegacyKey();
    return readKeysRaw();
  } catch {
    return [];
  }
}

export function setStoredApiKeys(keys: string[]): void {
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function addStoredApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) return;
  const keys = getStoredApiKeys();
  if (keys.includes(trimmed)) return;
  setStoredApiKeys([...keys, trimmed]);
}

export function removeStoredApiKey(index: number): void {
  const keys = getStoredApiKeys();
  setStoredApiKeys(keys.filter((_, i) => i !== index));
}

export function clearStoredApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
