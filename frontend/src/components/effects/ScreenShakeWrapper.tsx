import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

interface Props {
  children: ReactNode;
}

export default function ScreenShakeWrapper({ children }: Props) {
  const shakeIntensity = useGameStore((s) => s.shakeIntensity);

  const getShakeAnimation = () => {
    switch (shakeIntensity) {
      case 'light':
        return {
          x: [0, -3, 3, -3, 3, -2, 2, 0],
          y: [0, 2, -2, 2, -2, 1, -1, 0],
        };
      case 'heavy':
        return {
          x: [0, -10, 10, -8, 8, -6, 6, -4, 4, -2, 2, 0],
          y: [0, 5, -5, 4, -4, 3, -3, 2, -2, 1, -1, 0],
        };
      default:
        return { x: 0, y: 0 };
    }
  };

  return (
    <motion.div
      animate={getShakeAnimation()}
      transition={{
        duration: shakeIntensity === 'heavy' ? 0.5 : 0.3,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

