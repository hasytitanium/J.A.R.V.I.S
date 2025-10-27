import { GoogleGenAI, Part } from "@google/genai";
import { Persona } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const base64ToGenerativePart = (base64: string): Part => {
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64.split(',')[1],
    },
  };
};

export const getEmojiForPrompt = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following user query, return a single, relevant emoji that represents the theme of the query. Only return the emoji character itself, with absolutely no other text, explanation, or markdown. Query: "${prompt}"`,
        });
        const emoji = response.text.trim();
        // Basic validation to ensure it's likely an emoji
        if (/\p{Emoji}/u.test(emoji)) {
            return emoji;
        }
        return '🤔'; // Default emoji if response is not an emoji
    } catch (error) {
        console.error("Error getting emoji:", error);
        return '🤔'; // Default emoji on error
    }
};

export const generateChatResponse = async (prompt: string, persona: Persona, imageBase64?: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const parts: Part[] = [{ text: prompt }];
        if (imageBase64) {
            parts.unshift(base64ToGenerativePart(imageBase64));
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                systemInstruction: persona.systemInstruction,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating chat response:", error);
        return "Sorry, something went wrong. Please try again.";
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const cleanedPrompt = prompt.replace('/image', '').trim();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A professional, high-resolution, cinematic photo of: ${cleanedPrompt}`,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

export const generateVideo = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const cleanedPrompt = prompt.replace('/video', '').trim();

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: cleanedPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download URI was found.");
        }

        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to download the generated video. Status: ${response.status}. Details: ${errorText}`);
        }

        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        console.error("Error generating video:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
};