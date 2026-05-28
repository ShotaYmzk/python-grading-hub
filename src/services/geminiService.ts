import { GoogleGenAI } from "@google/genai";
import { GRADING_SYSTEM_INSTRUCTION } from "../constants";

export async function gradeSubmission(
  apiKey: string,
  taskId: string,
  taskTitle: string,
  taskDescription: string,
  code: string
) {
  if (!apiKey.trim()) {
    throw new Error("API キーが設定されていません。画面上部から Gemini API Key を設定してください。");
  }

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: GRADING_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    return response.text || "採点結果を取得できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("採点中にエラーが発生しました。時間を置いて再度お試しください。");
  }
}
