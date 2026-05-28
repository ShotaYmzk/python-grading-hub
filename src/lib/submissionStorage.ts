import { normalizeReportMarkdown } from './normalizeReportMarkdown';

const STORAGE_KEY = 'grading_submissions_by_task';

export interface StudentSubmission {
  id: string;
  studentName: string;
  sourceCode: string;
  filename: string;
  report: string | null;
  status: 'idle' | 'grading' | 'done' | 'error';
  error: string | null;
}

export type SubmissionsByTask = Record<string, StudentSubmission[]>;

function isValidSubmission(value: unknown): value is StudentSubmission {
  if (!value || typeof value !== 'object') return false;
  const s = value as StudentSubmission;
  return (
    typeof s.id === 'string' &&
    typeof s.studentName === 'string' &&
    typeof s.sourceCode === 'string' &&
    typeof s.filename === 'string' &&
    (s.report === null || typeof s.report === 'string') &&
    ['idle', 'grading', 'done', 'error'].includes(s.status) &&
    (s.error === null || typeof s.error === 'string')
  );
}

function normalizeOnLoad(data: SubmissionsByTask): SubmissionsByTask {
  const normalized: SubmissionsByTask = {};
  for (const [taskId, submissions] of Object.entries(data)) {
    if (!Array.isArray(submissions)) continue;
    normalized[taskId] = submissions.map((s) =>
      s.status === 'grading' ? { ...s, status: 'idle' as const, error: null } : s
    );
  }
  return normalized;
}

function parseSubmissionsFromStorage(): SubmissionsByTask {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') return {};

  const result: SubmissionsByTask = {};
  for (const [taskId, submissions] of Object.entries(parsed)) {
    if (!Array.isArray(submissions)) continue;
    const valid = submissions.filter(isValidSubmission);
    if (valid.length > 0) result[taskId] = valid;
  }
  return result;
}

export function rewriteStoredReports(data: SubmissionsByTask): {
  data: SubmissionsByTask;
  updatedCount: number;
} {
  let updatedCount = 0;
  const next: SubmissionsByTask = {};

  for (const [taskId, submissions] of Object.entries(data)) {
    next[taskId] = submissions.map((submission) => {
      if (!submission.report || submission.status !== 'done') return submission;

      const normalizedReport = normalizeReportMarkdown(submission.report);
      if (normalizedReport === submission.report) return submission;

      updatedCount += 1;
      return { ...submission, report: normalizedReport };
    });
  }

  return { data: next, updatedCount };
}

export function loadSubmissions(): SubmissionsByTask {
  try {
    const parsed = parseSubmissionsFromStorage();
    const normalized = normalizeOnLoad(parsed);
    const { data, updatedCount } = rewriteStoredReports(normalized);

    if (updatedCount > 0) {
      saveSubmissions(data);
      console.info(`[grading] レポート ${updatedCount} 件を整形して保存し直しました`);
    }

    return data;
  } catch {
    return {};
  }
}

export function forceRewriteAllStoredReports(): number {
  const parsed = parseSubmissionsFromStorage();
  const normalized = normalizeOnLoad(parsed);
  const { data, updatedCount } = rewriteStoredReports(normalized);
  saveSubmissions(data);
  return updatedCount;
}

export function saveSubmissions(data: SubmissionsByTask): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded — grading data not saved');
    }
  }
}

export function clearSubmissions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasStoredSubmissions(): boolean {
  return Object.keys(loadSubmissions()).length > 0;
}
