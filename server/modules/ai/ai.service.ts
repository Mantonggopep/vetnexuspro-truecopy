
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";

export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    if (!env.API_KEY) {
      console.warn("⚠️ API_KEY is missing. AI features will fail.");
    }
    this.ai = new GoogleGenAI({ apiKey: env.API_KEY || '' });
  }

  async generateSummary(text: string): Promise<string> {
    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
        });
        return response.text || "No summary generated.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "AI Service Unavailable"; // Return safe string instead of throwing to prevent 500 crash
    }
  }

  async generateDiagnosis(data: any): Promise<string> {
    const prompt = `
        You are an expert Veterinarian.
        Patient: ${data.species}, Age: ${data.age}
        Vitals: ${JSON.stringify(data.vitals)}
        Subjective: ${data.subjective}
        Objective: ${data.objective}
        
        Task: Provide a list of tentative differential diagnoses.
        Format: Return ONLY a valid JSON array of objects: [{"condition": "...", "probability": 80, "reasoning": "..."}].
        Do not include markdown code blocks.
    `;

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        return response.text || "[]";
    } catch (error) {
        console.error("Gemini Diagnosis Error:", error);
        return "[]";
    }
  }

  async identifyProduct(base64Image: string): Promise<any> {
    // Strip data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
        Analyze this veterinary product image. 
        Extract: Name, Category (Drugs, Food, etc), Unit, Expiry Date (YYYY-MM-DD), Regulatory Number, Barcode.
        Return ONLY valid JSON: { "name": "...", "category": "...", "unit": "...", "expiryDate": "...", "barcode": "...", "regulatoryNumber": "..." }.
        If unclear, guess the most likely product details.
    `;

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text || '{}';
        // Sanitize response
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        // Return null to signify failure without crashing
        return null;
    }
  }
}
