
'use client';

import React, { useState, useEffect, useRef } from 'react';

// Custom Reveal Hook with Scale support
const useReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible] as const;
};

export const RevealSection = ({ children, className = "", delay = 0 }: {children: React.ReactNode, className?: string, delay?: number}) => {
  const [ref, isVisible] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition-all duration-[1200ms] cubic-bezier(0.2, 0.8, 0.2, 1) transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-[0.98]'
      }`}
    >
      {children}
    </div>
  );
};
