'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateResearchTopics } from '@/ai/flows/generate-research-topics';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function IdeaGeneratorPage() {
  const [fieldOfStudy, setFieldOfStudy] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fieldOfStudy.trim()) {
      toast({
        title: 'Missing field of study',
        description: 'Please enter a field of study.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedTopics([]);
    try {
      const response = await generateResearchTopics({ fieldOfStudy, keywords });
      setGeneratedTopics(response.topics);
    } catch (error) {
      console.error('Error generating topics:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate topics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Research Idea Generator</CardTitle>
          <CardDescription>
            Enter a field of study and optional keywords to generate research topic ideas.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="fieldOfStudy" className="block text-sm font-medium mb-1">Field of Study <span className="text-destructive">*</span></label>
              <Input
                id="fieldOfStudy"
                placeholder="e.g., Artificial Intelligence, Marine Biology"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium mb-1">Keywords (optional)</label>
              <Input
                id="keywords"
                placeholder="e.g., ethics, climate change, deep learning"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="text-base"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !fieldOfStudy.trim()} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Ideas
            </Button>
          </CardFooter>
        </form>
      </Card>

      {generatedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Research Topics</CardTitle>
            <CardDescription>Here are some potential research topics based on your input.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-auto max-h-[400px] rounded-md border p-4 bg-secondary/30">
              <ul className="space-y-3">
                {generatedTopics.map((topic, index) => (
                  <li key={index} className="flex items-start text-base">
                    <span className="mr-2 text-primary">&#8226;</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
