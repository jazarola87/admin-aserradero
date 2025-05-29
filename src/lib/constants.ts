
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, DollarSign, Settings, Lightbulb, HardHat, FileText, BookText, ClipboardList } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Balance General',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Compras', // Parent item
    href: '/compras',
    icon: ShoppingCart,
  },
  {
    title: 'Ventas', // Parent item
    href: '/ventas',
    icon: DollarSign, // Changed from BookText for more financial connotation
  },
  {
    title: 'Presupuestos', // Parent item
    href: '/presupuestos',
    icon: ClipboardList, // Icon for quotes/estimates
  },
  {
    title: 'Costos y Precios Base',
    href: '/costos',
    icon: HardHat,
  },
  {
    title: 'Asistente de Precios',
    href: '/asistente-precios',
    icon: Lightbulb,
  },
];
