import type { SVGProps } from 'react';

export function SawmillLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      {...props}
    >
      <title>Administrador de Aserradero Logo</title>
      {/* Tree trunk */}
      <rect x="40" y="50" width="20" height="40" rx="3" ry="3" className="fill-primary stroke-primary-foreground" />
      {/* Canopy */}
      <path d="M50 10 L20 50 L80 50 Z" className="fill-primary stroke-primary-foreground" />
      {/* Saw blade outline (simple representation) */}
      <circle cx="50" cy="70" r="18" strokeDasharray="5,3" className="stroke-primary-foreground opacity-50" strokeWidth="2" />
    </svg>
  );
}
