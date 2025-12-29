import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ParticleFieldProps {
  type: 'dust' | 'ember' | 'magic' | 'rain' | 'snow';
  density?: number;
}

export function ParticleField({ type, density = 30 }: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing particles
    container.innerHTML = '';

    // Create particles
    for (let i = 0; i < density; i++) {
      const particle = document.createElement('div');
      const size = getParticleSize(type);
      const color = getParticleColor(type);
      const duration = getAnimationDuration(type);
      
      particle.className = 'absolute rounded-full';
      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${Math.random() * 0.5 + 0.2};
        animation: ${getAnimationName(type)} ${duration}s linear infinite;
        animation-delay: ${Math.random() * duration}s;
        ${type === 'ember' ? `box-shadow: 0 0 ${size * 2}px ${color};` : ''}
      `;
      container.appendChild(particle);
    }

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = getAnimationStyles();
    document.head.appendChild(style);

    return () => {
      container.innerHTML = '';
      style.remove();
    };
  }, [type, density]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    />
  );
}

function getParticleSize(type: string): number {
  switch (type) {
    case 'dust': return Math.random() * 3 + 1;
    case 'ember': return Math.random() * 4 + 2;
    case 'magic': return Math.random() * 5 + 2;
    case 'rain': return 2;
    case 'snow': return Math.random() * 4 + 2;
    default: return 2;
  }
}

function getParticleColor(type: string): string {
  switch (type) {
    case 'dust': return 'rgba(255, 255, 255, 0.3)';
    case 'ember': return `hsl(${Math.random() * 30 + 15}, 100%, 60%)`;
    case 'magic': return `hsl(${Math.random() * 60 + 30}, 100%, 70%)`;
    case 'rain': return 'rgba(150, 200, 255, 0.6)';
    case 'snow': return 'rgba(255, 255, 255, 0.8)';
    default: return 'white';
  }
}

function getAnimationDuration(type: string): number {
  switch (type) {
    case 'dust': return 15 + Math.random() * 10;
    case 'ember': return 3 + Math.random() * 2;
    case 'magic': return 4 + Math.random() * 3;
    case 'rain': return 0.5 + Math.random() * 0.3;
    case 'snow': return 8 + Math.random() * 4;
    default: return 10;
  }
}

function getAnimationName(type: string): string {
  switch (type) {
    case 'dust': return 'particle-drift';
    case 'ember': return 'particle-rise';
    case 'magic': return 'particle-sparkle';
    case 'rain': return 'particle-fall-fast';
    case 'snow': return 'particle-fall-slow';
    default: return 'particle-drift';
  }
}

function getAnimationStyles(): string {
  return `
    @keyframes particle-drift {
      0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
      10% { opacity: 0.5; }
      90% { opacity: 0.5; }
      100% { transform: translate(50px, -100vh) rotate(360deg); opacity: 0; }
    }
    
    @keyframes particle-rise {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-100vh) scale(0); opacity: 0; }
    }
    
    @keyframes particle-sparkle {
      0%, 100% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes particle-fall-fast {
      0% { transform: translateY(-10px); opacity: 0; }
      10% { opacity: 1; }
      100% { transform: translateY(100vh); opacity: 0.5; }
    }
    
    @keyframes particle-fall-slow {
      0% { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
      10% { opacity: 0.8; }
      100% { transform: translate(30px, 100vh) rotate(360deg); opacity: 0.3; }
    }
  `;
}

// Torch flicker effect
export function TorchFlicker() {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 150, 50, 0.1) 0%, transparent 50%)',
      }}
      animate={{
        opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Magic ready indicator
export function MagicReadyGlow({ isReady }: { isReady: boolean }) {
  if (!isReady) return null;

  return (
    <motion.div
      className="absolute -inset-2 rounded-xl pointer-events-none"
      style={{
        background: 'linear-gradient(45deg, transparent, rgba(201, 162, 39, 0.3), transparent)',
        backgroundSize: '200% 200%',
      }}
      animate={{
        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

