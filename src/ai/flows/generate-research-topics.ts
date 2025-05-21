// src/ai/flows/generate-research-topics.ts
'use server';

/**
 * @fileOverview A research topic generation AI agent.
 *
 * - generateResearchTopics - A function that handles the research topic generation process.
 * - GenerateResearchTopicsInput - The input type for the generateResearchTopics function.
 * - GenerateResearchTopicsOutput - The return type for the generateResearchTopics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResearchTopicsInputSchema = z.object({
  fieldOfStudy: z.string().describe('The field of study for the research topics.'),
  keywords: z.string().describe('Keywords related to the research topics.'),
});
export type GenerateResearchTopicsInput = z.infer<
  typeof GenerateResearchTopicsInputSchema
>;

const GenerateResearchTopicsOutputSchema = z.object({
  topics: z
    .array(z.string())
    .describe('A list of potential research topics based on the input.'),
});
export type GenerateResearchTopicsOutput = z.infer<
  typeof GenerateResearchTopicsOutputSchema
>;

export async function generateResearchTopics(
  input: GenerateResearchTopicsInput
): Promise<GenerateResearchTopicsOutput> {
  return generateResearchTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateResearchTopicsPrompt',
  input: {schema: GenerateResearchTopicsInputSchema},
  output: {schema: GenerateResearchTopicsOutputSchema},
  prompt: `You are an expert academic research assistant. Your role is to generate a list of potential research topics for students.

  Based on the provided field of study and keywords, generate a list of research topics that the student can explore.

  Field of Study: {{{fieldOfStudy}}}
  Keywords: {{{keywords}}}

  Please generate a list of research topics that are relevant and interesting.`,
});

const generateResearchTopicsFlow = ai.defineFlow(
  {
    name: 'generateResearchTopicsFlow',
    inputSchema: GenerateResearchTopicsInputSchema,
    outputSchema: GenerateResearchTopicsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
