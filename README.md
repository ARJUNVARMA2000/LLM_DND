# The Dragon's Shadow

**An LLM-Powered D&D Text Adventure**

A dynamic text-based role-playing game where an AI Dungeon Master creates your adventure in real-time. Every playthrough is unique, with procedurally generated narratives, encounters, and outcomes.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![LLM](https://img.shields.io/badge/AI-OpenRouter-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **Dynamic AI Dungeon Master** - The LLM generates unique stories, locations, and encounters
- **D&D-Style Mechanics** - Authentic dice rolls (d20, d6, d8), stat modifiers, and skill checks
- **Three Playable Classes** - Fighter, Rogue, and Mage with unique abilities
- **Turn-Based Combat** - Strategic battles with attack, ability, item, and flee options
- **Quest System** - Dynamic main and side quests that evolve based on your choices
- **Save/Load** - Full game state persistence
- **Multiple Endings** - Your choices shape the outcome

## Quick Start

### 1. Get an OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/keys)
2. Create a free account
3. Generate an API key

### 2. Set Your API Key

**Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY = "your-api-key-here"
```

**Windows (Command Prompt):**
```cmd
set OPENROUTER_API_KEY=your-api-key-here
```

**Linux/macOS:**
```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

### 3. Run the Game

```bash
python game.py
```

## Gameplay

### Controls

During gameplay, you'll be presented with numbered choices. Type the number and press Enter.

**Commands available at any prompt:**
| Command | Description |
|---------|-------------|
| `inventory` / `i` | View your items |
| `stats` / `s` | View character stats |
| `quests` / `q` | View quest log |
| `save` | Save your game |
| `load` | Load a saved game |
| `help` / `h` | Show help |
| `quit` | Exit (prompts to save) |

### Classes

| Class | HP | Primary Stat | Ability |
|-------|-----|--------------|---------|
| **Fighter** | 18 | STR | Second Wind - Heal 1d10+2 HP (1/rest) |
| **Rogue** | 12 | DEX | Sneak Attack - +2d6 damage (1/combat) |
| **Mage** | 10 | INT | Fireball - 3d6 fire damage (2/day) |

### Dice System

The game uses authentic D&D-style dice:
- **d20** for attack rolls and skill checks
- **d6/d8** for damage
- Modifiers from stats are applied automatically

Example roll output:
```
[Attack] d20: 14 + STR(2) = 16 vs AC 12 - HIT!
[Damage] 1d8: 6 + STR(2) = 8 damage!
```

## Architecture

The game is built with a clean separation of concerns:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    game.py      │────▶│   engine.py     │────▶│   llm_dm.py     │
│  (Game Loop)    │     │  (Mechanics)    │     │  (AI Layer)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                       │                       │
       ▼                       ▼                       ▼
  Player Input           Game State              OpenRouter API
  Display Output         Dice Rolls              Prompt Templates
  Commands               Combat                  Response Parsing
```

### File Structure

```
DND/
├── game.py           # Main entry point and game loop
├── engine.py         # Game mechanics, state, dice, combat
├── llm_dm.py         # OpenRouter integration and prompts
├── README.md         # This file
├── .env.example      # Example environment setup
├── .gitignore        # Git ignore rules
└── saves/            # Save game directory (created on first save)
```

## Extending the Game

### Adding a New Class

In `engine.py`, add to the `CLASSES` dictionary:

```python
CLASSES = {
    # ... existing classes ...
    "paladin": {
        "base_hp": 14,
        "primary_stat": "CHA",
        "starting_gold": 12,
        "starting_items": ["Longsword", "Shield", "Holy Symbol"],
        "ability": {
            "name": "Divine Smite",
            "description": "Add 2d8 radiant damage to an attack",
            "uses": 2,
            "cooldown_type": "rest",
            "effect": "damage_boost"
        }
    }
}
```

Then add handling for the new ability effect in the `use_class_ability()` function.

### Adding New Items

In `engine.py`, add to the `ITEMS` dictionary:

```python
ITEMS = {
    # ... existing items ...
    "Ring of Protection": {
        "type": "armor",
        "ac_bonus": 1,
        "description": "A magical ring that deflects attacks"
    },
    "Greater Health Potion": {
        "type": "consumable",
        "effect": "heal",
        "value": "4d4+4",
        "description": "Restores significant health"
    }
}
```

### Modifying DM Behavior

In `llm_dm.py`, edit `SYSTEM_PROMPT` to change the AI's personality:

```python
SYSTEM_PROMPT = """You are a gritty, dark fantasy Dungeon Master.
Your tone is ominous and foreboding. Danger lurks everywhere.
Combat is brutal and unforgiving..."""
```

### Adding New Models

In `llm_dm.py`, add to `AVAILABLE_MODELS`:

```python
AVAILABLE_MODELS = {
    # ... existing models ...
    "google/gemini-pro": {
        "name": "Gemini Pro",
        "tier": "balanced",
        "description": "Google's capable model"
    }
}
```

## Configuration

### Debug Mode

Enable debug mode to see internal state and rolls:

```python
# In game.py, engine.py, or llm_dm.py
DEBUG = True
```

### Available Models

| Model | Tier | Best For |
|-------|------|----------|
| Llama 3.1 8B | Cheap | Testing, fast iterations |
| Llama 3.1 70B | Balanced | Good quality, reasonable cost |
| Claude 3.5 Haiku | Balanced | Follows formats well |
| GPT-4o Mini | Balanced | Good all-rounder |
| Claude Sonnet 4 | Premium | Excellent narrative quality |
| GPT-4o | Premium | Highest quality |

## Demo Transcript

```
╔═══════════════════════════════════════════════════════════════╗
║  THE DRAGON'S SHADOW - An LLM-Powered D&D Adventure           ║
╚═══════════════════════════════════════════════════════════════╝

> Enter your name: Vex
> Choose class: [1] Fighter [2] Rogue [3] Mage: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  THE RUSTY TANKARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Rain hammers the windows as you nurse your ale. A hooded stranger
  locks eyes with you, then deliberately places a folded note on
  their table before slipping out the back.

───────────────────────────────────────────────────────────────
  HP: 12/12 | Gold: 15 | Rogue | Items: Dagger, Lockpicks
  Quest: None active
───────────────────────────────────────────────────────────────

  What do you do?
    [1] Grab the note and read it
    [2] Follow the stranger into the alley
    [3] Ask the bartender about the stranger
    [4] Ignore it and finish your drink

> 2

  [DEX Check] d20: 17 + DEX(3) = 20 vs DC 14 - SUCCESS!

  You slip through the crowd unnoticed and follow the figure into
  the rain-slicked alley. They turn, lowering their hood to reveal
  an elven woman with worry in her eyes.

  [Quest Started: The Missing Villagers]

> Press Enter to continue...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚔️  DESPERATE BANDIT ATTACKS!  ⚔️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  A ragged figure leaps from the shadows, blade glinting!

═══════════════════════════════════════════════════════════════
  ⚔️  COMBAT  ⚔️
───────────────────────────────────────────────────────────────
  YOU: [████████████████████] 12/12 HP
  DESPERATE BANDIT: [████████████████████] 8/8 HP
═══════════════════════════════════════════════════════════════

  YOUR TURN:
    [1] Attack with Dagger
    [2] Use Sneak Attack (1 left)
    [3] Use Item (1 available)
    [4] Attempt to Flee

> 1

  [Attack] d20: 18 + DEX(3) = 21 vs AC 12 - HIT!
  [Damage] 1d4: 3 + DEX(3) + Sneak(7) = 13 damage!

  [✓] Hit! Dealt 13 damage!

  ⚔️  VICTORY!  ⚔️
  
  You have defeated the Desperate Bandit!
  +3 gold
  Found: Rusty Key
```

## Technical Details

### Requirements

- Python 3.11+
- No external dependencies (uses only standard library)
- OpenRouter API key

### API Usage

The game uses OpenRouter's API for LLM access. Typical session uses:
- ~50-100 API calls for a 30-minute session
- ~100K-200K tokens total
- Cost varies by model (Llama 3.1 70B ≈ $0.05-0.10 per session)

### Save Format

Saves are stored as JSON in the `saves/` directory:

```json
{
    "version": "1.0",
    "timestamp": "2025-12-28T10:30:00",
    "game_state": { ... },
    "rng_seed": 12345
}
```

## Contributing

Contributions welcome! Some ideas:

- [ ] Additional classes (Ranger, Cleric, etc.)
- [ ] Multiplayer support
- [ ] Voice narration integration
- [ ] Map visualization
- [ ] Combat log export
- [ ] Achievement system

## License

MIT License - feel free to use, modify, and distribute.

## Credits

- Built with Python and OpenRouter
- Inspired by classic D&D adventures and text games
- AI-powered by various LLMs via OpenRouter

---

*Roll for initiative. Your adventure awaits.*

