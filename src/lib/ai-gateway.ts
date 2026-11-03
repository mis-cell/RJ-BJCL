import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Secure backend proxy for Gemini AI requests
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Missing required 'prompt' in request body." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("AI-Gateway: GEMINI_API_KEY is not defined in the backend environment.");
      res.status(503).json({ 
        error: "AI service is currently unavailable. The server-side API Key is missing.",
        code: "NO_API_KEY"
      });
      return;
    }

    console.log("AI-Gateway: Proxying AI request securely to Gemini API.");

    // Initialize the official Google GenAI SDK securely on the backend
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Use the official, recommended gemini-3.5-flash model for general text operations
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction || "You are Jarves AI 2.0, a professional assistant.",
      }
    });

    const responseText = response.text || "No response generated.";
    
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("AI-Gateway Error:", error);

    // Identify standard 400 / 503 or quota errors from Google APIs
    const errorMessage = error.message || "";
    let statusCode = 500;
    let errorCode = "GATEWAY_ERROR";

    if (errorMessage.includes("400") || errorMessage.includes("invalid") || errorMessage.includes("Invalid") || errorMessage.includes("API key")) {
      statusCode = 400;
      errorCode = "BAD_REQUEST";
    } else if (errorMessage.includes("503") || errorMessage.includes("unavailable") || errorMessage.includes("quota") || errorMessage.includes("limit") || errorMessage.includes("exhausted")) {
      statusCode = 503;
      errorCode = "SERVICE_UNAVAILABLE";
    }

    res.status(statusCode).json({
      error: error.message || "Failed to generate AI response through secure backend.",
      code: errorCode
    });
  }
});

// GET route for checking status
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: "online",
    message: "Jarves AI 2.0 Secure Gateway API is active.",
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
});

export default router;
