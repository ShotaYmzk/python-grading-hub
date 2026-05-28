const STORAGE_KEY = 'gemini_api_key';

export function getStoredApiKey(): string | null {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    return key?.trim() || null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
