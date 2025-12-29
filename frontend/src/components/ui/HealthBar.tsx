import { motion } from 'framer-motion';

interface Props {
  current: number;
  max: number;
  label?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'player' | 'enemy';
  className?: string;
}

export default function HealthBar({
  current,
  max,
  label,
  showText = true,
  size = 'md',
  variant = 'player',
  className = '',
}: Props) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  const getHeightClass = () => {
    switch (size) {
      case 'sm': return 'h-2';
      case 'lg': return 'h-4';
      default: return 'h-3';
    }
  };

  const getColor = () => {
    if (variant === 'enemy') {
      return 'bg-gradient-to-r from-[#4a1a1a] to-[#8b3a3a]';
    }
    
    // Dynamic color based on HP percentage
    if (percentage > 60) {
      return 'bg-gradient-to-r from-[var(--accent-green)] to-[#5cb85c]';
    } else if (percentage > 30) {
      return 'bg-gradient-to-r from-[#8b6914] to-[var(--accent-gold)]';
    } else {
      return 'bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-red-bright)]';
    }
  };

  return (
    <div className={className}>
      {(label || showText) && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
          {label && <span>{label}</span>}
          {showText && <span>{current}/{max}</span>}
        </div>
      )}
      <div className={`${getHeightClass()} bg-[var(--bg-dark)] rounded overflow-hidden`}>
        <motion.div
          className={`h-full rounded ${getColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            boxShadow: percentage < 30 ? '0 0 10px rgba(214, 69, 69, 0.5)' : 'none',
          }}
        />
      </div>
    </div>
  );
}

