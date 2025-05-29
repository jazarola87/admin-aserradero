
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, DollarSign, Settings, Lightbulb, HardHat, FileText, BookText, ClipboardList, Wrench, Tag } from 'lucide-react';

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
    title: 'Compras',
    href: '/compras',
    icon: ShoppingCart,
  },
  {
    title: 'Ventas',
    href: '/ventas',
    icon: DollarSign,
  },
  {
    title: 'Presupuestos',
    href: '/presupuestos',
    icon: ClipboardList,
  },
  {
    title: 'Precios de Venta', // Renamed from "Costos y Precios Base"
    href: '/precios-venta',    // New route
    icon: Tag, // Using Tag icon for pricing
  },
  {
    title: 'Costos Operativos', // New section
    href: '/costos-operativos',
    icon: Wrench, // Wrench for operational costs/settings
  },
  {
    title: 'Asistente de Precios',
    href: '/asistente-precios',
    icon: Lightbulb,
  },
];
