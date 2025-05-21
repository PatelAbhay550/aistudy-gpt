'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { navItems, type NavItem } from './sidebar-nav-items';

export function SidebarNav() {
  const pathname = usePathname();

  if (!navItems?.length) {
    return null;
  }

  return (
    <SidebarMenu>
      {navItems.map((item, index) => (
        <SidebarMenuItem key={index}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label || item.title}
              className={cn(
                "justify-start",
                pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <a>
                <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
