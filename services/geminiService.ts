import { AIAnalysisResult } from "../types";

// Helper to convert File to Base64 (kept for compatibility if needed, but unused for AI)
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeImage = async (base64Image: string, categories: string[]): Promise<AIAnalysisResult> => {
  // Dummy return to simulate analysis without calling external API
  return {
    title: "新照片",
    description: "",
    tags: [],
    suggestedCategorySlug: "uncategorized"
  };
};