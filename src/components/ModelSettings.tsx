import { useState } from 'react';
import { Cpu, X } from 'lucide-react';
import {
  GRADING_MODELS,
  setStoredGradingModel,
  getGradingModelOption,
} from '../lib/gradingModel';

interface ModelSettingsProps {
  modelId: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSettings({ modelId, onModelChange }: ModelSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = getGradingModelOption(modelId);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleSelect = (id: string) => {
    setStoredGradingModel(id);
    onModelChange(id);
    closeModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-4 py-2 border-[2px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#111111] hover:text-white transition-all bg-white"
      >
        <Cpu className="w-3.5 h-3.5" />
        {current.label}
        {!current.freeTier && (
          <span className="text-[8px] bg-amber-400 text-black px-1 py-0.5">有料</span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-dialog-title"
        >
          <div className="w-full max-w-lg border-[3px] border-[#111111] bg-[#FDFDFC] shadow-[12px_12px_0px_#111111] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b-[2px] border-[#111111] bg-[#111111] text-white sticky top-0">
              <h2 id="model-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                採点モデル
              </h2>
              <button type="button" onClick={closeModal} className="p-1 hover:bg-white/20" aria-label="閉じる">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-[11px] font-mono leading-relaxed opacity-70">
                <a
                  href="https://ai.google.dev/gemini-api/docs/pricing?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  公式料金表
                </a>
                によると、Gemini 3.1 Pro は無料枠が「利用不可」です。無料 API キーでは Flash 系を選んでください。
              </p>

              <ul className="space-y-2">
                {GRADING_MODELS.map((model) => {
                  const selected = modelId === model.id;
                  return (
                    <li key={model.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(model.id)}
                        className={`w-full text-left p-3 border-[2px] transition-colors ${
                          selected
                            ? 'border-[#111111] bg-[#111111] text-white'
                            : 'border-[#111111]/20 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black uppercase">{model.label}</span>
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 ${
                              model.freeTier
                                ? selected
                                  ? 'bg-green-400 text-black'
                                  : 'bg-green-100 text-green-800'
                                : selected
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {model.freeTier ? '無料枠' : '有料のみ'}
                          </span>
                        </div>
                        <p className={`text-[10px] font-mono mt-1 ${selected ? 'opacity-80' : 'opacity-50'}`}>
                          {model.description}
                        </p>
                        <p className={`text-[9px] font-mono mt-0.5 ${selected ? 'opacity-60' : 'opacity-40'}`}>
                          {model.id}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={closeModal}
                className="w-full py-3 bg-[#111111] text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
