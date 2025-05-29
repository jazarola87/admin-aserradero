'use server';
/**
 * @fileOverview An AI assistant to suggest prices based on purchase data and market prices.
 *
 * - sugerirPrecio - A function that suggests a selling price.
 * - SugerirPrecioInput - The input type for the sugerirPrecio function.
 * - SugerirPrecioOutput - The return type for the sugerirPrecio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SugerirPrecioInputSchema = z.object({
  tipoMadera: z.string().describe('Tipo de madera a vender (e.g., pino, roble).'),
  costoCompraPorPie: z.number().describe('Costo de compra por pie de la madera.'),
  precioMercadoPromedioPorPie: z.number().describe('Precio de mercado promedio por pie de la madera.'),
  margenGananciaDeseado: z.number().describe('Margen de ganancia deseado (e.g., 0.2 para 20%).'),
});
export type SugerirPrecioInput = z.infer<typeof SugerirPrecioInputSchema>;

const SugerirPrecioOutputSchema = z.object({
  precioSugerido: z.number().describe('Precio de venta sugerido por pie, basado en el costo de compra, precio de mercado y margen de ganancia deseado.'),
  justificacion: z.string().describe('Justificación de por qué se sugiere ese precio.'),
});
export type SugerirPrecioOutput = z.infer<typeof SugerirPrecioOutputSchema>;

export async function sugerirPrecio(input: SugerirPrecioInput): Promise<SugerirPrecioOutput> {
  return sugerirPrecioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sugerirPrecioPrompt',
  input: {schema: SugerirPrecioInputSchema},
  output: {schema: SugerirPrecioOutputSchema},
  prompt: `Eres un asistente experto en la fijación de precios de madera en un aserradero.  Tu tarea es sugerir un precio de venta por pie de madera, considerando el costo de compra, el precio de mercado promedio y el margen de ganancia deseado.  Debes proporcionar una justificación clara de por qué sugieres ese precio.

Tipo de madera: {{{tipoMadera}}}
Costo de compra por pie: {{{costoCompraPorPie}}}
Precio de mercado promedio por pie: {{{precioMercadoPromedioPorPie}}}
Margen de ganancia deseado: {{{margenGananciaDeseado}}}

Calcula el precio sugerido teniendo en cuenta todos los factores.  Si el precio de mercado es mayor que el costo de compra más el margen de ganancia deseado, sugiere un precio cercano al precio de mercado para maximizar las ganancias. Si el precio de mercado es menor, sugiere un precio que al menos cubra el costo de compra y el margen de ganancia deseado.

Formatea la salida en español.
`,
});

const sugerirPrecioFlow = ai.defineFlow(
  {
    name: 'sugerirPrecioFlow',
    inputSchema: SugerirPrecioInputSchema,
    outputSchema: SugerirPrecioOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
