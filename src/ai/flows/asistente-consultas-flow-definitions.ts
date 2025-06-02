
/**
 * @fileOverview Definitions for the Asistente Consultas Genkit flow.
 * This file does NOT use the 'use server' directive.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// type { Compra, Venta, VentaDetalle } can be imported if needed for internal logic
// but the schemas below are self-contained for the flow's input/output.

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
  -- {{#if unidades}}{{unidades}} unidades de {{/if}}{{#if tipoMadera}}{{tipoMadera}}{{else}}madera no especificada{{/if}}{{#if alto}} (Dimensiones: {{alto}}" Alto{{/if}}{{#if ancho}} x {{ancho}}" Ancho{{/if}}{{#if largo}} x {{largo}}m Largo){{/if}}{{#if precioPorPie}}, Precio/Pie: {{precioPorPie}}{{/if}}{{#if cepillado}}, Cepillado: Sí{{/if}}{{#if piesTablares}}, Pies Tablares: {{piesTablares}}{{/if}}{{#if subTotal}}, Subtotal: {{subTotal}}{{/if}}
  {{else}}
  -- No hay detalles para esta venta.
  {{/each}}
{{/each}}
{{else}}
No se proporcionaron datos de ventas.
{{/if}}

Consulta del Usuario:
{{{prompt}}}

Por favor, responde a la consulta basándote únicamente en los datos proporcionados. Si la pregunta requiere información que no está presente (ej. costos operativos detallados no inferibles, stock exacto si no se deduce de compras/ventas, detalles de clientes no listados), indica que no tienes esa información específica, pero intenta responder con lo que sí tienes. Si la pregunta es ambigua, pide aclaración.
Sé conciso y directo en tu respuesta. Si necesitas realizar cálculos (ej. sumas, promedios, encontrar el más vendido), hazlos y presenta el resultado.

Formato de Respuesta Esperado:
{
  "respuesta": "Tu respuesta aquí..."
}
`,
});

// Export the flow itself so it can be called from the 'use server' file
export const asistenteConsultasFlowInternal = ai.defineFlow(
  {
    name: 'asistenteConsultasFlow', // Name can remain the same for Genkit's internal registry
    inputSchema: AsistenteConsultasInputSchema,
    outputSchema: AsistenteConsultasOutputSchema,
  },
  async (input: AsistenteConsultasInput): Promise<AsistenteConsultasOutput> => {
    console.log("asistenteConsultasFlowInternal: Recibida entrada - ", JSON.stringify(input.prompt));
    try {
      const { output, usage } = await promptTemplate(input);
      console.log("asistenteConsultasFlowInternal: Uso de tokens - ", usage);

      if (!output) {
        console.error("asistenteConsultasFlowInternal: La salida del LLM fue nula o indefinida después del parseo.");
        return { respuesta: "El asistente no pudo procesar la solicitud para generar una respuesta estructurada. Intente reformular su pregunta." };
      }
      console.log("asistenteConsultasFlowInternal: Respuesta generada - ", output.respuesta);
      return output;
    } catch (e: any) {
      console.error("asistenteConsultasFlowInternal: Error durante la ejecución del prompt o la llamada al LLM:", e);
      let errorMessage = "Ocurrió un error al comunicarse con el asistente de IA.";
      if (e.message) errorMessage += ` Detalles: ${e.message}.`;
      if (e.finishReason) errorMessage += ` Razón de finalización: ${e.finishReason}.`;
      if (e.safetyRatings) errorMessage += ` Clasificaciones de seguridad activadas: ${JSON.stringify(e.safetyRatings)}.`;
      if (e.errors) errorMessage += ` Errores de validación: ${JSON.stringify(e.errors)}`;
      return { respuesta: errorMessage };
    }
  }
);
