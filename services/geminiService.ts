
import { GoogleGenAI, Type } from "@google/genai";

export async function generateBilingualPost(
  imagesData: string[], 
  author: string, 
  userContext?: string, 
  tags: string[] = []
): Promise<{ en: any, es: any }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const heroesInMission = tags.filter(t => t === 'Juval' || t === 'Theo');
    const heroContext = heroesInMission.length > 0 
      ? `This memory features: ${heroesInMission.join(' and ')}.`
      : "The photos show the daily lives of two brothers, Juval and Theo.";

    const prompt = `You are a warm, loving family storyteller documenting the life of two brothers, Juval and Theo.
    
    CHARACTER CONTEXT:
    - Juval: The older brother. He's curious, protective, and learning new things every day.
    - Theo: The younger brother. He's energetic, exploring the world with wide eyes, and often imitating Juval.
    
    ${heroContext}
    ${userContext ? `CONTEXT FROM THE PARENT: "${userContext}"` : ''}

    Analyze the photos and generate a heartfelt, realistic scrapbook entry:
    1. A short, sweet title (1-3 words).
    2. A warm, funny, or observational sentence about this specific family moment.
    
    CRITICAL RULES:
    - Keep it realistic. Avoid "superhero" or "spy" themes. Focus on "growing up," "playing," "learning," or "brotherly love."
    - DO NOT mention a boy if he is not present or tagged.
    
    Provide the output in BOTH English and Spanish.
    The parent writing this is: ${author}.`;

    const imageParts = imagesData.map(data => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: data.split(',')[1],
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...imageParts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            en: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                caption: { type: Type.STRING }
              },
              required: ["title", "caption"]
            },
            es: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                caption: { type: Type.STRING }
              },
              required: ["title", "caption"]
            }
          },
          required: ["en", "es"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return {
      en: { title: "A Special Moment", caption: "Capturing another beautiful day in our lives." },
      es: { title: "Un Momento Especial", caption: "Capturando otro hermoso día en nuestras vidas." }
    };
  }
}
