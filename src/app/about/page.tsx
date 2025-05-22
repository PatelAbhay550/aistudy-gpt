
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Github, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <CardTitle className="text-3xl font-bold text-center text-primary">
             About <a href="/"> AIStudy GPT</a>
          </CardTitle>
          <CardDescription className="text-center text-lg text-foreground/80 pt-1">
            Your AI-powered helper, designed to assist you.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-base text-foreground/90 leading-relaxed text-center">
            AIStudy GPT is a project developed by Abhay Raj Patel to explore the capabilities of AI and provide useful tools for everyday academic and research tasks.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-secondary/50 p-6">
          <CardTitle className="text-2xl font-semibold text-center text-foreground">
            About the Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <Image
              src="https://avatars.githubusercontent.com/u/90134639?v=4"
              alt="Abhay Raj Patel"
              width={128}
              height={128}
              data-ai-hint="profile avatar"
              className="rounded-full shadow-md border-2 border-primary/50"
            />
            <h3 className="text-xl font-medium text-foreground">Abhay Raj Patel</h3>
            <div className="flex items-center text-muted-foreground">
              <Globe className="mr-2 h-5 w-5 text-accent" />
              <span>India</span>
            </div>
          </div>
          <p className="text-base text-foreground/90 leading-relaxed text-center pt-2">
            AIStudy GPT is proudly developed by Abhay Raj Patel, a passionate software developer from India.
            You can find more of his work and connect with him on GitHub.
          </p>
          <div className="pt-4 text-center">
            <Button asChild variant="default" className="shadow hover:shadow-md transition-shadow bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 py-3">
              <Link href="https://github.com/PatelAbhay550" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-5 w-5" />
                Visit GitHub Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
