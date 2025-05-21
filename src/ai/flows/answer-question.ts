// src/ai/flows/answer-question.ts
'use server';

/**
 * @fileOverview An AI agent that answers questions about a specific academic topic.
 *
 * - answerQuestion - A function that handles the question answering process.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerQuestionInputSchema = z.object({
  topic: z.string().describe('The academic topic to ask a question about.'),
  question: z.string().describe('The question to be answered.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: {schema: AnswerQuestionInputSchema},
  output: {schema: AnswerQuestionOutputSchema},
  prompt: `You are an expert in the field of {{{topic}}}.

  Please answer the following question about this topic clearly and concisely:

  {{{question}}}`,
});

interface AnswerQuestionFlowInput extends AnswerQuestionInput {}
interface AnswerQuestionFlowOutput extends AnswerQuestionOutput {}

const answerQuestionFlow = ai.defineFlow(
    {
        name: 'answerQuestionFlow',
        inputSchema: AnswerQuestionInputSchema,
        outputSchema: AnswerQuestionOutputSchema,
    },
    async (input: AnswerQuestionFlowInput): Promise<AnswerQuestionFlowOutput> => {
        const {output} = await prompt(input);
        return output!;
    }
);
