import { useState } from 'react';
import { Key, X, ExternalLink } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, maskApiKey } from '../lib/apiKey';

interface ApiKeySettingsProps {
  apiKey: string | null;
  onApiKeyChange: (key: string | null) => void;
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
}

export function ApiKeySettings({
  apiKey,
  onApiKeyChange,
  forceOpen = false,
  onForceOpenHandled,
}: ApiKeySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const showModal = isOpen || forceOpen;

  const openModal = () => {
    setInput(getStoredApiKey() ?? '');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    onForceOpenHandled?.();
  };

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setStoredApiKey(trimmed);
    onApiKeyChange(trimmed);
    closeModal();
  };

  const handleClear = () => {
    clearStoredApiKey();
    onApiKeyChange(null);
    setInput('');
    closeModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-4 py-2 border-[2px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#111111] hover:text-white transition-all bg-white"
      >
        <Key className="w-3.5 h-3.5" />
        {apiKey ? `API Key: ${maskApiKey(apiKey)}` : 'API Key を設定'}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-dialog-title"
        >
          <div className="w-full max-w-md border-[3px] border-[#111111] bg-[#FDFDFC] shadow-[12px_12px_0px_#111111]">
            <div className="flex items-center justify-between p-4 border-b-[2px] border-[#111111] bg-[#111111] text-white">
              <h2 id="api-key-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4" />
                Gemini API Key
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 hover:bg-white/20 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-[11px] font-mono leading-relaxed opacity-70">
                各自の API キーをブラウザに保存して利用します。キーはこの端末の localStorage にのみ保存され、サーバーには送信されません。
              </p>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">API Key</span>
                <input
                  type="password"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  className="mt-2 w-full px-3 py-2 border-[2px] border-[#111111] font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </label>

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 hover:underline"
              >
                Google AI Studio でキーを取得
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!input.trim()}
                  className="flex-1 py-3 bg-[#111111] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-blue-600 transition-colors"
                >
                  保存して使う
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-3 border-[2px] border-[#111111] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
