
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

  // 安全檢查：確保在存取 process.env 時不會因為 process 未定義而崩潰
  const env = typeof process !== 'undefined' ? process.env : (window as any).process?.env;
  const apiKey = env?.API_KEY;
  
  if (!apiKey) {
    throw new Error("找不到 API Key。請確保您已在 AI Studio 中設定正確，或檢查環境變數。");
  }

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
    1. 內容需符合「台灣 108 課綱」。
    2. 提取真正的「Deep Dive 專業細節」與「Q&A」。
    3. 段落標題需吸引人，時間區間需為格式如 "00:05:00 - 00:10:00"。
  `;

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

  try {
    const text = response.text;
    if (!text) throw new Error("AI 未回傳內容");
    return JSON.parse(text);
  } catch (e) {
    console.error("Parse error:", e);
    throw new Error("無法解析 AI 回傳內容，可能是因為內容長度超過限制或格式錯誤。");
  }
};
