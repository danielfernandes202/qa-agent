
'use client';

import React, { useState, useEffect } from 'react';

const NeuralParticles = () => {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{top: string, left: string, animation: string, animationDelay: string}>>([]);

  useEffect(() => {
    setMounted(true);
    setParticles([...Array(20)].map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animation: `float-particle ${10 + Math.random() * 20}s linear infinite`,
      animationDelay: `-${Math.random() * 20}s`
    })));
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-500/20 rounded-full"
          style={p}
        />
      ))}
    </div>
  );
};


export default function GlobalEffects() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <div className="noise-overlay" />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(34, 211, 238, 0.05), transparent 40%)`}} />
        <div className="absolute inset-0 cyber-grid opacity-30" style={{ animation: 'grid-flow 15s linear infinite' }} />
        <NeuralParticles />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] rounded-full" />
      </div>
    </>
  );
}
