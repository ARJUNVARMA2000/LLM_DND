# The Dragon's Shadow

**An LLM-Powered D&D Text Adventure with AI-Generated Visuals**

A dynamic browser-based role-playing game where an AI Dungeon Master creates your adventure in real-time. Every playthrough is unique, featuring procedurally generated narratives, AI-generated scene images, and authentic D&D mechanics.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![LLM](https://img.shields.io/badge/AI-OpenRouter-purple.svg)
![Deploy](https://img.shields.io/badge/Deploy-Railway-orange.svg)

## Features

- **AI Dungeon Master** - Dynamic story generation via OpenRouter LLMs
- **AI-Generated Visuals** - Unique scene and enemy images via Pollinations.ai (FREE!)
- **Dark Fantasy Aesthetic** - Atmospheric UI with fog effects, animations, and moody lighting
- **D&D Mechanics** - Authentic dice rolls (d20, d6, d8), stat modifiers, and skill checks
- **Three Playable Classes** - Fighter, Rogue, and Mage with unique abilities
- **Turn-Based Combat** - Strategic battles with attack, ability, item, and flee options
- **Quest System** - Dynamic quests that evolve based on your choices
- **Save/Load** - Full game state persistence
- **Easy Deployment** - One-click deploy to Railway

## Screenshots

*Dark fantasy tavern scene with atmospheric fog and moody lighting*

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dragons-shadow.git
   cd dragons-shadow
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set your OpenRouter API key**
   ```bash
   # Windows PowerShell
   $env:OPENROUTER_API_KEY = "sk-or-v1-your-key-here"
   
   # Linux/Mac
   export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
   ```
   
   Get a free key at [OpenRouter](https://openrouter.ai/keys)

4. **Run the game**
   ```bash
   python app.py
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

### Deploy to Railway

1. Push your code to GitHub

2. Go to [Railway](https://railway.app) and create a new project

3. Connect your GitHub repository

4. Add environment variable:
   - `OPENROUTER_API_KEY` = your OpenRouter API key

5. Deploy! Railway will automatically detect the Procfile

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   HTML/CSS  │  │  game.js    │  │   AI-Generated Images   │  │
│  │  Dark Theme │  │  Game Logic │  │   (Pollinations.ai)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Flask Server (app.py)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Routes     │  │  Session    │  │   Game State            │  │
│  │  /api/*     │  │  Management │  │   Management            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  engine.py  │  │  llm_dm.py  │  │ image_gen.py│
     │  Game Logic │  │  OpenRouter │  │ Pollinations│
     │  Dice/Combat│  │  LLM Calls  │  │ AI Images   │
     └─────────────┘  └─────────────┘  └─────────────┘
```

## File Structure

```
DND/
├── app.py              # Flask server & API routes
├── engine.py           # Game mechanics, dice, combat, state
├── llm_dm.py           # OpenRouter LLM integration
├── image_gen.py        # Pollinations.ai image generation
├── requirements.txt    # Python dependencies
├── Procfile            # Deployment command
├── railway.json        # Railway configuration
├── templates/
│   └── index.html      # Main game page
├── static/
│   ├── css/
│   │   └── style.css   # Dark fantasy theme
│   └── js/
│       └── game.js     # Frontend game logic
├── saves/              # Save game directory
└── README.md           # This file
```

## Gameplay

### Classes

| Class | HP | Primary Stat | Ability |
|-------|-----|--------------|---------|
| **Fighter** | 18 | STR | Second Wind - Heal 1d10+2 HP (1/rest) |
| **Rogue** | 12 | DEX | Sneak Attack - +2d6 damage (1/combat) |
| **Mage** | 10 | INT | Fireball - 3d6 fire damage (2/day) |

### Controls

**Keyboard Shortcuts:**
- `1-9` - Select choices
- `I` - Open inventory
- `Escape` - Close modals

**Combat Shortcuts:**
- `A` - Attack
- `S` - Use Ability
- `D` - Use Item
- `F` - Flee

### Dice System

The game uses authentic D&D-style dice:
- **d20** for attack rolls and skill checks
- **d6/d8** for damage

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `FLASK_SECRET_KEY` | No | Session encryption key (auto-generated if not set) |
| `PORT` | No | Server port (default: 5000) |
| `FLASK_DEBUG` | No | Enable debug mode (default: false) |

### Available LLM Models

| Model | Tier | Best For |
|-------|------|----------|
| Llama 3.1 8B | Cheap | Testing, fast iterations |
| Llama 3.1 70B | Balanced | Good quality, reasonable cost (default) |
| Claude 3.5 Haiku | Balanced | Follows formats well |
| GPT-4o Mini | Balanced | Good all-rounder |
| Claude Sonnet 4 | Premium | Excellent narrative quality |
| GPT-4o | Premium | Highest quality |

## Extending the Game

### Adding a New Class

In `engine.py`, add to the `CLASSES` dictionary:

```python
CLASSES = {
    "paladin": {
        "base_hp": 14,
        "primary_stat": "CHA",
        "starting_gold": 12,
        "starting_items": ["Longsword", "Shield", "Holy Symbol"],
        "ability": {
            "name": "Divine Smite",
            "description": "Add 2d8 radiant damage",
            "uses": 2,
            "cooldown_type": "rest",
            "effect": "damage_boost"
        }
    }
}
```

### Modifying the DM's Personality

In `llm_dm.py`, edit `SYSTEM_PROMPT`:

```python
SYSTEM_PROMPT = """You are a gritty, dark fantasy Dungeon Master.
Your world is dangerous and unforgiving. Combat is brutal.
NPCs have hidden agendas..."""
```

### Customizing the Visual Style

Edit `static/css/style.css` to change colors, fonts, and effects:

```css
:root {
    --accent-gold: #c9a227;  /* Change accent color */
    --bg-darkest: #0a0a0c;   /* Change background */
}
```

## API Costs

- **OpenRouter (LLM)**: Pay-per-token, varies by model
  - Llama 3.1 70B: ~$0.01-0.02 per session
  - GPT-4o: ~$0.10-0.20 per session
- **Pollinations.ai (Images)**: FREE! No API key needed

## Tech Stack

- **Backend**: Python 3.11+, Flask 3.0
- **Frontend**: Vanilla JavaScript, CSS3
- **LLM**: OpenRouter API (multi-model support)
- **Images**: Pollinations.ai (free AI image generation)
- **Deployment**: Railway, Gunicorn

## Contributing

Contributions welcome! Ideas:

- [ ] Multiplayer support
- [ ] Voice narration (TTS integration)
- [ ] Map visualization
- [ ] Additional classes
- [ ] Mobile optimization
- [ ] Sound effects

## License

MIT License - feel free to use, modify, and distribute.

## Credits

- AI narrative powered by OpenRouter
- AI images powered by Pollinations.ai
- Inspired by classic D&D adventures

---

*Roll for initiative. Your adventure awaits.* 🐉
