/**
 * Epistemic App - Main Entry Point
 */

import { authState } from '@/state/auth';
import { login } from '@/api/auth';

console.log('🔍 Epistemic app loaded');

// Initialize app
async function init() {
  console.log('Initializing app...');

  // Auth state is already loading in background
  authState.subscribe((state) => {
    console.log('Auth state updated:', state);
    updateUI(state);
  });

  // Initial UI update
  updateUI(authState.getState());
}

// Update UI based on auth state
function updateUI(state: ReturnType<typeof authState.getState>) {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  if (state.isLoading) {
    appContainer.innerHTML = '<div class="p-8 text-center">Loading...</div>';
    return;
  }

  if (state.isAuthenticated && state.user) {
    appContainer.innerHTML = `
      <div class="p-8">
        <h1 class="text-2xl font-bold mb-4">Welcome, ${state.user.name || 'User'}!</h1>
        <img src="${state.user.picture || ''}" alt="Profile" class="w-16 h-16 rounded-full mb-4" />
        <p>You are logged in.</p>
        <button id="logoutBtn" class="mt-4 px-4 py-2 bg-red-600 text-white rounded">
          Sign Out
        </button>
      </div>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const { logout } = await import('@/api/auth');
        await logout();
      });
    }
  } else {
    appContainer.innerHTML = `
      <div class="p-8 text-center">
        <h1 class="text-3xl font-bold mb-4">Epistemic</h1>
        <p class="mb-6">Epistemological truth-seeking platform</p>
        <button id="loginBtn" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Sign in with Google
        </button>
      </div>
    `;

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', login);
    }
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
