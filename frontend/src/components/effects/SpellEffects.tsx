import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SpellEffectProps {
  type: 'fireball' | 'heal' | 'sneak_attack' | 'second_wind';
  onComplete?: () => void;
}

export function SpellEffect({ type, onComplete }: SpellEffectProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate particles based on spell type
    const count = type === 'fireball' ? 40 : type === 'heal' ? 25 : 20;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);

    // Complete after animation
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const getParticleStyle = () => {
    switch (type) {
      case 'fireball':
        return 'bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400';
      case 'heal':
        return 'bg-gradient-to-t from-green-600 via-emerald-400 to-green-200';
      case 'sneak_attack':
        return 'bg-gradient-to-t from-purple-900 via-purple-600 to-purple-300';
      case 'second_wind':
        return 'bg-gradient-to-t from-blue-600 via-cyan-400 to-white';
      default:
        return 'bg-white';
    }
  };

  const getGlowColor = () => {
    switch (type) {
      case 'fireball':
        return 'rgba(255, 100, 0, 0.6)';
      case 'heal':
        return 'rgba(100, 255, 100, 0.6)';
      case 'sneak_attack':
        return 'rgba(150, 50, 255, 0.6)';
      case 'second_wind':
        return 'rgba(100, 200, 255, 0.6)';
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Screen glow effect */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: getGlowColor() }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 1 }}
      />

      {/* Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute w-3 h-3 rounded-full ${getParticleStyle()}`}
          style={{
            left: `${particle.x}%`,
            top: type === 'heal' ? `${50 + particle.y / 2}%` : `${particle.y}%`,
            boxShadow: `0 0 10px ${getGlowColor()}`,
          }}
          initial={{ 
            scale: 0, 
            opacity: 0,
            y: type === 'heal' ? 100 : 0,
          }}
          animate={{ 
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
            y: type === 'heal' ? -200 : [-50, -150],
            x: type === 'fireball' ? [0, (Math.random() - 0.5) * 100] : 0,
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Central flash for fireball */}
      {type === 'fireball' && (
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,0,1) 0%, rgba(255,100,0,0.8) 50%, transparent 70%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 3, 4], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8 }}
        />
      )}

      {/* Healing ring effect */}
      {type === 'heal' && (
        <motion.div
          className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-32 h-32 border-4 border-green-400 rounded-full"
          style={{ boxShadow: '0 0 30px rgba(100, 255, 100, 0.8)' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 3], opacity: [1, 0] }}
          transition={{ duration: 1.5 }}
        />
      )}
    </motion.div>
  );
}

// Hit flash effect
export function HitFlash({ type = 'damage' }: { type?: 'damage' | 'critical' }) {
  return (
    <motion.div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{
        backgroundColor: type === 'critical' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.2 }}
    />
  );
}

// Blood vignette effect at low HP
export function LowHPVignette({ hpPercent }: { hpPercent: number }) {
  if (hpPercent > 30) return null;

  const intensity = Math.max(0, (30 - hpPercent) / 30);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(139, 0, 0, ${intensity * 0.5}) 100%)`,
      }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

