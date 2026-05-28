import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCode, 
  GraduationCap, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  BookOpen,
  ClipboardList,
  Upload,
  Copy,
  Check,
  User,
  Trash2,
  Users,
  RotateCw
} from 'lucide-react';
import { ReportMarkdown } from './components/ReportMarkdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ASSIGNMENT_TASKS } from './constants';
import { gradeSubmission } from './services/geminiService';
import { getStoredApiKeys } from './lib/apiKey';
import { ApiKeyPool } from './lib/apiKeyPool';
import { ApiKeySettings } from './components/ApiKeySettings';
import { ModelSettings } from './components/ModelSettings';
import { getStoredGradingModel } from './lib/gradingModel';
import { formatGradingError } from './lib/formatGradingError';
import {
  loadSubmissions,
  saveSubmissions,
  clearSubmissions,
  forceRewriteAllStoredReports,
  type StudentSubmission,
} from './lib/submissionStorage';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const parseIpynb = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    const nb = JSON.parse(text);
    const codeCells = nb.cells?.filter((c: any) => c.cell_type === 'code') || [];
    return codeCells
      .map((c: any) => {
        const source = Array.isArray(c.source) ? c.source.join('') : c.source;
        return source;
      })
      .join('\n\n# --- New Cell ---\n\n');
  } catch (e) {
    throw new Error('IPYNBファイルの解析に失敗しました。');
  }
};

