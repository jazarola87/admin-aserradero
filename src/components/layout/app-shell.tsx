
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { NAV_ITEMS } from "@/lib/constants";
import { SawmillLogo } from "@/components/icons/sawmill-logo";
import { LogOut, PanelLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { signOut } from "@/lib/firebase/services/authService";
import { useConfig } from "@/contexts/configContext";
import { Skeleton } from "@/components/ui/skeleton";

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

function AppShellFooter() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <SidebarFooter className="p-4 border-t border-sidebar-border mt-auto">
      <div className="flex flex-col gap-2 items-start text-sm w-full">
         <div className="text-sidebar-foreground/70 truncate w-full group-data-[collapsible=icon]:hidden px-2">
            {user.email}
         </div>
         <SidebarMenuItem className="w-full">
            <SidebarMenuButton onClick={handleSignOut} tooltip="Cerrar Sesión" className="w-full justify-start">
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </div>
    </SidebarFooter>
  );
}

function AppShellSkeleton() {
  return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Cargando aplicación...</p>
      </div>
  );
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const { config, loading: configLoading } = useConfig();
  const { loading: authLoading } = useAuth();
  const { logoUrl, nombreAserradero } = config;

  const isDataUri = (string: string | undefined) => {
    if (!string) return false;
    return string.startsWith('data:image');
  }

  // Show a skeleton loader while auth or config is loading.
  // This is the key to preventing hydration errors.
  if (authLoading || configLoading) {
    return <AppShellSkeleton />;
  }

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r flex flex-col"
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
                data-ai-hint="logo company"
              />
            ) : (
              <SawmillLogo className="h-8 w-8 text-primary shrink-0" />
            )}
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {nombreAserradero}
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent asChild>
          <ScrollArea className="h-full">
            <SidebarNav />
          </ScrollArea>
        </SidebarContent>
        <AppShellFooter />
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
