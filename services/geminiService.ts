import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

/**
 * Analyzes the video concept/transcript to generate metadata.
 */
export const analyzeVideoConcept = async (
  apiKey: string,
  concept: string
): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A click-baity, high CTR YouTube title under 60 chars." },
      description: { type: Type.STRING, description: "An engaging 3-paragraph description with emojis." },
      tags: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "15 SEO-optimized tags." 
      },
      thumbnailPrompt: { type: Type.STRING, description: "A detailed prompt for an AI image generator to create a high-CTR thumbnail." }
    },
    required: ["title", "description", "tags", "thumbnailPrompt"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze this video concept/transcript and provide metadata optimized for high retention and CTR. Concept: "${concept}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  const data = JSON.parse(text);
  
  // Calculate estimated cost (approximate based on input/output tokens of flash)
  const estimatedCost = 0.0005; // Extremely cheap with Flash

  return {
    title: data.title,
    description: data.description,
    tags: data.tags,
    thumbnailPrompt: data.thumbnailPrompt,
    estimatedCost
  };
};

/**
 * Generates a thumbnail using Gemini Image model.
 */
export const generateThumbnail = async (
  apiKey: string,
  prompt: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview", // Using the high-quality image model
      contents: prompt,
      config: {
        // No schema for image gen
      }
    });

    // Extract image from candidates
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No image generated");

    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
    }
    
    throw new Error("No valid image data found in response");

  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    // Fallback to a placeholder if image gen fails or quota exceeded
    return `https://picsum.photos/1280/720?grayscale&blur=2`;
  }
};
