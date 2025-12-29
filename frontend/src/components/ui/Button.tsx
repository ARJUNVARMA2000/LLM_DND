import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { audioManager } from '../../systems/audio/AudioManager';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: string;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
}: Props) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'btn-gold-gradient text-[var(--bg-darkest)] shadow-lg shadow-[var(--accent-gold)]/20';
      case 'secondary':
        return 'bg-transparent border border-[var(--border-light)] text-[var(--text-primary)] hover:bg-[var(--bg-light)] hover:border-[var(--border-gold)]';
      case 'danger':
        return 'bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red-bright)]';
      case 'ghost':
        return 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]';
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-8 py-4 text-lg';
      default:
        return 'px-6 py-3 text-base';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      audioManager.playSfx('ui_click');
      onClick?.();
    }
  };

  return (
    <motion.button
      className={`
        font-display uppercase tracking-wider rounded
        flex items-center justify-center gap-2
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onHoverStart={() => !disabled && audioManager.playSfx('ui_hover')}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </motion.button>
  );
}

