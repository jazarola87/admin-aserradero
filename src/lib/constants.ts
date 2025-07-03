
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, DollarSign, Tag, Bot, FileText, ClipboardList, Wrench, CalendarClock, HardHat, Upload } from 'lucide-react';

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
    title: 'Carga Masiva',
    href: '/carga-masiva',
    icon: Upload,
  },
  {
    title: 'Cronograma de Entregas',
    href: '/cronograma-entregas',
    icon: CalendarClock,
  },
  {
    title: 'Precios de Venta',
    href: '/precios-venta',
    icon: Tag,
  },
  {
    title: 'Costos Operativos',
    href: '/costos-operativos',
    icon: Wrench,
  },
  {
    title: 'Asistente de Precios',
    href: '/asistente-precios',
    icon: Bot,
  },
    {
    title: 'Asistente Virtual',
    href: '/asistente-virtual',
    icon: Bot,
  },
];
