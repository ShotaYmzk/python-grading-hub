import { useState } from 'react';
import { Key, X, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  getStoredApiKeys,
  addStoredApiKey,
  removeStoredApiKey,
  clearStoredApiKeys,
  maskApiKey,
} from '../lib/apiKey';

interface ApiKeySettingsProps {
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
}

export function ApiKeySettings({
  apiKeys,
  onApiKeysChange,
  forceOpen = false,
  onForceOpenHandled,
}: ApiKeySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const showModal = isOpen || forceOpen;

  const openModal = () => {
    setInput('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    onForceOpenHandled?.();
  };

  const refreshKeys = () => {
    onApiKeysChange(getStoredApiKeys());
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    addStoredApiKey(trimmed);
    setInput('');
    refreshKeys();
  };

  const handleRemove = (index: number) => {
    removeStoredApiKey(index);
    refreshKeys();
  };

  const handleClearAll = () => {
    clearStoredApiKeys();
    onApiKeysChange([]);
    setInput('');
    closeModal();
  };

  const buttonLabel =
    apiKeys.length === 0
      ? 'API Key を設定'
      : apiKeys.length === 1
        ? `API Key: ${maskApiKey(apiKeys[0])}`
        : `API Keys: ${apiKeys.length} 件`;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-4 py-2 border-[2px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#111111] hover:text-white transition-all bg-white"
      >
        <Key className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-dialog-title"
        >
          <div className="w-full max-w-lg border-[3px] border-[#111111] bg-[#FDFDFC] shadow-[12px_12px_0px_#111111] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b-[2px] border-[#111111] bg-[#111111] text-white sticky top-0">
              <h2 id="api-key-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4" />
                Gemini API Keys
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
                複数の API キーを登録すると、採点ごとにキーをローテーションし、レート制限時は自動で次のキーに切り替えます。キーはこの端末の localStorage にのみ保存されます。
              </p>

              {apiKeys.length > 0 && (
                <ul className="space-y-2">
                  {apiKeys.map((key, index) => (
                    <li
                      key={`${maskApiKey(key)}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 border-[2px] border-[#111111]/20 bg-white"
                    >
                      <span className="text-[11px] font-mono font-bold">
                        #{index + 1} {maskApiKey(key)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                        aria-label={`キー ${index + 1} を削除`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                  キーを追加
                </span>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="AIza..."
                    autoComplete="off"
                    className="flex-1 px-3 py-2 border-[2px] border-[#111111] font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-[#111111] text-white disabled:opacity-30 hover:bg-blue-600 transition-colors"
                    aria-label="キーを追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
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
                  onClick={closeModal}
                  className="flex-1 py-3 bg-[#111111] text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                >
                  {apiKeys.length > 0 ? '完了' : '閉じる'}
                </button>
                {apiKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-4 py-3 border-[2px] border-[#111111] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    すべて削除
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
