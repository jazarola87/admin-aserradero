'use client';

import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/authContext";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
