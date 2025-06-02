
'use server';
/**
 * @fileOverview Server Action wrapper for the Asistente Consultas AI flow.
 *
 * - consultarAsistente - Función que procesa la consulta del usuario y devuelve una respuesta.
 * - AsistenteConsultasInput - Tipo de entrada para la función (re-exported).
 * - AsistenteConsultasOutput - Tipo de salida para la función (re-exported).
 */

// Import the actual flow logic and schemas from the definitions file
import { 
  asistenteConsultasFlowInternal,
  // AsistenteConsultasInputSchema, // Schema no longer re-exported here
  // AsistenteConsultasOutputSchema  // Schema no longer re-exported here
} from './asistente-consultas-flow-definitions'; 
import type { 
  AsistenteConsultasInput, 
  AsistenteConsultasOutput 
} from './asistente-consultas-flow-definitions';

// Re-export types if they are used by the client-side component calling this action
export type { AsistenteConsultasInput, AsistenteConsultasOutput };
// Do NOT re-export Zod schemas from the 'use server' file.
// They are defined and exported from 'asistente-consultas-flow-definitions.ts' for Genkit's internal use.

export async function consultarAsistente(input: AsistenteConsultasInput): Promise<AsistenteConsultasOutput> {
  // The actual Genkit flow execution happens by calling the imported internal flow
  return asistenteConsultasFlowInternal(input);
}

