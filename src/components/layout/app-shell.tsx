
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
import { PanelLeft } from "lucide-react";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";

function SidebarNav() {
  const pathname = usePathname();
  const { open, isMobile, setOpenMobile } = useSidebar();

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
            <Link href={item.href} onClick={() => { if (isMobile) setOpenMobile(false); }}>
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
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = React.useState<string | undefined>(undefined);
  const [nombreAserradero, setNombreAserradero] = React.useState<string>("");

  React.useEffect(() => {
    async function fetchConfig() {
      try {
        const config = await getAppConfig();
        setLogoUrl(config.logoUrl);
        setNombreAserradero(config.nombreAserradero);
      } catch (error) {
        console.error("AppShell: Could not fetch app config", error);
        // Fallback to a default name if config fails
        setNombreAserradero("Aserradero");
      }
    }
    fetchConfig();
  }, [pathname]); // Re-fetch on route change to ensure data is fresh

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
            {logoUrl && isDataUri(logoUrl) ? (
              <Image 
                src={logoUrl} 
                alt="Logo Aserradero" 
                width={32} 
                height={32} 
                className="h-8 w-8 object-contain shrink-0"
              />
            ) : (
              <SawmillLogo className="h-8 w-8 text-primary shrink-0" />
            )}
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {nombreAserradero || "Cargando..."}
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent asChild>
          <ScrollArea className="h-full">
            <SidebarNav />
          </ScrollArea>
        </SidebarContent>
        {/* Footer has been removed as it only contained the sign out button */}
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
