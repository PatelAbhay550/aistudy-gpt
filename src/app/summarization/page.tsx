'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { summarizeText } from '@/ai/flows/summarize-text';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ClipboardCopy, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SummarizationPage() {
  const [textToSummarize, setTextToSummarize] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textToSummarize.trim()) {
      toast({
        title: 'Missing text',
        description: 'Please enter some text to summarize.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSummary(''); 
    try {
      const response = await summarizeText({ text: textToSummarize });
      setSummary(response.summary);
    } catch (error) {
      console.error('Error summarizing text:', error);
      toast({
        title: 'Error',
        description: 'Failed to summarize the text. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({ title: 'Copied to clipboard!'});
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Text Summarization</CardTitle>
          <CardDescription>Paste your text below to get a concise summary.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Textarea
              placeholder="Enter or paste your long text or article here..."
              value={textToSummarize}
              onChange={(e) => setTextToSummarize(e.target.value)}
              rows={10}
              className="text-base"
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !textToSummarize.trim()} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Summarize Text
            </Button>
          </CardFooter>
        </form>
      </Card>

      {summary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Here is the summarized version of your text.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy summary">
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <ClipboardCopy className="h-5 w-5" />}
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-auto max-h-[300px] rounded-md border p-4 bg-secondary/30">
              <p className="text-base whitespace-pre-wrap">{summary}</p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
