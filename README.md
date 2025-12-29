# 🐉 The Dragon's Shadow

**An AI-Powered Dungeons & Dragons Text Adventure Game**

Play D&D solo with an AI Dungeon Master! Every adventure is unique - the AI creates the story, generates images, and runs authentic D&D game mechanics.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![LLM](https://img.shields.io/badge/AI-OpenRouter-purple.svg)

---

## 🎮 What is This?

This is a **browser-based D&D game** where:
- 🤖 An **AI Dungeon Master** tells your story
- 🎨 **AI generates unique images** for every scene
- 🎲 **Real D&D dice rolls** (d20, d6, d8) determine your fate
- ⚔️ **Turn-based combat** with attacks, abilities, and items
- 💾 **Save and load** your adventure anytime

**No D&D experience required!** The game handles all the rules for you.

---

## 🚀 How to Run the Game

### Step 1: Get the Code

```bash
git clone https://github.com/ARJUNVARMA2000/LLM_DND.git
cd LLM_DND
```

### Step 2: Install Python Packages

Make sure you have **Python 3.11+** installed, then run:

```bash
pip install -r requirements.txt
```

### Step 3: Get a Free API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/keys)
2. Create a free account
3. Generate an API key (looks like `sk-or-v1-...`)

### Step 4: Set Your API Key

**On Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY = "sk-or-v1-your-key-here"
```

**On Mac/Linux:**
```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

### Step 5: Start the Game!

```bash
python app.py
```

### Step 6: Play!

Open your web browser and go to: **http://localhost:5000**

---

## 🧙 Choose Your Class

| Class | Health | Special Ability |
|-------|--------|-----------------|
| ⚔️ **Fighter** | 18 HP | **Second Wind** - Heal yourself mid-combat |
| 🗡️ **Rogue** | 12 HP | **Sneak Attack** - Deal massive bonus damage |
| 🔮 **Mage** | 10 HP | **Fireball** - Blast enemies with fire magic |

---

## 🎮 Controls

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-9` | Select dialogue options |
| `I` | Open inventory |
| `Escape` | Close menus |

### In Combat

| Key | Action |
|-----|--------|
| `A` | Attack |
| `S` | Use Special Ability |
| `D` | Use Item |
| `F` | Try to Flee |

---

## 📁 Project Files Explained

```
LLM_DND/
├── app.py              # 🖥️  Web server - handles browser requests
├── engine.py           # ⚙️  Game rules - dice, combat, inventory
├── game.py             # 🎮  Game logic - story flow, choices
├── llm_dm.py           # 🤖  AI brain - talks to the AI model
├── image_gen.py        # 🎨  Image creator - generates scene art
├── requirements.txt    # 📦  List of Python packages needed
├── Procfile            # 🚀  Instructions for cloud deployment
├── railway.json        # ☁️  Railway.app settings
├── templates/
│   └── index.html      # 🌐  The game's web page
├── static/
│   ├── css/
│   │   └── style.css   # 🎨  Visual styling (dark fantasy theme)
│   └── js/
│       └── game.js     # 🎮  Browser game logic
└── saves/              # 💾  Your saved games go here
```

---

## 🏗️ How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    YOUR BROWSER                          │
│   You see: Story text, images, choices, dice rolls      │
└──────────────────────────────────────────────────────────┘
                            ↓ clicks & choices
┌──────────────────────────────────────────────────────────┐
│                   FLASK WEB SERVER                       │
│   app.py receives your choices and sends back updates   │
└──────────────────────────────────────────────────────────┘
          ↓                    ↓                    ↓
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ engine.py│         │ llm_dm.py│         │image_gen │
   │ Dice &   │         │ AI Story │         │ AI Art   │
   │ Combat   │         │ Writing  │         │ Creation │
   └──────────┘         └──────────┘         └──────────┘
                              ↓                    ↓
                        OpenRouter            Pollinations
                        (AI Text)             (AI Images)
                         [PAID]                 [FREE!]
```

---

## ☁️ Deploy Online (Railway)

Want to put your game on the internet? It's easy!

1. **Push code to GitHub** (see commands below)
2. Go to [Railway.app](https://railway.app)
3. Click **"New Project"** → **"Deploy from GitHub"**
4. Select this repository
5. Add your `OPENROUTER_API_KEY` in Railway's Variables tab
6. Done! Railway gives you a public URL

---

## 💰 Cost Breakdown

| Service | Cost | What It Does |
|---------|------|--------------|
| **Pollinations.ai** | **FREE** | Generates all the images |
| **OpenRouter** | ~$0.01-0.02/session | Powers the AI storytelling |

The AI text generation costs about **1-2 cents per game session** using the default model.

---

## ⚙️ Settings You Can Change

### Environment Variables

| Variable | Required? | What It Does |
|----------|-----------|--------------|
| `OPENROUTER_API_KEY` | ✅ Yes | Your AI API key |
| `PORT` | ❌ No | Server port (default: 5000) |
| `FLASK_DEBUG` | ❌ No | Enable debug mode |

### AI Models Available

Edit `llm_dm.py` to change the AI model:

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| Llama 3.1 8B | ⚡ Fast | Good | Cheapest |
| Llama 3.1 70B | Medium | Great | Low |
| GPT-4o Mini | Medium | Great | Low |
| Claude 3.5 Haiku | Medium | Excellent | Medium |
| GPT-4o | Slower | Best | Higher |

---

## 🛠️ Want to Modify the Game?

### Change the AI's Personality

Edit the `SYSTEM_PROMPT` in `llm_dm.py`:

```python
SYSTEM_PROMPT = """You are a gritty, dark fantasy Dungeon Master.
Your world is dangerous. NPCs have secrets..."""
```

### Add a New Character Class

Add to the `CLASSES` dictionary in `engine.py`:

```python
"paladin": {
    "base_hp": 14,
    "primary_stat": "CHA",
    "ability": {
        "name": "Divine Smite",
        "description": "Holy damage bonus"
    }
}
```

### Change the Colors

Edit `static/css/style.css`:

```css
:root {
    --accent-gold: #c9a227;  /* Gold highlights */
    --bg-darkest: #0a0a0c;   /* Background color */
}
```

---

## 🤝 Contributing

Ideas for improvements:
- [ ] Multiplayer support
- [ ] Voice narration
- [ ] More character classes
- [ ] Mobile-friendly design
- [ ] Sound effects

Pull requests welcome!

---

## 📜 License

MIT License - free to use, modify, and share.

---

## 🙏 Credits

- **AI Storytelling**: [OpenRouter](https://openrouter.ai)
- **AI Images**: [Pollinations.ai](https://pollinations.ai) (free!)
- **Inspired by**: Classic Dungeons & Dragons

---

*Roll for initiative. Your adventure awaits.* 🎲
