import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export default function DamageNumbers() {
  const damageNumbers = useGameStore((s) => s.damageNumbers);

  const getColor = (type: string) => {
    switch (type) {
      case 'damage':
        return 'text-white';
      case 'critical':
        return 'text-[var(--text-gold)]';
      case 'heal':
        return 'text-[var(--text-green)]';
      case 'enemy':
        return 'text-[var(--text-red)]';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {damageNumbers.map((dmg) => (
          <motion.div
            key={dmg.id}
            className={`absolute font-display font-bold text-3xl ${getColor(dmg.type)}`}
            style={{
              left: dmg.x,
              top: dmg.y,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ 
              opacity: 0, 
              y: -80, 
              scale: dmg.type === 'critical' ? 1.5 : 1.2 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {dmg.type === 'heal' ? '+' : ''}{dmg.value}
            {dmg.type === 'critical' && (
              <span className="text-lg ml-1">CRIT!</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

