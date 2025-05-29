
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, PlusCircle, DollarSign, BookText, Settings, Lightbulb, Wrench, HardHat, FileText } from 'lucide-react'; // Added FileText for Presupuesto

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
    title: 'Registro de Compras',
    href: '/compras',
    icon: ShoppingCart,
  },
  {
    title: 'Ingreso de Compra',
    href: '/compras/nueva',
    icon: PlusCircle,
  },
  {
    title: 'Registro de Ventas',
    href: '/ventas',
    icon: BookText,
  },
  {
    title: 'Ingreso de Venta',
    href: '/ventas/nueva',
    icon: DollarSign,
  },
  {
    title: 'Ingresar Presupuesto',
    href: '/presupuestos/nuevo',
    icon: FileText,
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

