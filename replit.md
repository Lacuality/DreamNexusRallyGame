# Dream Nexus Rally

## Overview

Dream Nexus Rally is a lightweight, arcade-style browser-based rally racing game featuring Pixel the Bunny racing through stylized Colombian mountain roads. Built with React Three Fiber for 3D rendering, the game targets 60 FPS performance on typical laptops with graceful degradation for lower-end devices. The game features an endless runner format with procedurally generated tracks, progressive difficulty scaling, and mobile-friendly touch controls.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18 with TypeScript running in a Vite development environment. The application uses a component-based architecture with clear separation between game logic, UI, and 3D rendering.

**3D Rendering Engine**: React Three Fiber (@react-three/fiber) wraps Three.js for declarative 3D scene management. Additional utilities from @react-three/drei provide camera controls, texture loading, and keyboard input handling. Post-processing effects are available via @react-three/postprocessing.

**State Management**: Zustand with the subscribeWithSelector middleware manages global application state. Three separate stores handle distinct concerns:
- `useRally`: Game phase transitions (menu, playing, paused, gameover), scoring, distance tracking
- `useMobileControls`: Touch input state for mobile gameplay
- `useAudio`: Sound effects and background music control

**Styling**: Tailwind CSS provides utility-first styling with a custom configuration supporting dark mode and design tokens. The design system uses CSS custom properties for theming (navy #0E1B24, cyan #24A0CE, warm #FDC6B5). Radix UI primitives provide accessible, unstyled component foundations for dialogs, buttons, and other UI elements.

**Game Loop Architecture**: The game uses React Three Fiber's `useFrame` hook to implement a frame-based game loop. Physics calculations, collision detection, and procedural generation happen each frame within the Car and Obstacles components. Camera follows the car with spring-smoothed interpolation.

**Procedural Generation**: The Road component generates terrain geometry using sine wave functions for curves and elevation changes. Obstacles spawn dynamically based on player distance with density increasing over time. Track generation ensures no self-intersections and maintains playable curve angles.

**Input Handling**: Desktop uses keyboard controls via @react-three/drei's KeyboardControls. Mobile devices render on-screen touch buttons that mirror keyboard input through the useMobileControls store. Both input methods feed into the same Car component logic.

**Performance Strategy**: The game uses instanced rendering where possible, fog to limit draw distance, and simplified geometry for distant objects. Asset files (GLTF models, textures, audio) are lazy-loaded. The Canvas component from React Three Fiber manages WebGL context and rendering optimization.

### Backend Architecture

**Server Framework**: Express.js serves both API endpoints and static files. The development server integrates Vite middleware for hot module replacement.

**Data Layer**: Currently implements an in-memory storage pattern (MemStorage class) that provides a simple CRUD interface for user data. The storage interface is designed for easy migration to a persistent database solution.

**Session Management**: Uses connect-pg-simple for session storage, configured to work with PostgreSQL when available.

**Build Process**: 
- Client: Vite bundles the React application with code splitting and tree shaking
- Server: esbuild compiles TypeScript server code to ESM format
- Production deployment serves pre-built static files from dist/public

**Route Structure**: All application routes are prefixed with `/api`. The server delegates all other requests to the Vite dev server (development) or serves static files (production).

### External Dependencies

**Database**: Configured for PostgreSQL via Neon serverless driver (@neondatabase/serverless). Drizzle ORM provides type-safe schema definitions and migrations. The drizzle.config.ts expects a DATABASE_URL environment variable and outputs migrations to ./migrations directory with schema defined in ./shared/schema.ts.

**Audio Assets**: HTML5 Audio API handles sound playback. The AudioManager class expects audio files at:
- /sounds/background.mp3 (looping background music)
- /sounds/hit.mp3 (collision sound effect)

**3D Assets**: The game references but does not include:
- /dream-nexus-logo.png (title screen branding)
- /textures/asphalt.png (road surface texture, repeating)
- Character sprite/model for Pixel the Bunny
- Car mesh (low-poly .glb or sprite)
- GLSL shader support via vite-plugin-glsl

**Fonts**: Inter font family loaded via @fontsource/inter package, applied globally through Tailwind configuration.

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal for enhanced error reporting
- TanStack Query for data fetching (though currently underutilized)
- Drizzle Kit for database schema management

**High Score Persistence**: Uses browser localStorage for client-side high score tracking (key-based storage via getLocalStorage/setLocalStorage utilities).