/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It exports a single `ai` object that should be used throughout the application
 * to define and run AI flows.
 */
import { genkit } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});
