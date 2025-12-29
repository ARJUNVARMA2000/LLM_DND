import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { makeChoice, saveGame, getInventory, getStats } from '../../api/client';
import HealthBar from '../ui/HealthBar';
import TypeWriter from '../effects/TypeWriter';
import type { Choice, Player } from '../../types';

export default function GameScreen() {
  const player = useGameStore((s) => s.player);
  const currentLocation = useGameStore((s) => s.currentLocation);
  const currentChoices = useGameStore((s) => s.currentChoices);
  const currentNarrative = useGameStore((s) => s.currentNarrative);
  const sceneImageUrl = useGameStore((s) => s.sceneImageUrl);
  
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setLocation = useGameStore((s) => s.setLocation);
  const setNarrative = useGameStore((s) => s.setNarrative);
  const setChoices = useGameStore((s) => s.setChoices);
  const setSceneImageUrl = useGameStore((s) => s.setSceneImageUrl);
  const setScreen = useGameStore((s) => s.setScreen);
  const setEnemy = useGameStore((s) => s.setEnemy);
  const setCombatNarrative = useGameStore((s) => s.setCombatNarrative);
  const setInCombat = useGameStore((s) => s.setInCombat);
  const setMusicContext = useGameStore((s) => s.setMusicContext);
  const setIsLoading = useGameStore((s) => s.setIsLoading);
  const addNotification = useGameStore((s) => s.addNotification);
  const setShowDice = useGameStore((s) => s.setShowDice);
  const setCurrentDiceRoll = useGameStore((s) => s.setCurrentDiceRoll);

  const [showInventory, setShowInventory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [inventory, setInventory] = useState<string[]>([]);
  const [inventoryGold, setInventoryGold] = useState(0);
  const [statsData, setStatsData] = useState<Player | null>(null);
  const [narrativeComplete, setNarrativeComplete] = useState(false);

  if (!player) return null;

  const handleChoice = async (choice: Choice) => {
    setIsLoading(true);
    setNarrativeComplete(false);
    
    try {
      const result = await makeChoice(choice);
      
      if (result.success) {
        setPlayer(result.player);
        
        // Handle skill check display
        if (result.skill_check) {
          const isSuccess = result.skill_check.includes('SUCCESS');
          setCurrentDiceRoll({
            type: 'd20',
            result: parseInt(result.skill_check.match(/\d+/)?.[0] || '10'),
            label: result.skill_check,
            success: isSuccess,
          });
          setShowDice(true);
          await new Promise(resolve => setTimeout(resolve, 2500));
          setShowDice(false);
        }
        
        // Show notifications
        if (result.items_found?.length) {
          result.items_found.forEach(item => {
            addNotification({ message: `Found: ${item}`, type: 'item' });
          });
        }
        
        if (result.gold_found && result.gold_found > 0) {
          addNotification({ message: `+${result.gold_found} gold`, type: 'gold' });
        }
        
        if (result.quest_update) {
          const status = result.quest_update.status === 'started' ? 'Quest Started' :
                        result.quest_update.status === 'completed' ? 'Quest Completed' : 'Quest Updated';
          addNotification({ message: `${status}: ${result.quest_update.name}`, type: 'quest' });
        }
        
        // Handle combat
        if (result.combat && result.enemy) {
          addNotification({ message: `${result.enemy.name} attacks!`, type: 'combat' });
          
          setTimeout(() => {
            setEnemy(result.enemy!);
            setCombatNarrative(result.narration);
            setInCombat(true);
            setMusicContext('combat');
            setScreen('combat');
          }, 1500);
        } else if (result.rest) {
          setNarrative(result.narration);
          addNotification({ message: 'You rest and recover', type: 'info' });
        } else {
          setNarrative(result.narration);
          if (result.location) setLocation(result.location);
          if (result.image_url) setSceneImageUrl(result.image_url);
          if (result.choices) setChoices(result.choices);
        }
      }
    } catch (error) {
      addNotification({ message: 'Something went wrong...', type: 'error' });
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    try {
      const result = await saveGame();
      if (result.success) {
        addNotification({ message: 'Game saved!', type: 'info' });
      }
    } catch (error) {
      addNotification({ message: 'Failed to save', type: 'error' });
    }
  };

  const handleShowInventory = async () => {
    try {
      const result = await getInventory();
      setInventory(result.inventory);
      setInventoryGold(result.gold);
      setShowInventory(true);
    } catch (error) {
      console.error('Failed to load inventory');
    }
  };

  const handleShowStats = async () => {
    try {
      const result = await getStats();
      setStatsData(result);
      setShowStats(true);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const getClassIcon = () => {
    switch (player.class) {
      case 'fighter': return '⚔️';
      case 'rogue': return '🗡️';
      case 'mage': return '🔮';
      default: return '⚔️';
    }
  };

  return (
    <motion.section
      className="min-h-screen relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Scene Background */}
      <div className="fixed inset-0 z-0">
        {sceneImageUrl && (
          <motion.img
            src={sceneImageUrl}
            alt="Scene"
            className="w-full h-full object-cover opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-darkest)]/30 via-[var(--bg-darkest)]/50 to-[var(--bg-darkest)]/95" />
      </div>

      {/* Location Header */}
      <div className="fixed top-0 left-0 right-0 p-6 bg-gradient-to-b from-[var(--bg-darkest)]/90 to-transparent z-10">
        <h2 className="font-display text-2xl text-[var(--text-gold)] tracking-wider">
          {currentLocation}
        </h2>
      </div>

      {/* Quest Tracker */}
      {player.quest && (
        <div className="fixed top-20 right-6 glass-dark rounded-lg px-4 py-2 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span>📜</span>
            <span className="font-display text-[var(--text-gold)]">{player.quest}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-1 min-h-screen flex flex-col justify-end px-6 pb-32 pt-24">
        {/* Narrative */}
        <div className="max-w-3xl mx-auto mb-8">
          <TypeWriter
            text={currentNarrative}
            speed={25}
            onComplete={() => setNarrativeComplete(true)}
            className="text-lg leading-relaxed text-[var(--text-primary)]"
          />
        </div>

        {/* Choices */}
        <AnimatePresence>
          {narrativeComplete && currentChoices.length > 0 && (
            <motion.div
              className="max-w-3xl mx-auto w-full flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {currentChoices.map((choice, index) => (
                <motion.button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  className="glass-dark rounded-lg px-6 py-4 text-left flex items-center gap-4 hover:border-[var(--accent-gold)] transition-all group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ x: 8 }}
                >
                  <span className="font-display text-[var(--text-gold)] w-8 h-8 flex items-center justify-center bg-[var(--accent-gold)]/10 rounded">
                    {index + 1}
                  </span>
                  <span className="text-lg">{choice.text}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player HUD */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg-darkest)] via-[var(--bg-darkest)]/95 to-transparent p-6 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          {/* Portrait */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--bg-medium)] border-2 border-[var(--accent-gold)] rounded-lg flex items-center justify-center text-2xl">
              {getClassIcon()}
            </div>
            <div>
              <div className="font-display text-[var(--text-primary)]">{player.name}</div>
              <div className="text-sm text-[var(--text-gold)] uppercase tracking-wider">
                {player.class}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 max-w-xs">
            <HealthBar current={player.hp} max={player.max_hp} label="HP" />
            <div className="flex gap-6 mt-2">
              <div className="flex items-center gap-2 font-display">
                <span>💰</span>
                <span>{player.gold}</span>
              </div>
              <div className="flex items-center gap-2 font-display">
                <span>⚡</span>
                <span>{player.ability_uses}/{player.ability_max}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleShowInventory}
              className="w-12 h-12 bg-[var(--bg-medium)] border border-[var(--border-light)] rounded-lg flex items-center justify-center text-xl hover:border-[var(--accent-gold)] transition-colors"
              title="Inventory"
            >
              🎒
            </button>
            <button
              onClick={handleShowStats}
              className="w-12 h-12 bg-[var(--bg-medium)] border border-[var(--border-light)] rounded-lg flex items-center justify-center text-xl hover:border-[var(--accent-gold)] transition-colors"
              title="Stats"
            >
              📊
            </button>
            <button
              onClick={handleSave}
              className="w-12 h-12 bg-[var(--bg-medium)] border border-[var(--border-light)] rounded-lg flex items-center justify-center text-xl hover:border-[var(--accent-gold)] transition-colors"
              title="Save"
            >
              💾
            </button>
            <button
              onClick={() => setScreen('title')}
              className="w-12 h-12 bg-[var(--bg-medium)] border border-[var(--border-light)] rounded-lg flex items-center justify-center text-xl hover:border-[var(--accent-gold)] transition-colors"
              title="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Modal */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInventory(false)}
          >
            <motion.div
              className="bg-[var(--bg-dark)] border border-[var(--border-light)] rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-[var(--border-dark)]">
                <h2 className="font-display text-xl text-[var(--text-gold)]">Inventory</h2>
                <button onClick={() => setShowInventory(false)} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 font-display text-lg text-[var(--text-gold)] mb-4">
                  💰 {inventoryGold} Gold
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {inventory.map((item, i) => (
                    <div key={i} className="bg-[var(--bg-medium)] border border-[var(--border-dark)] rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">📦</div>
                      <div className="text-sm">{item}</div>
                    </div>
                  ))}
                </div>
                {inventory.length === 0 && (
                  <p className="text-center text-[var(--text-muted)]">Empty</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStats && statsData && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStats(false)}
          >
            <motion.div
              className="bg-[var(--bg-dark)] border border-[var(--border-light)] rounded-lg max-w-md w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-[var(--border-dark)]">
                <h2 className="font-display text-xl text-[var(--text-gold)]">Character Stats</h2>
                <button onClick={() => setShowStats(false)} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between py-2 border-b border-[var(--border-dark)]">
                  <span className="font-display text-[var(--text-secondary)]">Name</span>
                  <span className="font-display text-[var(--text-gold)]">{statsData.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-dark)]">
                  <span className="font-display text-[var(--text-secondary)]">Class</span>
                  <span className="font-display text-[var(--text-gold)]">{statsData.class}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-dark)]">
                  <span className="font-display text-[var(--text-secondary)]">HP</span>
                  <span className="font-display text-[var(--text-gold)]">{statsData.hp}/{statsData.max_hp}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-dark)]">
                  <span className="font-display text-[var(--text-secondary)]">AC</span>
                  <span className="font-display text-[var(--text-gold)]">{statsData.ac}</span>
                </div>
                {Object.entries(statsData.stats).map(([stat, data]) => (
                  <div key={stat} className="flex justify-between py-2 border-b border-[var(--border-dark)]">
                    <span className="font-display text-[var(--text-secondary)]">{stat}</span>
                    <span className="font-display text-[var(--text-gold)]">
                      {data.score} ({data.modifier >= 0 ? '+' : ''}{data.modifier})
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

