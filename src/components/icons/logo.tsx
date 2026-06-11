
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 12c0-4.42-3.58-8-8-8S4 7.58 4 12s3.58 8 8 8" />
      <path d="M20 12h-4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4" />
      <path d="M4 12h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H4" />
      <path d="M14 12v4" />
      <path d="M10 12v4" />
      <path d="M12 20v-4" />
      <path d="M12 4V2" />
      <path d="m15 5-1-1" />
      <path d="m9 5 1-1" />
    </svg>
  );
}
