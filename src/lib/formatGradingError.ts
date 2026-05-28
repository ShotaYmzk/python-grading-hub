export function formatGradingError(raw: string | null): string {
  if (!raw) return '不明なエラーが発生しました。';

  try {
    const jsonStart = raw.indexOf('{');
    if (jsonStart >= 0) {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string; code?: number };
        message?: string;
      };
      const msg = parsed?.error?.message ?? parsed?.message;
      if (msg) return msg;
    }
  } catch {
    /* use raw */
  }

  return raw;
}
