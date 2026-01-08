import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeImage = async (base64Image: string, categories: string[]): Promise<AIAnalysisResult> => {
  try {
    const categoryList = categories.join(", ");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg for simplicity, API handles most standard types
              data: base64Image
            }
          },
          {
            text: `分析这张图片用于个人相册。
            1. 生成一个简短、吸引人的中文标题（最多10个字）。
            2. 写一段简短的中文描述（1-2句话）。
            3. 生成3-5个相关的中文标签。
            4. 从以下列表中建议一个最佳分类：[${categoryList}, 'uncategorized']。如果没有完美匹配的，请选择 'uncategorized'。
            
            请仅返回JSON格式。`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedCategorySlug: { type: Type.STRING }
          },
          required: ["title", "description", "tags", "suggestedCategorySlug"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback if AI fails
    return {
      title: "新照片",
      description: "暂无描述。",
      tags: [],
      suggestedCategorySlug: "uncategorized"
    };
  }
};