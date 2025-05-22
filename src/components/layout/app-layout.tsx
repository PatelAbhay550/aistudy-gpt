"use client"
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { Menu, LogIn, LogOut, UserCircle, Settings, Home } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const pageTitles: { [key: string]: string } = {
  '/tutoring': 'AI Tutor',
  '/summarization': 'Summarization Tool',
  '/idea-generator': 'Idea Generator',
  '/about': 'About Us',
};

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const currentPageTitle = pageTitles[pathname] || 'Study AI Helper';

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="items-center">
          <Logo className="h-8 w-auto text-primary" />
          <span className="ml-2 text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            AiStudy GPT
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <SidebarTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SidebarTrigger>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{currentPageTitle}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {loading ? (
              <Button variant="ghost" size="icon" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                      <AvatarFallback>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5"/>}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={()=> window.location.href = '/'}>
                    <Home className="mr-2 h-4 w-4" />
                   
                    <span>Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={()=> window.location.href = '/about'}>
                    <UserCircle className="mr-2 h-4 w-4" />
                   
                    <span>About AiStudy GPT</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOutUser}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={signInWithGoogle} variant="outline">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 flex-col p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Simple loader for auth button, you might want a more sophisticated one
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
);

