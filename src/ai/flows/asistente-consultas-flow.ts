
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
  AsistenteConsultasInputSchema, 
  AsistenteConsultasOutputSchema 
} from './asistente-consultas-flow-definitions'; 
import type { 
  AsistenteConsultasInput, 
  AsistenteConsultasOutput 
} from './asistente-consultas-flow-definitions';

// Re-export types if they are used by the client-side component calling this action
export type { AsistenteConsultasInput, AsistenteConsultasOutput };
// Re-export schemas if they are used for validation on client before calling action (optional)
export { AsistenteConsultasInputSchema, AsistenteConsultasOutputSchema };


export async function consultarAsistente(input: AsistenteConsultasInput): Promise<AsistenteConsultasOutput> {
  // The actual Genkit flow execution happens by calling the imported internal flow
  return asistenteConsultasFlowInternal(input);
}

