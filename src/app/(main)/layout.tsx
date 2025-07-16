
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/authContext";
import { ConfigProvider } from "@/contexts/configContext";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ConfigProvider>
        <AppShell>{children}</AppShell>
      </ConfigProvider>
    </AuthProvider>
  );
}
