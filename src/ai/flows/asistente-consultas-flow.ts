
'use server';
/**
 * @fileOverview Un asistente de IA para responder consultas sobre datos de compras y ventas de un aserradero.
 *
 * - consultarAsistente - Función que procesa la consulta del usuario y devuelve una respuesta.
 * - AsistenteConsultasInput - Tipo de entrada para la función.
 * - AsistenteConsultasOutput - Tipo de salida para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Compra, Venta, VentaDetalle } from '@/types'; // Asegúrate de que los tipos sean correctos

// Esquema para un detalle de venta simplificado para el prompt
const VentaDetallePromptSchema = z.object({
  tipoMadera: z.string().optional(),
  unidades: z.number().optional(),
  ancho: z.number().optional(),
  alto: z.number().optional(),
  largo: z.number().optional(),
  precioPorPie: z.number().optional(),
  cepillado: z.boolean().optional(),
  piesTablares: z.number().optional(),
  subTotal: z.number().optional(),
});

// Esquema para una venta simplificada para el prompt
const VentaPromptSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  nombreComprador: z.string(),
  detalles: z.array(VentaDetallePromptSchema),
  totalVenta: z.number().optional(),
});

// Esquema para una compra simplificada para el prompt
const CompraPromptSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  tipoMadera: z.string(),
  volumen: z.number(), // en m^3
  proveedor: z.string(),
  costo: z.number(),
});


export const AsistenteConsultasInputSchema = z.object({
  prompt: z.string().describe('La consulta o pregunta del usuario.'),
  comprasData: z.array(CompraPromptSchema).describe('Una lista de todos los registros de compras.'),
  ventasData: z.array(VentaPromptSchema).describe('Una lista de todos los registros de ventas, incluyendo sus detalles.'),
});
export type AsistenteConsultasInput = z.infer<typeof AsistenteConsultasInputSchema>;

export const AsistenteConsultasOutputSchema = z.object({
  respuesta: z.string().describe('La respuesta generada por el asistente de IA a la consulta del usuario.'),
});
export type AsistenteConsultasOutput = z.infer<typeof AsistenteConsultasOutputSchema>;

export async function consultarAsistente(input: AsistenteConsultasInput): Promise<AsistenteConsultasOutput> {
  return asistenteConsultasFlow(input);
}

const promptTemplate = ai.definePrompt({
  name: 'asistenteConsultasPrompt',
  input: { schema: AsistenteConsultasInputSchema },
  output: { schema: AsistenteConsultasOutputSchema },
  prompt: `Eres un asistente experto en analizar datos de un aserradero. Se te proporcionarán datos de compras y ventas. Utiliza esta información para responder la consulta del usuario de la manera más precisa y concisa posible.

Contexto de Datos:

Datos de Compras:
{{#if comprasData.length}}
{{#each comprasData}}
- Compra ID {{id}}: Fecha: {{fecha}}, Tipo Madera: {{tipoMadera}}, Volumen: {{volumen}}m³, Proveedor: {{proveedor}}, Costo: {{costo}}
{{/each}}
{{else}}
No se proporcionaron datos de compras.
{{/if}}

Datos de Ventas:
{{#if ventasData.length}}
{{#each ventasData}}
- Venta ID {{id}} a {{nombreComprador}} (Fecha: {{fecha}}), Total Venta: {{totalVenta}}
  Detalles de la Venta:
  {{#each detalles}}
  -- {{unidades}} unidades de {{tipoMadera}} (Dimensiones: {{alto}}" Alto x {{ancho}}" Ancho x {{largo}}m Largo), Precio/Pie: {{precioPorPie}}{{#if cepillado}}, Cepillado: Sí{{/if}}, Pies Tablares: {{piesTablares}}, Subtotal: {{subTotal}}
  {{else}}
  -- No hay detalles para esta venta.
  {{/each}}
{{/each}}
{{else}}
No se proporcionaron datos de ventas.
{{/if}}

Consulta del Usuario:
{{{prompt}}}

Por favor, responde a la consulta basándote únicamente en los datos proporcionados. Si la pregunta requiere información que no está presente (ej. costos operativos detallados, stock exacto si no se deduce de compras/ventas, detalles de clientes no listados), indica que no tienes esa información específica, pero intenta responder con lo que sí tienes. Si la pregunta es ambigua, pide aclaración.
Sé conciso y directo en tu respuesta. Si necesitas realizar cálculos (ej. sumas, promedios, encontrar el más vendido), hazlos y presenta el resultado.

Formato de Respuesta Esperado:
{
  "respuesta": "Tu respuesta aquí..."
}
`,
});

const asistenteConsultasFlow = ai.defineFlow(
  {
    name: 'asistenteConsultasFlow',
    inputSchema: AsistenteConsultasInputSchema,
    outputSchema: AsistenteConsultasOutputSchema,
  },
  async (input) => {
    const { output } = await promptTemplate(input);
    if (!output) {
      return { respuesta: "No se pudo generar una respuesta en este momento." };
    }
    return output;
  }
);
