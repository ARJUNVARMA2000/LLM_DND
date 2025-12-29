# Dragon's Shadow - React Frontend

Modern React frontend for The Dragon's Shadow D&D adventure game.

## Features

- **3D Dice Rolling** - Physics-based dice with React Three Fiber
- **Immersive Audio** - Background music and sound effects with Howler.js
- **Smooth Animations** - Framer Motion for all transitions
- **Dark Fantasy Theme** - Custom Tailwind CSS styling
- **Atmospheric Effects** - Particles, fog, and dynamic lighting

## Development

```bash
# Install dependencies
npm install

# Start development server (with API proxy to Flask)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

- **React 18** with TypeScript
- **Vite** for fast builds
- **Zustand** for state management
- **Framer Motion** for animations
- **React Three Fiber** for 3D dice
- **Howler.js** for audio
- **Tailwind CSS** for styling

## Project Structure

```
src/
├── api/           # API client for Flask backend
├── components/
│   ├── screens/   # Main screen components
│   ├── ui/        # Reusable UI components
│   ├── combat/    # Combat-specific components
│   ├── dice/      # 3D dice system
│   └── effects/   # Visual effects (particles, shake, etc.)
├── hooks/         # Custom React hooks
├── stores/        # Zustand state stores
├── systems/       # Audio and particle systems
└── types.ts       # TypeScript type definitions
```

## Audio

Music and sound effects are sourced from:
- Pixabay (royalty-free)
- Freesound (CC0)

Volume controls are available in the bottom-right corner.
