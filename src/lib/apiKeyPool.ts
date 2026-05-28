const TRANSIENT_RETRY_DELAYS_MS = [5000, 10000, 15000];

function getErrorMessage(error: unknown): string {
  const err = error as { status?: number; code?: number | string; message?: string };
  return `${err?.message ?? error}`;
}

function getErrorStatus(error: unknown): number | string | undefined {
  const err = error as { status?: number; code?: number | string };
  return err?.status ?? err?.code;
}

export function isRateLimitError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 429 || status === '429' || status === 'RESOURCE_EXHAUSTED') {
    return true;
  }

  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('exceeded')
  );
}

export function isOverloadedError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 503 || status === '503' || status === 'UNAVAILABLE') {
    return true;
  }

  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

function isTransientError(error: unknown): boolean {
  return isRateLimitError(error) || isOverloadedError(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiKeyPool {
  private index = 0;

  constructor(private readonly keys: string[]) {
    this.keys = keys.map((k) => k.trim()).filter(Boolean);
  }

  get count(): number {
    return this.keys.length;
  }

  async execute<T>(fn: (apiKey: string) => Promise<T>): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error('API キーが設定されていません。画面上部から Gemini API Key を設定してください。');
    }

    const totalKeys = this.keys.length;
    let lastError: unknown;

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const keyIndex = (this.index + keyAttempt) % totalKeys;
      const apiKey = this.keys[keyIndex];

      for (let retry = 0; retry <= TRANSIENT_RETRY_DELAYS_MS.length; retry++) {
        try {
          const result = await fn(apiKey);
          this.index = (keyIndex + 1) % totalKeys;
          return result;
        } catch (error) {
          lastError = error;

          if (isOverloadedError(error) && retry < TRANSIENT_RETRY_DELAYS_MS.length) {
            await sleep(TRANSIENT_RETRY_DELAYS_MS[retry]);
            continue;
          }

          if (isRateLimitError(error) && keyAttempt < totalKeys - 1) {
            break;
          }

          if (isTransientError(error)) {
            throw formatTransientError(error, totalKeys);
          }

          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : formatTransientError(lastError, totalKeys);
  }
}

function formatTransientError(error: unknown, keyCount: number): Error {
  if (isOverloadedError(error)) {
    return new Error(
      'Gemini サーバーが混雑しています（503）。数十秒待ってから、失敗した提出だけ再採点してください。'
    );
  }

  const hint =
    keyCount > 1 ? `登録済みの ${keyCount} 個の API キーすべてで試行しました。` : '';

  return new Error(
    `レート制限またはクォータ上限に達しました。${hint}2〜3分待つか、採点モデルを Flash-Lite に変えてから再実行してください。`
  );
}
