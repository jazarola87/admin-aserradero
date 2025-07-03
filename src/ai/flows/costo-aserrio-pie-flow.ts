
'use server';
/**
 * @fileOverview Un flujo de IA para chequear el costo de aserrío por pie.
 *
 * - chequearCostoAserrio - Calcula el costo de aserrío por pie basado en la configuración guardada.
 * - ChequeoAserrioOutput - El tipo de retorno para la función chequearCostoAserrio.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAppConfig } from '@/lib/firebase/services/configuracionService';
import { defaultConfig } from '@/lib/config-data';

export const ChequeoAserrioOutputSchema = z.object({
  calculoDetallado: z.string().describe('Una explicación paso a paso de cómo se calculó el costo.'),
  costoPorPie: z.number().describe('El costo final de aserrío por pie tablar.'),
});
export type ChequeoAserrioOutput = z.infer<typeof ChequeoAserrioOutputSchema>;

// Este flujo no necesita un prompt, ya que es un cálculo directo,
// pero usamos un prompt para que la IA formatee una buena explicación.
const prompt = ai.definePrompt({
    name: 'chequeoCostoAserrioPrompt',
    input: { schema: z.object({
        precioNafta: z.number(),
        precioAfilado: z.number(),
        costoCalculado: z.number(),
    }) },
    output: { schema: ChequeoAserrioOutputSchema },
    prompt: `
    Eres un asistente de contabilidad para un aserradero. Tu tarea es explicar de forma clara y detallada cómo se calcula el costo de aserrío por pie tablar, basado en los datos de configuración proporcionados.

    Datos de Configuración Utilizados:
    - Precio por Litro de Nafta: {{{precioNafta}}}
    - Precio por Afilado de Sierra: {{{precioAfilado}}}

    Fórmula Utilizada:
    Costo por Pie = (((Precio Nafta * 6) + (Precio Afilado * 3)) * 1.38) / 600

    Costo Calculado: {{{costoCalculado}}}

    Por favor, genera una respuesta que contenga:
    1.  Un campo "calculoDetallado" con una explicación paso a paso en español.
    2.  Un campo "costoPorPie" con el valor final calculado.

    Ejemplo de explicación:
    "El costo de aserrío por pie se calcula así:
    1. Costo Nafta: $1.75 * 6 = $10.50
    2. Costo Afilado: $12.00 * 3 = $36.00
    3. Costo Operativo Base: $10.50 + $36.00 = $46.50
    4. Costo Ajustado (con factor 1.38): $46.50 * 1.38 = $64.17
    5. Costo Final por Pie (dividido por 600 pies): $64.17 / 600 = $0.10695"
    `,
});

const chequearCostoAserrioFlow = ai.defineFlow(
  {
    name: 'chequearCostoAserrioFlow',
    inputSchema: z.void(),
    outputSchema: ChequeoAserrioOutputSchema,
  },
  async () => {
    // Obtener la configuración de Firebase y fusionarla con los valores por defecto
    const liveConfig = await getAppConfig();
    const config = { ...defaultConfig, ...liveConfig };
    
    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;

    // Fórmula: (((Precio Nafta * 6) + (Precio Afilado * 3)) * 1.38) / 600
    const costoNaftaTotal = precioNafta * 6;
    const costoAfiladoTotal = precioAfilado * 3;
    const costoOperativoBase = costoNaftaTotal + costoAfiladoTotal;
    const costoAjustado = costoOperativoBase * 1.38;
    const costoPorPie = costoAjustado / 600;

    const { output } = await prompt({
        precioNafta: precioNafta,
        precioAfilado: precioAfilado,
        costoCalculado: costoPorPie,
    });
    
    if (!output) {
      throw new Error("La IA no pudo generar una explicación para el cálculo.");
    }
    
    return output;
  }
);

export async function chequearCostoAserrio(): Promise<ChequeoAserrioOutput> {
  return chequearCostoAserrioFlow();
}