export default function App() {
  const [selectedTaskId, setSelectedTaskId] = useState(ASSIGNMENT_TASKS[0].id);
  // Store submissions mapped by taskId
  const [submissionsByTask, setSubmissionsByTask] = useState<Record<string, StudentSubmission[]>>(
    () => loadSubmissions()
  );
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [gradingModelId, setGradingModelId] = useState(getStoredGradingModel);
  const keyPoolRef = useRef<ApiKeyPool | null>(null);

  const BULK_GRADE_DELAY_MS = 6000;

  useEffect(() => {
    const keys = getStoredApiKeys();
    setApiKeys(keys);
    keyPoolRef.current = keys.length > 0 ? new ApiKeyPool(keys) : null;
  }, []);

  useEffect(() => {
    saveSubmissions(submissionsByTask);
  }, [submissionsByTask]);

  const handleClearLocalData = () => {
    if (!confirm('このブラウザに保存した提出・採点データをすべて削除しますか？')) return;
    clearSubmissions();
    setSubmissionsByTask({});
  };

  const handleRewriteStoredReports = () => {
    const count = forceRewriteAllStoredReports();
    setSubmissionsByTask(loadSubmissions());
    alert(
      count > 0
        ? `保存済みレポート ${count} 件を読みやすい形式に書き換えました。`
        : '変更はありませんでした。ページを再読み込みして表示を確認してください。'
    );
  };

  const syncApiKeys = (keys: string[]) => {
    setApiKeys(keys);
    keyPoolRef.current = keys.length > 0 ? new ApiKeyPool(keys) : null;
  };

  const requireApiKey = (): boolean => {
    if (apiKeys.length > 0) return true;
    setShowApiKeyPrompt(true);
    return false;
  };

  const selectedTask = ASSIGNMENT_TASKS.find(t => t.id === selectedTaskId)!;
  const currentSubmissions = submissionsByTask[selectedTaskId] || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const existingFilenames = new Set(
      (submissionsByTask[selectedTaskId] || []).map((s) => s.filename.toLowerCase())
    );
    const addedInBatch = new Set<string>();
    const skipped: string[] = [];
    const newSubmissions: StudentSubmission[] = [];

    for (const file of files) {
      const normalizedName = file.name.toLowerCase();
      if (existingFilenames.has(normalizedName) || addedInBatch.has(normalizedName)) {
        skipped.push(file.name);
        continue;
      }

      try {
        const sourceCode = await parseIpynb(file);
        addedInBatch.add(normalizedName);
        newSubmissions.push({
          id: Math.random().toString(36).substr(2, 9),
          studentName: file.name.replace('.ipynb', ''),
          filename: file.name,
          sourceCode,
          report: null,
          status: 'idle',
          error: null
        });
      } catch (err: any) {
        alert(`${file.name}: ${err.message}`);
      }
    }

    if (skipped.length > 0) {
      alert(
        `${selectedTask.title} に同じファイル名が既にあるため、次をスキップしました:\n\n${skipped.join('\n')}`
      );
    }

    if (newSubmissions.length > 0) {
      setSubmissionsByTask((prev) => ({
        ...prev,
        [selectedTaskId]: [...(prev[selectedTaskId] || []), ...newSubmissions],
      }));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const gradeOne = async (taskId: string, subId: string, source: string) => {
    const pool = keyPoolRef.current;
    if (!pool) return;

    setSubmissionsByTask(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s => s.id === subId ? { ...s, status: 'grading', error: null } : s)
    }));
    
    try {
      const result = await gradeSubmission(
        pool,
        gradingModelId,
        taskId,
        ASSIGNMENT_TASKS.find(t => t.id === taskId)!.title,
        ASSIGNMENT_TASKS.find(t => t.id === taskId)!.description,
        source
      );
      setSubmissionsByTask(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(s => s.id === subId ? { ...s, report: result, status: 'done' } : s)
      }));
    } catch (err: any) {
      setSubmissionsByTask(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(s => s.id === subId ? { ...s, status: 'error', error: err.message } : s)
      }));
    }
  };

  const handleGradeSubmission = async (subId: string, source: string) => {
    if (!requireApiKey() || !keyPoolRef.current) return;
    if (isBulkGrading) return;
    const sub = currentSubmissions.find((s) => s.id === subId);
    if (sub?.status === 'grading') return;
    await gradeOne(selectedTaskId, subId, source);
  };

  const handleBulkGrade = async () => {
    if (!requireApiKey() || !keyPoolRef.current) return;
    setIsBulkGrading(true);
    const taskSubmissions = [...currentSubmissions];
    
    for (let i = 0; i < taskSubmissions.length; i++) {
      const sub = taskSubmissions[i];
      if (sub.status !== 'done') {
        await gradeOne(selectedTaskId, sub.id, sub.sourceCode);
        if (i < taskSubmissions.length - 1) {
          await new Promise((r) => setTimeout(r, BULK_GRADE_DELAY_MS));
        }
      }
    }
    setIsBulkGrading(false);
  };

  const removeSubmission = (id: string) => {
    setSubmissionsByTask(prev => ({
      ...prev,
      [selectedTaskId]: prev[selectedTaskId].filter(s => s.id !== id)
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#111111] font-sans selection:bg-[#111111] selection:text-white">
      {/* High Contrast Indicator */}
      <div className="fixed top-2 right-2 z-50 px-2 py-0.5 bg-[#111111] text-[#FDFDFC] text-[9px] font-black uppercase tracking-widest hidden md:block select-none pointer-events-none">
        Instructor Mode: Task-Specific View
      </div>

      {/* Header */}
      <header className="max-w-[1400px] mx-auto px-6 pt-12 pb-6 flex flex-col md:flex-row md:items-end justify-between border-b-[4px] border-[#111111] bg-[#FDFDFC]">
        <div className="group">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase opacity-50">Instructor Grading Dashboard</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-[900] uppercase tracking-[-0.04em] leading-[0.85] py-1">
            一括採点システム
          </h1>
          <p className="text-sm font-mono mt-4 font-bold opacity-60">Python Data Science Course Management</p>
        </div>
        <div className="mt-8 md:mt-0 flex flex-col items-start md:items-end gap-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <ModelSettings modelId={gradingModelId} onModelChange={setGradingModelId} />
            <ApiKeySettings
              apiKeys={apiKeys}
              onApiKeysChange={syncApiKeys}
              forceOpen={showApiKeyPrompt}
              onForceOpenHandled={() => setShowApiKeyPrompt(false)}
            />
          </div>
          <div className="flex flex-col items-start md:items-end gap-1 text-[10px] font-mono font-bold uppercase tracking-widest opacity-40">
            <span>Active Session: {selectedTask.title}</span>
            <span>Pending in this Task: {currentSubmissions.filter(s => s.status !== 'done').length}</span>
            <span className="mt-2 text-blue-600 opacity-100 italic">Faculty Edition v4.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-140px)]">
        {/* Left Column: Assignment Selection */}
        <div className="lg:col-span-3 border-r-[2px] border-[#111111] flex flex-col bg-[#FDFDFC]">
          <section className="p-6 border-b-[2px] border-[#111111]" aria-labelledby="task-selection-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="task-selection-heading" className="text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                1. Assignment List
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ASSIGNMENT_TASKS.map((task) => {
                const count = submissionsByTask[task.id]?.length || 0;
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    aria-pressed={selectedTaskId === task.id}
                    className={cn(
                      "group w-full text-left p-3 border-[1px] border-[#111111]/20 transition-all duration-100 flex items-center justify-between",
                      selectedTaskId === task.id 
                        ? "bg-[#111111] text-[#FDFDFC] border-[#111111] shadow-[4px_4px_0px_#11111133]" 
                        : "bg-white hover:bg-gray-50"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="text-[11px] font-black uppercase tracking-tight">{task.title}</div>
                      {count > 0 && (
                        <div className={cn(
                          "text-[9px] font-mono mt-0.5",
                          selectedTaskId === task.id ? "text-blue-400" : "text-blue-600"
                        )}>
                          {count} submissions
                        </div>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "w-3 h-3 transition-transform",
                      selectedTaskId === task.id ? "rotate-90" : "opacity-10 group-hover:opacity-40"
                    )} />
                  </button>
                );
              })}
            </div>
          </section>

          <footer className="p-6 mt-auto space-y-3">
            <div className="p-4 border-[1px] border-dashed border-[#111111]/20 bg-gray-50">
              <p className="text-[9px] font-mono opacity-60 font-bold leading-tight">
                VIEW FILTER ACTIVE<br/>
                選択中の回に関するデータのみが表示されます。他の回のデータは内部的に保持されています。
              </p>
              <p className="text-[9px] font-mono opacity-60 font-bold leading-tight mt-2">
                提出・採点結果はこのブラウザの localStorage に自動保存されます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleRewriteStoredReports}
              className="w-full py-2 border-[1px] border-[#111111]/30 text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors"
            >
              保存レポートを整形して書き換え
            </button>
            <button
              type="button"
              onClick={handleClearLocalData}
              className="w-full py-2 border-[1px] border-[#111111]/30 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors"
            >
              ローカルデータをすべて削除
            </button>
          </footer>
        </div>

        {/* Center/Right Column: Multi-Submission Management */}
        <div className="lg:col-span-9 bg-[#FDFDFC] flex flex-col">
          {/* Action Bar */}
          <div className="p-6 border-b-[2px] border-[#111111] flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-[#FDFDFC] z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white border-[2px] border-[#111111] text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#111111] hover:text-white transition-all shadow-[4px_4px_0px_#11111122] active:translate-y-0.5 active:shadow-none"
              >
                <Upload className="w-4 h-4" />
                Add Student IPYNBs (to {selectedTask.title})
              </button>
              <input
                type="file"
                multiple
                accept=".ipynb"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              onClick={handleBulkGrade}
              disabled={isBulkGrading || currentSubmissions.length === 0}
              className={cn(
                "px-8 py-3 bg-[#111111] text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all",
                (isBulkGrading || currentSubmissions.length === 0) ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-600 shadow-[4px_4px_0px_#11111133] active:translate-y-1"
              )}
            >
              {isBulkGrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Grading {currentSubmissions.filter(s => s.status === 'grading').length + 1} of {currentSubmissions.length}
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Grade All {selectedTask.title}
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50 min-h-[500px]">
             {currentSubmissions.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-24">
                 <Upload className="w-12 h-12 mb-4" />
                 <p className="text-xs font-mono font-bold uppercase tracking-widest">No Submissions for {selectedTask.title}</p>
                 <p className="text-[10px] mt-2">ファイルをアップロードして開始してください</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-8">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                     Viewing {currentSubmissions.length} submissions for this specific task
                   </span>
                 </div>
                 {currentSubmissions.map((sub) => (
                   <motion.div
                     key={sub.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className={cn(
                       "border-[2px] border-[#111111] bg-white transition-all shadow-[8px_8px_0px_rgba(0,0,0,0.05)]",
                       sub.status === 'grading' && "ring-4 ring-blue-600/20"
                     )}
                   >
                     {/* Result Card Header */}
                     <div className="border-b-[2px] border-[#111111] p-4 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 flex items-center justify-center bg-[#111111] text-white">
                              <User className="w-5 h-5" />
                           </div>
                           <div>
                              <h3 className="text-xs font-black uppercase tracking-tight">{sub.studentName}</h3>
                              <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest">{sub.filename}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                           {sub.status !== 'grading' && (
                             <button
                               type="button"
                               onClick={() => handleGradeSubmission(sub.id, sub.sourceCode)}
                               disabled={isBulkGrading}
                               className={cn(
                                 "px-3 py-1.5 border-[2px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all bg-white",
                                 sub.status === 'error'
                                   ? "text-red-600 hover:bg-red-600 hover:text-white shadow-[2px_2px_0px_#11111122]"
                                   : "hover:bg-[#111111] hover:text-white",
                                 isBulkGrading && "opacity-30 cursor-not-allowed"
                               )}
                             >
                               <RotateCw className="w-3 h-3" />
                               {sub.status === 'idle' ? '採点' : '再評価'}
                             </button>
                           )}
                           {sub.status === 'done' && (
                             <button
                               type="button"
                               onClick={() => sub.report && copyToClipboard(sub.report, sub.id)}
                               className="px-3 py-1.5 border-[1px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black hover:text-white transition-all bg-white"
                             >
                               {copiedId === sub.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                               {copiedId === sub.id ? 'Copied' : 'Copy Feedback'}
                             </button>
                           )}
                           <button
                             type="button"
                             onClick={() => removeSubmission(sub.id)}
                             disabled={sub.status === 'grading' || isBulkGrading}
                             className="p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     {/* Result Card Body */}
                     <div className="p-6">
                        {sub.status === 'idle' && (
                          <div className="flex items-center gap-2 text-[10px] font-mono opacity-40 uppercase">
                             <div className="w-2 h-2 bg-gray-300 rounded-full" />
                             Status: Ready for Analysis
                          </div>
                        )}
                        {sub.status === 'grading' && (
                          <div className="flex items-center gap-3 animate-pulse">
                             <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Grading Student Performance...</span>
                          </div>
                        )}
                        {sub.status === 'error' && (
                          <div className="space-y-3">
                            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-[10px] font-mono flex items-start gap-2">
                               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                               <span>{formatGradingError(sub.error)}</span>
                            </div>
                            <p className="text-[9px] font-mono opacity-50">
                              右上の「再評価」でこの提出だけ採点し直せます。
                            </p>
                          </div>
                        )}
                        {sub.status === 'done' && sub.report && (
                          <div className="markdown-report-container animate-in fade-in slide-in-from-top-2 duration-500">
                            <ReportMarkdown content={sub.report} />
                          </div>
                        )}
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
