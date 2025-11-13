# Epistemic Frontend

Modern TypeScript frontend with Vite build system.

## Tech Stack

- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS (via CDN for now)
- **Vanilla TS** - No framework overhead, maximum performance

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Type check
npm run type-check

# Build for production
npm run build
# Outputs to ../static/
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client modules
│   │   ├── auth.ts       # Auth API
│   │   ├── timeline.ts   # Timeline API
│   │   └── concerns.ts   # Concerns API
│   ├── components/       # UI components (future)
│   ├── state/            # State management
│   │   └── auth.ts       # Auth state
│   ├── types/            # TypeScript types
│   │   └── models.ts     # Data models
│   └── main.ts           # App entry point
├── index.html            # HTML entry
├── package.json
├── tsconfig.json         # TS config
└── vite.config.ts        # Vite config
```

## Features

### Current
- ✅ TypeScript with strict mode
- ✅ Vite dev server with HMR
- ✅ Type-safe API layer
- ✅ Reactive auth state
- ✅ Google OAuth integration

### Coming Soon
- [ ] Timeline/Share box components
- [ ] Concern feed components
- [ ] Quest detail views
- [ ] Real-time updates
- [ ] Offline support

## API Integration

The frontend proxies API requests to the FastAPI backend:
- Dev: `http://localhost:8000` (via Vite proxy)
- Prod: Same origin `/epistemic/api`

## Build Output

`npm run build` outputs to `../static/`:
- `static/assets/` - JS/CSS bundles
- `static/index.html` - Entry HTML

FastAPI serves these static files in production.

## Type Safety

All API calls, state, and models are fully typed:

```typescript
import { getAuthStatus } from '@/api/auth';
import type { AuthStatus } from '@/types/models';

const status: AuthStatus = await getAuthStatus();
if (status.authenticated) {
  console.log(status.user.name); // Type-safe!
}
```

## Development Tips

1. **HMR (Hot Module Replacement)**: Changes reflect instantly
2. **Type Checking**: Run `npm run type-check` before committing
3. **Path Aliases**: Use `@/` for `src/` imports
4. **API Proxy**: Dev server proxies `/epistemic/api` to backend

## Deployment

1. Build: `npm run build`
2. Files go to `../static/`
3. FastAPI serves them at `/epistemic/`
4. Docker rebuilds include the built frontend

## Next Steps

1. Set up OAuth credentials (see parent README)
2. Start dev server: `npm run dev`
3. Backend: `docker compose up epistemic`
4. Visit: http://localhost:5173
