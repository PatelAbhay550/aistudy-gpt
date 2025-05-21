
import type { LucideIcon } from 'lucide-react';
import { Brain, BookOpenText, Lightbulb, Info } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
}

export const navItems: NavItem[] = [
  {
    title: 'AI Tutor',
    href: '/tutoring',
    icon: Brain,
    label: 'AI Tutor',
  },
  {
    title: 'Summarization',
    href: '/summarization',
    icon: BookOpenText,
    label: 'Summarize Text',
  },
  {
    title: 'Idea Generator',
    href: '/idea-generator',
    icon: Lightbulb,
    label: 'Get Ideas',
  },
  {
    title: 'About Us',
    href: '/about',
    icon: Info,
    label: 'About Us',
  },
];
