import { GoogleGenAI, Type } from "@google/genai";
import { Rarity } from "../types";

const apiKey = process.env.API_KEY || ''; 
// Note: In a real prod environment, this should be proxied. 
// For this frontend-only demo, we assume the user might not have a key or uses the one from env if set up.

let ai: GoogleGenAI | null = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const generateAuraDetails = async (rarity: Rarity, zoneName: string): Promise<{ name: string; description: string }> => {
  if (!ai) {
    // Fallback if no API key
    return {
      name: `${rarity} Aura of ${zoneName.split(' ')[0]}`,
      description: "A mysterious aura emanating strange energy."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a cool, fantasy RPG Aura name and a short one-sentence description. 
      Rarity: ${rarity}. 
      Found in Zone: ${zoneName}. 
      The name should be abstract like "Void Walker" or "Solar Flare".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
            }
        }
      }
    });

    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    throw new Error("No text returned");
  } catch (error) {
    console.error("Gemini gen failed", error);
    return {
      name: `${rarity} Essence`,
      description: "You feel a faint power from this aura."
    };
  }
};