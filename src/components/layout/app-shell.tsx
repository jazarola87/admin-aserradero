
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image"; // Import next/image
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV_ITEMS, type NavItem } from "@/lib/constants";
import { SawmillLogo } from "@/components/icons/sawmill-logo";
import { PanelLeft, ImageOff } from "lucide-react";
import { initialConfigData } from "@/lib/config-data"; // Import config data

function SidebarNav() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={open ? "" : item.title}
            className="justify-start"
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  
  // Use state to hold dynamic config values to trigger re-render if they change
  // However, initialConfigData itself is not a stateful source.
  // For AppShell to truly react to initialConfigData changes from other pages,
  // a global state/context would be needed. This reads it on mount/re-render of AppShell.
  const [logoUrl, setLogoUrl] = React.useState<string | undefined>(undefined);
  const [nombreAserradero, setNombreAserradero] = React.useState<string>("");

  React.useEffect(() => {
    setLogoUrl(initialConfigData.logoUrl);
    setNombreAserradero(initialConfigData.nombreAserradero);
  }, []); // Re-run if initialConfigData reference changes (though it won't without a state manager)
          // Or add a dependency that forces re-check, e.g. pathname for navigation


  const isValidHttpUrl = (string: string | undefined) => {
    if (!string) return false;
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

  const isDataUri = (string: string | undefined) => {
    if (!string) return false;
    return string.startsWith('data:image');
  }


  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r"
      >
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            {logoUrl && (isDataUri(logoUrl) || isValidHttpUrl(logoUrl)) ? (
              <Image 
                src={logoUrl} 
                alt="Logo Aserradero" 
                width={32} 
                height={32} 
                className="h-8 w-8 object-contain shrink-0"
                onError={() => {
                  // Fallback if image fails to load, e.g. set to use default logo
                  // For simplicity, we won't implement a dynamic fallback state here
                  // but in a real app, you might set a flag to render SawmillLogo
                  console.warn("Failed to load custom logo from URL:", logoUrl);
                }}
              />
            ) : (
              <SawmillLogo className="h-8 w-8 text-primary shrink-0" />
            )}
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {nombreAserradero || "Aserradero"}
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent asChild>
          <ScrollArea className="h-full">
            <SidebarNav />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Can add footer items here if needed */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
          <div className="md:hidden"> 
            <SidebarTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir/Cerrar menú</span>
              </Button>
            </SidebarTrigger>
           </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
