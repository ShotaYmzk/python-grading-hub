import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { normalizeReportMarkdown } from '../lib/normalizeReportMarkdown';

const markdownComponents: Components = {
  h3: ({ children }) => (
    <h3 className="mt-8 mb-4 block w-full">
      <span className="inline-block text-[11px] font-black uppercase tracking-[0.2em] bg-[#111111] text-white px-2 py-1">
        {children}
      </span>
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2 text-sm font-black uppercase tracking-tight text-[#111111] border-b border-[#111111]/20 pb-1">
      {children}
    </h4>
  ),
  table: ({ children }) => (
    <div className="my-6 w-full overflow-x-auto border-[2px] border-[#111111]">
      <table className="w-full min-w-[480px] border-collapse text-left text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-[#111111] px-4 py-3 text-[10px] font-black uppercase tracking-widest">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#111111] px-4 py-3 align-top font-medium leading-relaxed text-[#111111]/90">
      {children}
    </td>
  ),
};

interface ReportMarkdownProps {
  content: string;
}

export function ReportMarkdown({ content }: ReportMarkdownProps) {
  return (
    <article
      className="prose prose-sm max-w-none
        prose-p:text-[#111111]/80 prose-p:font-medium prose-p:leading-relaxed
        prose-headings:text-[#111111] prose-headings:font-black
        prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-10 prose-h2:border-b-2 prose-h2:border-[#111111] prose-h2:pb-1
        prose-strong:font-black prose-strong:text-[#111111]
        prose-code:text-[#111111] prose-code:bg-blue-50 prose-code:px-1 prose-code:font-bold prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[#111111] prose-pre:text-[#FDFDFC] prose-pre:rounded-none prose-pre:p-4 prose-pre:font-mono
        prose-ul:my-4 prose-ol:my-4 prose-li:my-1"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalizeReportMarkdown(content)}
      </ReactMarkdown>
    </article>
  );
}
