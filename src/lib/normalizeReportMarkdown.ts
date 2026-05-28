type EvaluationEntry = {
  title: string;
  status?: string;
  feedback?: string;
  isGroupHeader?: boolean;
};

/**
 * LLM の採点レポートを、確実に表示できる Markdown に変換する。
 * 表形式・番号リスト・潰れた | 区切りのいずれにも対応。
 */
export function normalizeReportMarkdown(report: string): string {
  let text = report.trim();
  text = fixHeadings(text);

  text = text.replace(
    /(###\s*2\.\s*各問題の評価\s*\n)([\s\S]*?)(?=\n###\s*3\.|$)/,
    (_, heading, body) => `${heading}${repairEvaluationBody(body)}\n`
  );

  return text.trim();
}

function repairEvaluationBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';

  // すでにきれいな GFM 表（行ごとに | が3つ以上、区切り行あり）
  if (isWellFormedTable(trimmed)) {
    return fixCollapsedTables(trimmed);
  }

  const entries = parseEvaluationEntries(trimmed);
  if (entries.length === 0) {
    return fixCollapsedTables(trimmed);
  }

  return entries
    .map((entry) => {
      if (entry.isGroupHeader) {
        return `\n#### ${entry.title}\n`;
      }
      const status = entry.status ? ` — **${entry.status}**` : '';
      const feedback = entry.feedback?.trim() ?? '';
      return `\n#### ${entry.title}${status}\n\n${feedback}\n`;
    })
    .join('')
    .trim();
}

function isWellFormedTable(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return false;
  const hasSeparator = lines.some((l) => /^\|[\s:|-]+\|$/.test(l.trim()) && /-{3,}/.test(l));
  const hasDataRows = lines.filter((l) => !/-{3,}/.test(l) && !/問題番号/.test(l)).length >= 2;
  return hasSeparator && hasDataRows && !/\|{2,}/.test(text);
}

function parseEvaluationEntries(body: string): EvaluationEntry[] {
  let content = body;

  // 表ヘッダー・区切り行のゴミを除去
  content = content
    .replace(/^\|?\s*問題番号[\s\S]*?(?=(?:問題|セル|\d+\.\s+\*\*))/i, '')
    .replace(/\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?/g, '')
    .trim();

  // 番号付きリスト形式
  if (/\d+\.\s+\*\*/.test(content) && !/(?:^|\|)\s*問題\d/.test(content)) {
    return parseNumberedList(content);
  }

  // |{2,} や改行で分割（問題 / セル の塊）
  const chunks = content
    .split(/\|{2,}\s*|\n(?=\s*(?:問題|セル))/)
    .map((c) => c.replace(/^\|+\s*/, '').trim())
    .filter(Boolean);

  const entries: EvaluationEntry[] = [];

  for (const chunk of chunks) {
    if (/^---/.test(chunk) || /^問題番号/.test(chunk)) continue;

    // 問題1: タイトル のみ（セル群の親）
    const groupOnly = chunk.match(/^(問題\d+[^|]*?)(?:\s*\|+\s*)?$/);
    if (groupOnly) {
      entries.push({ title: groupOnly[1].trim(), isGroupHeader: true });
      continue;
    }

    const row = chunk.match(/^(問題[^|]+|セル\d+)\s*\|\s*([^|]+)\s*\|\s*([\s\S]+)$/);
    if (row) {
      entries.push({
        title: row[1].trim(),
        status: row[2].trim(),
        feedback: row[3].trim().replace(/\|+\s*$/, ''),
      });
      continue;
    }

    const twoCol = chunk.match(/^(問題[^|]+|セル\d+)\s*\|\s*([\s\S]+)$/);
    if (twoCol) {
      entries.push({ title: twoCol[1].trim(), feedback: twoCol[2].trim() });
      continue;
    }

    const numbered = chunk.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s*([\s\S]*)$/);
    if (numbered) {
      entries.push({
        title: numbered[2].trim(),
        feedback: numbered[3].trim(),
      });
    }
  }

  return entries;
}

function parseNumberedList(content: string): EvaluationEntry[] {
  const items = content.split(/\s*(?=\d+\.\s+\*\*)/).filter(Boolean);
  return items.map((item) => {
    const m = item.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s*([\s\S]*)$/);
    if (!m) return { title: item.trim(), feedback: '' };
    const rest = m[3].trim();
    const statusMatch = rest.match(/^(正解|不正解|満点|ほぼ正解|未実施|該当なし|不完全|[^。、]+)[。.、]\s*/);
    if (statusMatch) {
      return {
        title: m[2].trim(),
        status: statusMatch[1].trim(),
        feedback: rest.slice(statusMatch[0].length).trim() || rest,
      };
    }
    return { title: m[2].trim(), feedback: rest };
  });
}

function fixCollapsedTables(text: string): string {
  let result = text.replace(/\|{4,}/g, '|\n|').replace(/\|{2,}/g, '|\n|');
  result = result.replace(
    /^\|[\s:|-]+\|$/gm,
    (line) => {
      const cols = line.split('|').filter((c) => /-+/.test(c) || /:+/.test(c));
      if (cols.length === 0) return line;
      return `| ${cols.map(() => '---').join(' | ')} |`;
    }
  );
  return result;
}

function fixHeadings(text: string): string {
  let result = text.replace(/([^\n])\n(#{2,3}\s)/g, '$1\n\n$2');
  result = result.replace(/(#{2,3}\s+[^\n|]+?)\s+(\|)/g, '$1\n\n$2');
  return result;
}
