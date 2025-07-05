'use server';
/**
 * @fileOverview A simple virtual assistant flow.
 * - asistente - A function that takes a user's message and returns an AI-generated response.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const AsistenteInputSchema = z.string().describe("User's question for the assistant");
export type AsistenteInput = z.infer<typeof AsistenteInputSchema>;

export const AsistenteOutputSchema = z.string().describe("AI's answer");
export type AsistenteOutput = z.infer<typeof AsistenteOutputSchema>;

export async function asistente(prompt: AsistenteInput): Promise<AsistenteOutput> {
  return asistenteFlow(prompt);
}

const asistenteFlow = ai.defineFlow(
  {
    name: 'asistenteFlow',
    inputSchema: AsistenteInputSchema,
    outputSchema: AsistenteOutputSchema,
  },
  async (prompt) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `Eres un asistente virtual para un aserradero. Responde de manera breve y útil a la siguiente pregunta: ${prompt}`,
      config: {
        temperature: 0.5,
      },
    });

    return output ?? 'No se pudo generar una respuesta.';
  }
);
