
import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, InputType, AcademicLevel } from "./types";

export const generateLessonPlan = async (params: {
  inputType: InputType;
  sourceValue: string;
  subject: string;
  level: AcademicLevel;
  segmentCount: number;
  questionCount: number;
  transcript: string;
}): Promise<LessonPlan> => {
  const { inputType, sourceValue, subject, level, segmentCount, questionCount, transcript } = params;

  // 取得 API Key
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("系統未偵測到 API Key。請在 Vercel 或系統環境變數中設定 API_KEY。");
  }

  // 每次調用時重新初始化，確保使用最新的環境變數
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    你是一位台灣的高中/技職教育與影片教材製作專家。請根據以下資訊設計一份繁體中文教案。
    
    **輸入資訊**：
    - 影片類型：${inputType === 'movie' ? '電影' : 'YouTube 影片'}
    - 影片名稱/網址：${sourceValue}
    - 配合科目：${subject}
    - 適用學制：${level} (請特別注意 ${level === '技高' ? '職業類科的實務應用' : '學術探究'} 導向)
    - 需求段落數：${segmentCount} 個
    - 需求題目數：${questionCount} 題
    
    **影片逐字稿/內容**：
    ${transcript || '使用者未提供逐字稿，請根據影片標題或網址背景知識進行分析。'}
    
    **任務要求**：
    1. 內容需嚴格符合「台灣 108 課綱」的精神與用語。
    2. 提取「Deep Dive 專業細節」與「Q&A」需具備教學深度。
    3. 段落標題需吸引學生，時間區間需為格式如 "00:05:00 - 00:10:00"。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING }
              },
              required: ["title", "source"]
            },
            curriculum: {
              type: Type.OBJECT,
              properties: {
                domain: { type: Type.STRING },
                grade: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      code: { type: Type.STRING },
                      content: { type: Type.STRING }
                    },
                    required: ["code", "content"]
                  }
                }
              },
              required: ["domain", "grade", "items"]
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  time: { type: Type.STRING },
                  points: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "time", "points"]
              }
            },
            deepDive: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["term", "explanation"]
              }
            },
            qa: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            }
          },
          required: ["theme", "curriculum", "segments", "deepDive", "qa"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 未回傳內容內容。");
    return JSON.parse(text);
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    // 檢查是否為配額或權限錯誤
    const errorMessage = e.message || "未知錯誤";
    if (errorMessage.includes("429")) throw new Error("API 調用次數過多，請稍後再試。");
    if (errorMessage.includes("403")) throw new Error("API Key 權限不足或無效。");
    throw new Error(`生成教案失敗：${errorMessage}`);
  }
};
