
import { config } from 'dotenv';
config();

import '@/ai/flows/precio-sugerido.ts';
// Import the flow definitions file for Genkit registration
import '@/ai/flows/asistente-consultas-flow-definitions.ts';
import '@/ai/flows/costo-aserrio-pie-flow.ts';
// The 'use server' file (asistente-consultas-flow.ts) is for Next.js server actions, not Genkit registration.
