'use server';
/**
 * @fileOverview Un flujo de IA para chequear el costo de recupero de madera por pie.
 *
 * - chequearCostoMadera - Calcula el costo de recupero para todos los tipos de madera.
 * - ChequeoCostoMaderaOutput - El tipo de retorno para la función chequearCostoMadera.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAppConfig } from '@/lib/firebase/services/configuracionService';

export const CostoMaderaItemSchema = z.object({
  tipoMadera: z.string().describe('El tipo de madera.'),
  costoPorMetroCubico: z.number().describe('El costo por metro cúbico configurado para esta madera.'),
  costoPorPieRecupero: z.number().describe('El costo de recupero calculado por pie tablar.'),
});

export const ChequeoCostoMaderaOutputSchema = z.object({
  explicacionFormula: z.string().describe('Una explicación de la fórmula utilizada para el cálculo.'),
  costosDetallados: z.array(CostoMaderaItemSchema).describe('Un desglose de los costos de recupero para cada tipo de madera configurado.'),
});

export type ChequeoCostoMaderaOutput = z.infer<typeof ChequeoCostoMaderaOutputSchema>;

const prompt = ai.definePrompt({
    name: 'chequeoCostoMaderaPrompt',
    input: { schema: z.void() },
    output: { schema: ChequeoCostoMaderaOutputSchema },
    prompt: `
    Eres un asistente de contabilidad para un aserradero. Tu tarea es explicar la fórmula para calcular el "costo de recupero de madera por pie tablar".
    La fórmula es: Costo por Pie = Costo por Metro Cúbico / 200.
    
    Por favor, proporciona una explicación clara de esta fórmula en el campo "explicacionFormula".
    El campo "costosDetallados" será llenado por el sistema con los cálculos específicos para cada tipo de madera. Solo necesitas proporcionar la explicación.
    `,
});

const chequeoCostoMaderaFlow = ai.defineFlow(
  {
    name: 'chequeoCostoMaderaFlow',
    inputSchema: z.void(),
    outputSchema: ChequeoCostoMaderaOutputSchema,
  },
  async () => {
    const config = await getAppConfig();
    
    const { output: promptOutput } = await prompt();
    
    if (!promptOutput) {
      throw new Error("La IA no pudo generar una explicación para el cálculo.");
    }

    const costosDetallados: z.infer<typeof CostoMaderaItemSchema>[] = (config.costosMaderaMetroCubico || [])
        .filter(c => (c.costoPorMetroCubico ?? 0) > 0)
        .map(costoInfo => {
            const costoPorPieRecupero = (costoInfo.costoPorMetroCubico || 0) / 200;
            return {
                tipoMadera: costoInfo.tipoMadera,
                costoPorMetroCubico: costoInfo.costoPorMetroCubico,
                costoPorPieRecupero: costoPorPieRecupero
            };
        });

    return {
        explicacionFormula: promptOutput.explicacionFormula,
        costosDetallados: costosDetallados,
    };
  }
);

export async function chequearCostoMadera(): Promise<ChequeoCostoMaderaOutput> {
  return chequeoCostoMaderaFlow();
}
