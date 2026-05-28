import { GoogleGenAI } from "@google/genai";
import { GRADING_SYSTEM_INSTRUCTION } from "../constants";
import { ApiKeyPool } from "../lib/apiKeyPool";

async function gradeWithKey(
  apiKey: string,
  modelId: string,
  taskId: string,
  taskTitle: string,
  taskDescription: string,
  code: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
以下の課題セットを採点してください。

# 課題セット: ${taskTitle} (${taskId})
# 課題内容: ${taskDescription}

# 生徒の提出コード:
\`\`\`python
${code}
\`\`\`
`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: GRADING_SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  return response.text || "採点結果を取得できませんでした。";
}

export async function gradeSubmission(
  pool: ApiKeyPool,
  modelId: string,
  taskId: string,
  taskTitle: string,
  taskDescription: string,
  code: string
): Promise<string> {
  try {
    return await pool.execute((apiKey) =>
      gradeWithKey(apiKey, modelId, taskId, taskTitle, taskDescription, code)
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("採点中にエラーが発生しました。時間を置いて再度お試しください。");
  }
}
