# Epistemic Frontend Architecture

## Current State
- Single monolithic `mockup.html` file (~700 lines)
- Inline JavaScript in `<script>` tag
- Mixed concerns: auth, timeline, feed, UI state

## Proposed Modular Structure

```
epistemic/
├── static/
│   ├── index.html              # Main entry point (minimal)
│   ├── css/
│   │   └── main.css           # Tailwind or custom styles
│   └── js/
│       ├── main.js            # App initialization
│       ├── api/               # API service layer
│       │   ├── auth.js        # Auth API calls
│       │   ├── timeline.js    # Timeline API calls
│       │   └── concerns.js    # Concerns API calls
│       ├── components/        # UI components
│       │   ├── auth/
│       │   │   ├── LoginButton.js
│       │   │   ├── UserMenu.js
│       │   │   └── AuthStatus.js
│       │   ├── timeline/
│       │   │   ├── ShareBox.js
│       │   │   ├── TimelineEntry.js
│       │   │   └── ActivityFeed.js
│       │   ├── concerns/
│       │   │   ├── ConcernCard.js
│       │   │   ├── ConcernDetail.js
│       │   │   └── ConcernFeed.js
│       │   └── common/
│       │       ├── Header.js
│       │       ├── Modal.js
│       │       └── Toast.js
│       ├── state/             # State management
│       │   ├── store.js       # Global state
│       │   └── auth.js        # Auth state
│       └── utils/             # Utilities
│           ├── dom.js         # DOM helpers
│           └── format.js      # Formatting helpers
```

## Implementation Approach

### Phase 1: Extract to Vanilla JS Modules
- Use ES6 modules (`type="module"`)
- No build step required initially
- Keep it simple and fast

### Phase 2: Add State Management
- Simple reactive state system
- Or use Alpine.js for minimal overhead

### Phase 3: Consider Framework (Optional)
- If complexity grows, consider:
  - Preact (3kb, React-like)
  - Alpine.js (15kb, HTML-first)
  - Vue 3 (lightweight, progressive)

## Module Responsibilities

### API Layer (`api/*.js`)
- Handle all HTTP requests
- Manage authentication tokens
- Error handling
- Request/response transformation

Example:
```javascript
// api/auth.js
export async function login() {
  window.location.href = '/api/auth/login';
}

export async function logout() {
  await fetch('/api/auth/logout');
  window.location.reload();
}

export async function getCurrentUser() {
  const response = await fetch('/api/auth/me');
  if (!response.ok) return null;
  return response.json();
}

export async function getAuthStatus() {
  const response = await fetch('/api/auth/status');
  return response.json();
}
```

### Components (`components/*.js`)
- Self-contained UI elements
- Render methods
- Event handlers
- Lifecycle methods (if needed)

Example:
```javascript
// components/auth/LoginButton.js
export class LoginButton {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <button id="loginBtn" class="btn-primary">
        Sign in with Google
      </button>
    `;
    this.attachEvents();
  }

  attachEvents() {
    const btn = this.container.querySelector('#loginBtn');
    btn.addEventListener('click', () => this.handleLogin());
  }

  async handleLogin() {
    const { login } = await import('../../api/auth.js');
    login();
  }
}
```

### State Management (`state/*.js`)
- Centralized application state
- Observable/reactive updates
- Persist to localStorage if needed

Example:
```javascript
// state/auth.js
class AuthState {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
  }

  setState(updates) {
    Object.assign(this, updates);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }
}

export const authState = new AuthState();
```

## Benefits of Modularization

1. **Maintainability**: Easier to find and fix bugs
2. **Reusability**: Components can be reused
3. **Testability**: Modules can be tested independently
4. **Collaboration**: Multiple developers can work simultaneously
5. **Performance**: Load only what's needed (code splitting)
6. **Scalability**: Easy to add new features

## Migration Strategy

### Step 1: Create Structure
- Create directories
- Set up index.html with module imports

### Step 2: Extract API Layer
- Move all `fetch()` calls to `api/*.js`
- Test API calls work

### Step 3: Extract Components
- Start with simple components (Header, LoginButton)
- Gradually extract more complex ones (ShareBox, ConcernFeed)
- Keep mockup.html as reference

### Step 4: Add State Management
- Extract state from global variables
- Implement reactive updates

### Step 5: Clean Up
- Remove mockup.html once migration complete
- Or keep as static demo/reference

## Next Steps

1. Set up basic module structure
2. Extract authentication components first (highest priority)
3. Extract timeline/share box (user interaction)
4. Extract concern feed (main content)
5. Add proper error handling and loading states
