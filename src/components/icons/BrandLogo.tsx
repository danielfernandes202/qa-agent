
import type { SVGProps } from 'react';

export function BrandLogo({ className = "w-10 h-10", glow = true }: {className?: string, glow?: boolean}) {
    return (
      <div className={`relative ${className} group`}>
        {glow && (
          <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full drop-shadow-[0_0_8px_hsla(var(--primary)/0.4)]"
        >
          {/* Hexagonal Shield Frame (Legacy/Protection) */}
          <path 
            d="M50 5L90 25V75L50 95L10 75V25L50 5Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="text-white/20"
          />
          <path 
            d="M50 12L82 28V72L50 88L18 72V28L50 12Z" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeDasharray="4 4"
            className="text-primary/30"
          />
          
          {/* Stylized 'F' Monogram (Francis) */}
          <path 
            d="M35 35H65M35 50H55M35 35V70" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
            className="group-hover:stroke-primary transition-colors"
          />
          
          {/* Neural Nodes (AI/Connection) */}
          <circle cx="65" cy="35" r="3" fill="hsl(var(--primary))" className="animate-pulse" />
          <circle cx="55" cy="50" r="3" fill="hsl(var(--primary))" style={{ animationDelay: '0.5s' }} className="animate-pulse" />
          <circle cx="35" cy="70" r="3" fill="hsl(var(--primary))" style={{ animationDelay: '1s' }} className="animate-pulse" />
          
          {/* Decorative Circuit Traces */}
          <path d="M10 25L25 15" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5" />
          <path d="M90 75L75 85" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>
    );
}
