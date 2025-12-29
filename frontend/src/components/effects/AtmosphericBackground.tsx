import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AtmosphericBackground() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    // Create floating particles
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 4 + 1;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 10;
      
      particle.className = 'absolute rounded-full bg-white/10';
      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particle-float ${duration}s ease-in-out infinite;
        animation-delay: ${delay}s;
      `;
      container.appendChild(particle);
    }

    // Add particle animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes particle-float {
        0%, 100% {
          transform: translate(0, 0) rotate(0deg);
          opacity: 0;
        }
        10% { opacity: 0.6; }
        90% { opacity: 0.6; }
        100% {
          transform: translate(${Math.random() > 0.5 ? '' : '-'}50px, -100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      container.innerHTML = '';
      style.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Fog Layer 1 */}
      <motion.div
        className="absolute w-[200%] h-full"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(20, 20, 30, 0.3) 20%,
            rgba(30, 30, 45, 0.4) 50%,
            rgba(20, 20, 30, 0.3) 80%,
            transparent 100%
          )`,
        }}
        animate={{
          x: ['-50%', '0%'],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Fog Layer 2 */}
      <motion.div
        className="absolute w-[200%] h-full top-[30%] opacity-40"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(20, 20, 30, 0.3) 20%,
            rgba(30, 30, 45, 0.4) 50%,
            rgba(20, 20, 30, 0.3) 80%,
            transparent 100%
          )`,
        }}
        animate={{
          x: ['0%', '-50%'],
        }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating Particles Container */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden" />

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.5) 100%
          )`,
        }}
      />
    </div>
  );
}

