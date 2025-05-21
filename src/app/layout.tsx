
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import {Toaster} from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AiStudy GPT',
    description: 'AI Study Helper: Your AI-powered study companion for personalized learning and assistance make by Abhay Raj Patel',
    openGraph: {
        title: 'AiStudy GPT',
        description: 'AI Study Helper: Your AI-powered study companion for personalized learning and assistance make by Abhay Raj Patel',
        url: 'https://aistudy-gpt.vercel.app/',
        siteName: 'AiStudy GPT',
        images: [
            {
            url: 'https://github.com/PatelAbhay550/aistudy-gpt/blob/main/public/aistudy-gpt-image.png?raw=true',
            width: 1200,
            height: 630,
            },
        ],
        },
        keywords: [
            'AI Study Helper',
            'AI Tutor',
            'AI Summarization',
            'AI Idea Generator',
            'AI Research Assistant',
            'AI-Powered Learning',
        ],
        authors: [
            {
                name: 'Abhay Raj Patel',
                url: 'https://github.com/PatelAbhay550',
            },
        ],
        creator: 'Abhay Raj Patel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
