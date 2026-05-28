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
  Users
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ASSIGNMENT_TASKS } from './constants';
import { gradeSubmission } from './services/geminiService';
import { getStoredApiKey } from './lib/apiKey';
import { ApiKeySettings } from './components/ApiKeySettings';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudentSubmission {
  id: string;
  studentName: string;
  sourceCode: string;
  filename: string;
  report: string | null;
  status: 'idle' | 'grading' | 'done' | 'error';
  error: string | null;
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
  const [submissionsByTask, setSubmissionsByTask] = useState<Record<string, StudentSubmission[]>>({});
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  const requireApiKey = (): boolean => {
    if (apiKey) return true;
    setShowApiKeyPrompt(true);
    return false;
  };

  const selectedTask = ASSIGNMENT_TASKS.find(t => t.id === selectedTaskId)!;
  const currentSubmissions = submissionsByTask[selectedTaskId] || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newSubmissions: StudentSubmission[] = [];
    for (const file of files) {
      try {
        const sourceCode = await parseIpynb(file);
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
    
    setSubmissionsByTask(prev => ({
      ...prev,
      [selectedTaskId]: [...(prev[selectedTaskId] || []), ...newSubmissions]
    }));
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const gradeOne = async (taskId: string, subId: string, source: string, key: string) => {
    setSubmissionsByTask(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s => s.id === subId ? { ...s, status: 'grading', error: null } : s)
    }));
    
    try {
      const result = await gradeSubmission(
        key,
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

  const handleBulkGrade = async () => {
    if (!requireApiKey() || !apiKey) return;
    setIsBulkGrading(true);
    const taskSubmissions = [...currentSubmissions];
    
    for (const sub of taskSubmissions) {
      if (sub.status !== 'done') {
        await gradeOne(selectedTaskId, sub.id, sub.sourceCode, apiKey);
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
          <ApiKeySettings
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            forceOpen={showApiKeyPrompt}
            onForceOpenHandled={() => setShowApiKeyPrompt(false)}
          />
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

          <footer className="p-6 mt-auto">
            <div className="p-4 border-[1px] border-dashed border-[#111111]/20 bg-gray-50">
              <p className="text-[9px] font-mono opacity-60 font-bold leading-tight">
                VIEW FILTER ACTIVE<br/>
                選択中の回に関するデータのみが表示されます。他の回のデータは内部的に保持されています。
              </p>
            </div>
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
                        <div className="flex items-center gap-4">
                           {sub.status === 'done' && (
                             <button
                               onClick={() => sub.report && copyToClipboard(sub.report, sub.id)}
                               className="px-3 py-1.5 border-[1px] border-[#111111] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black hover:text-white transition-all bg-white"
                             >
                               {copiedId === sub.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                               {copiedId === sub.id ? 'Copied' : 'Copy Feedback'}
                             </button>
                           )}
                           <button
                             onClick={() => removeSubmission(sub.id)}
                             disabled={isBulkGrading && sub.status === 'grading'}
                             className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
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
                          <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-[10px] font-mono flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4" />
                             Error: {sub.error}
                          </div>
                        )}
                        {sub.status === 'done' && sub.report && (
                          <div className="markdown-report-container animate-in fade-in slide-in-from-top-2 duration-500">
                             <article className="prose prose-sm max-w-none 
                               prose-p:text-[#111111]/80 prose-p:font-medium 
                               prose-headings:text-[#111111] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-[-0.03em]
                               prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-10 prose-h2:border-b-2 prose-h2:border-[#111111] prose-h2:pb-1
                               prose-h3:text-[11px] prose-h3:mt-8 prose-h3:mb-3 prose-h3:tracking-[0.2em] prose-h3:bg-[#111111] prose-h3:text-white prose-h3:p-1 prose-h3:inline-block
                               
                               prose-table:border-[2px] prose-table:border-[#111111] prose-table:w-full prose-table:my-8
                               prose-th:bg-gray-100 prose-th:text-[#111111] prose-th:font-black prose-th:text-[10px] prose-th:uppercase prose-th:tracking-widest prose-th:py-3 prose-th:px-4 prose-th:border-[1px] prose-th:border-[#111111] prose-th:text-left
                               prose-td:py-3 prose-td:px-4 prose-td:border-[1px] prose-td:border-[#111111] prose-td:text-[12px] prose-td:leading-relaxed
                               
                               prose-strong:font-black prose-strong:text-[#111111]
                               prose-code:text-[#111111] prose-code:bg-blue-50 prose-code:px-1 prose-code:font-bold prose-code:before:content-none prose-code:after:content-none
                               prose-pre:bg-[#111111] prose-pre:text-[#FDFDFC] prose-pre:rounded-none prose-pre:p-4 prose-pre:font-mono
                               ">
                               <ReactMarkdown remarkPlugins={[remarkGfm]}>{sub.report}</ReactMarkdown>
                             </article>
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
