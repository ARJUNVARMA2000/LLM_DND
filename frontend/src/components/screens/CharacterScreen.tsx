import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { newGame } from '../../api/client';
import Button from '../ui/Button';

const CLASS_DATA = [
  {
    id: 'fighter' as const,
    name: 'Fighter',
    icon: '⚔️',
    hp: 18,
    stat: 'STR',
    ability: 'Second Wind: Heal in battle',
    description: 'Strong and tough. Masters of martial combat.',
  },
  {
    id: 'rogue' as const,
    name: 'Rogue',
    icon: '🗡️',
    hp: 12,
    stat: 'DEX',
    ability: 'Sneak Attack: +2d6 damage',
    description: 'Quick and deadly. Strike from the shadows.',
  },
  {
    id: 'mage' as const,
    name: 'Mage',
    icon: '🔮',
    hp: 10,
    stat: 'INT',
    ability: 'Fireball: 3d6 fire damage',
    description: 'Master of arcane arts. Devastating spells.',
  },
];

export default function CharacterScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setLocation = useGameStore((s) => s.setLocation);
  const setNarrative = useGameStore((s) => s.setNarrative);
  const setChoices = useGameStore((s) => s.setChoices);
  const setSceneImageUrl = useGameStore((s) => s.setSceneImageUrl);
  const setIsLoading = useGameStore((s) => s.setIsLoading);
  const setMusicContext = useGameStore((s) => s.setMusicContext);
  const addNotification = useGameStore((s) => s.addNotification);
  
  const selectedClass = useGameStore((s) => s.selectedClass);
  const setSelectedClass = useGameStore((s) => s.setSelectedClass);
  const characterName = useGameStore((s) => s.characterName);
  const setCharacterName = useGameStore((s) => s.setCharacterName);

  const canStart = characterName.trim().length > 0 && selectedClass !== null;

  const handleStartAdventure = async () => {
    if (!canStart) return;

    setIsLoading(true);
    try {
      const result = await newGame(characterName.trim(), selectedClass!);
      
      if (result.success) {
        setPlayer(result.player);
        setLocation(result.location);
        setNarrative(result.opening);
        setChoices(result.choices);
        setSceneImageUrl(result.image_url);
        setMusicContext('tavern');
        setScreen('game');
        
        if (result.quest) {
          addNotification({ message: `Quest: ${result.quest}`, type: 'quest' });
        }
      }
    } catch (error) {
      addNotification({ message: 'Failed to start game', type: 'error' });
    }
    setIsLoading(false);
  };

  return (
    <motion.section
      className="min-h-screen flex items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-dark rounded-lg p-8 max-w-2xl w-full"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-3xl text-[var(--text-gold)] text-center mb-8">
          Create Your Hero
        </h2>

        {/* Name Input */}
        <div className="mb-8">
          <label 
            htmlFor="char-name" 
            className="block font-display text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2"
          >
            Your Name
          </label>
          <input
            type="text"
            id="char-name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-light)] rounded text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
          />
        </div>

        {/* Class Selection */}
        <div className="mb-8">
          <h3 className="font-display text-sm text-[var(--text-secondary)] uppercase tracking-wider text-center mb-6">
            Choose Your Path
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CLASS_DATA.map((cls, index) => (
              <motion.button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`
                  p-6 bg-[var(--bg-dark)] border-2 rounded-lg text-center
                  transition-all duration-200 cursor-pointer
                  ${selectedClass === cls.id 
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 shadow-[0_0_20px_var(--shadow-glow)]' 
                    : 'border-[var(--border-dark)] hover:border-[var(--border-light)]'
                  }
                `}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className="text-4xl mb-3">{cls.icon}</div>
                <h4 className="font-display text-lg text-[var(--text-primary)] mb-2">
                  {cls.name}
                </h4>
                <div className="flex justify-center gap-3 mb-3">
                  <span className="text-xs text-[var(--text-gold)] bg-[var(--accent-gold)]/10 px-2 py-1 rounded">
                    HP: {cls.hp}
                  </span>
                  <span className="text-xs text-[var(--text-gold)] bg-[var(--accent-gold)]/10 px-2 py-1 rounded">
                    {cls.stat}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] italic">
                  {cls.ability}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleStartAdventure}
            disabled={!canStart}
            size="lg"
            className="w-full"
          >
            Begin Your Adventure
          </Button>
        </motion.div>

        {/* Back Button */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={() => setScreen('title')}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Back to Title
          </button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

