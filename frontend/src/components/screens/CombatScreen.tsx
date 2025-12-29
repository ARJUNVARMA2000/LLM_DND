import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { combatAction, getInventory } from '../../api/client';
import HealthBar from '../ui/HealthBar';
import DamageNumbers from '../effects/DamageNumbers';
import { audioManager } from '../../systems/audio/AudioManager';

export default function CombatScreen() {
  const player = useGameStore((s) => s.player);
  const enemy = useGameStore((s) => s.enemy);
  const combatNarrative = useGameStore((s) => s.combatNarrative);
  
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setEnemy = useGameStore((s) => s.setEnemy);
  const setCombatNarrative = useGameStore((s) => s.setCombatNarrative);
  const setInCombat = useGameStore((s) => s.setInCombat);
  const setScreen = useGameStore((s) => s.setScreen);
  const setMusicContext = useGameStore((s) => s.setMusicContext);
  const setIsLoading = useGameStore((s) => s.setIsLoading);
  const addNotification = useGameStore((s) => s.addNotification);
  const addDamageNumber = useGameStore((s) => s.addDamageNumber);
  const triggerShake = useGameStore((s) => s.triggerShake);
  const setShowDice = useGameStore((s) => s.setShowDice);
  const setCurrentDiceRoll = useGameStore((s) => s.setCurrentDiceRoll);

  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<'victory' | 'defeat' | null>(null);
  const [rewards, setRewards] = useState<{ gold: number; xp: number; loot: string[] } | null>(null);
  const [showItemSelect, setShowItemSelect] = useState(false);
  const [usableItems, setUsableItems] = useState<string[]>([]);

  if (!player || !enemy) return null;

  const handleAction = async (action: string, item?: string) => {
    setIsLoading(true);
    
    try {
      const result = await combatAction(action, item);
      
      if (result.success) {
        setPlayer(result.player);
        
        // Play sound effects
        if (action === 'attack') {
          audioManager.playSfx('sword_swing');
        }
        
        // Show dice roll
        if (result.player_result?.roll) {
          setCurrentDiceRoll({
            type: 'd20',
            result: parseInt(result.player_result.roll.match(/\d+/)?.[0] || '10'),
            label: result.player_result.roll,
            success: result.player_result.success,
          });
          setShowDice(true);
          await new Promise(resolve => setTimeout(resolve, 2000));
          setShowDice(false);
        }
        
        // Show damage number for player attack
        if (result.player_result?.damage && result.player_result.success) {
          audioManager.playSfx('sword_hit');
          addDamageNumber({
            value: result.player_result.damage,
            x: window.innerWidth / 2,
            y: 200,
            type: result.player_result.critical ? 'critical' : 'damage',
          });
        }
        
        // Update enemy HP
        if (result.enemy) {
          setEnemy(result.enemy);
        }
        
        // Handle outcomes
        if (result.victory) {
          audioManager.playSfx('dice_critical');
          setMusicContext('victory');
          setResultType('victory');
          setRewards(result.rewards || null);
          setShowResult(true);
        } else if (result.defeat) {
          audioManager.playSfx('damage_taken');
          setMusicContext('defeat');
          setResultType('defeat');
          setShowResult(true);
        } else if (result.fled) {
          addNotification({ message: 'You escaped!', type: 'info' });
          exitCombat();
        } else {
          // Enemy turn
          if (result.enemy_result?.damage && result.enemy_result.success) {
            audioManager.playSfx('damage_taken');
            triggerShake('heavy');
            
            // Damage flash effect
            document.body.style.animation = 'damage-flash 0.3s ease';
            setTimeout(() => {
              document.body.style.animation = '';
            }, 300);
            
            addDamageNumber({
              value: result.enemy_result.damage,
              x: window.innerWidth / 2,
              y: window.innerHeight - 200,
              type: 'enemy',
            });
          }
          
          if (result.narration) {
            setCombatNarrative(result.narration);
          }
        }
      }
    } catch (error) {
      addNotification({ message: 'Combat error', type: 'error' });
    }
    
    setIsLoading(false);
  };

  const handleItemAction = async () => {
    try {
      const result = await getInventory();
      const items = result.inventory.filter(item => 
        item.includes('Potion') || item.includes('Scroll')
      );
      setUsableItems(items);
      setShowItemSelect(true);
    } catch (error) {
      console.error('Failed to get inventory');
    }
  };

  const exitCombat = () => {
    setInCombat(false);
    setEnemy(null);
    setMusicContext('exploration');
    setScreen('game');
  };

  return (
    <motion.section
      className="min-h-screen bg-[var(--bg-darkest)] flex flex-col p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DamageNumbers />

      {/* Enemy Section */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        {/* Enemy Image */}
        <motion.div
          className="relative"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {enemy.image_url && (
            <img
              src={enemy.image_url}
              alt={enemy.name}
              className="max-w-[350px] max-h-[350px] rounded-xl shadow-[0_0_60px_rgba(139,58,58,0.3)]"
            />
          )}
          {!enemy.image_url && (
            <div className="w-64 h-64 bg-[var(--bg-medium)] rounded-xl flex items-center justify-center text-8xl">
              👹
            </div>
          )}
        </motion.div>

        {/* Enemy Info */}
        <div className="mt-6 text-center w-full max-w-xs">
          <h2 className="font-display text-2xl text-[var(--text-red)] mb-4 text-shadow-glow">
            {enemy.name}
          </h2>
          <div className="flex items-center gap-4">
            <HealthBar
              current={enemy.hp}
              max={enemy.max_hp}
              variant="enemy"
              showText
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Combat Narrative */}
      <div className="py-6 max-w-xl mx-auto">
        <motion.p
          key={combatNarrative}
          className="text-center text-lg italic text-[var(--text-primary)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {combatNarrative}
        </motion.p>
      </div>

      {/* Player HP */}
      <div className="max-w-md mx-auto w-full mb-6">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm text-[var(--text-secondary)] uppercase tracking-wider">
            Your HP
          </span>
          <HealthBar
            current={player.hp}
            max={player.max_hp}
            showText
            size="lg"
            className="flex-1"
          />
        </div>
      </div>

      {/* Combat Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        <motion.button
          onClick={() => handleAction('attack')}
          className="flex flex-col items-center gap-2 p-6 bg-[var(--bg-medium)] border-2 border-[var(--border-light)] rounded-xl font-display text-sm hover:border-[var(--accent-red-bright)] transition-colors"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-3xl">⚔️</span>
          <span>Attack</span>
        </motion.button>

        <motion.button
          onClick={() => handleAction('ability')}
          disabled={player.ability_uses <= 0}
          className="flex flex-col items-center gap-2 p-6 bg-[var(--bg-medium)] border-2 border-[var(--border-light)] rounded-xl font-display text-sm hover:border-[var(--accent-blue)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-3xl">⚡</span>
          <span>{player.ability_name}</span>
          <span className="text-xs text-[var(--text-muted)]">({player.ability_uses} left)</span>
        </motion.button>

        <motion.button
          onClick={handleItemAction}
          className="flex flex-col items-center gap-2 p-6 bg-[var(--bg-medium)] border-2 border-[var(--border-light)] rounded-xl font-display text-sm hover:border-[var(--accent-green)] transition-colors"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-3xl">🧪</span>
          <span>Item</span>
        </motion.button>

        <motion.button
          onClick={() => handleAction('flee')}
          className="flex flex-col items-center gap-2 p-6 bg-[var(--bg-medium)] border-2 border-[var(--border-light)] rounded-xl font-display text-sm hover:border-[var(--text-gold)] transition-colors"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-3xl">🏃</span>
          <span>Flee</span>
        </motion.button>
      </div>

      {/* Item Selection Modal */}
      <AnimatePresence>
        {showItemSelect && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowItemSelect(false)}
          >
            <motion.div
              className="bg-[var(--bg-dark)] border border-[var(--border-light)] rounded-lg p-6 max-w-sm w-full mx-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl text-[var(--text-gold)] mb-4">Use Item</h3>
              {usableItems.length > 0 ? (
                <div className="space-y-2">
                  {usableItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleAction('item', item);
                        setShowItemSelect(false);
                      }}
                      className="w-full p-3 bg-[var(--bg-medium)] rounded hover:bg-[var(--bg-lighter)] transition-colors text-left"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)]">No usable items</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combat Result Overlay */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="fixed inset-0 bg-[var(--bg-darkest)]/95 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center p-8">
              <motion.h2
                className={`font-display text-5xl mb-8 ${
                  resultType === 'victory' 
                    ? 'text-[var(--text-gold)] text-shadow-glow' 
                    : 'text-[var(--text-red)]'
                }`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                {resultType === 'victory' ? 'Victory!' : 'Defeated...'}
              </motion.h2>

              {rewards && (
                <motion.div
                  className="mb-8 space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {rewards.gold > 0 && (
                    <div className="text-xl text-[var(--text-gold)]">+{rewards.gold} Gold</div>
                  )}
                  {rewards.xp > 0 && (
                    <div className="text-xl text-[var(--text-blue)]">+{rewards.xp} XP</div>
                  )}
                  {rewards.loot?.map((item, i) => (
                    <div key={i} className="text-lg text-[var(--text-secondary)]">Found: {item}</div>
                  ))}
                </motion.div>
              )}

              {resultType === 'defeat' && (
                <motion.p
                  className="text-[var(--text-secondary)] mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Your adventure ends here...
                </motion.p>
              )}

              <motion.button
                onClick={resultType === 'victory' ? exitCombat : () => setScreen('title')}
                className="px-8 py-4 btn-gold-gradient text-[var(--bg-darkest)] font-display uppercase tracking-wider rounded"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {resultType === 'victory' ? 'Continue' : 'Return to Title'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

