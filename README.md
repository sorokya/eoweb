# EOWeb Client

Web-based Endless Online client built with TypeScript.

## Requirements

- Node.js
- Original EO game files for graphics extraction
- Extracted EO maps and graphics (required for client to function)

## Quick Start

1. **Clone and install**:
   ```bash
   git clone https://github.com/sorokya/eoweb.git
   cd eoweb
   npm install
   ```

2. **Extract game graphics** (Required):
   - First, clone [extract-egf-images](https://github.com/sorokya/extract-egf-images) in a separate folder and follow its README
   - Then create the directories in your eoweb project:
   ```bash
   mkdir public/gfx
   mkdir public/maps
   ```
   - Place extracted images from the tool into `public/gfx/`
   - Place `.emf` map files in `public/maps/`

3. **Run**:
   ```bash
   npm run dev
   ```

## Structure

- `src/handlers/` - Network packet handlers
- `src/ui/` - User interface components  
- `src/utils/` - Coordinate conversion & utilities
- `src/main.ts` - Entry point
- `src/map.ts` - Map rendering
- `src/character.ts` - Character management

## Note

Graphics and map files are required but gitignored. Extract them yourself using the EGF tool before running.