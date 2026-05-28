const STORAGE_KEY = 'grading_model';

export interface GradingModelOption {
  id: string;
  label: string;
  description: string;
  freeTier: boolean;
}

/** https://ai.google.dev/gemini-api/docs/pricing?hl=ja に基づく */
export const GRADING_MODELS: GradingModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: '無料枠あり・バランス良好（推奨）',
    freeTier: true,
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    description: '無料枠あり・高品質 Flash',
    freeTier: true,
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    description: '無料枠あり・最新 Flash',
    freeTier: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    description: '無料枠あり・軽量・大量採点向け',
    freeTier: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    description: '無料枠なし・要 有料アカウント',
    freeTier: false,
  },
];

export const DEFAULT_GRADING_MODEL = 'gemini-2.5-flash';

export function getStoredGradingModel(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && GRADING_MODELS.some((m) => m.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_GRADING_MODEL;
}

export function setStoredGradingModel(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

export function getGradingModelOption(modelId: string): GradingModelOption {
  return GRADING_MODELS.find((m) => m.id === modelId) ?? GRADING_MODELS[0];
}
