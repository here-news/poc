/**
 * User Menu Component
 * Displays user info and logout button when authenticated
 */

import { logout } from '../../api/auth.js';
import { authState } from '../../state/auth.js';

export class UserMenu {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
    this.init();
  }

  init() {
    // Subscribe to auth state changes
    this.unsubscribe = authState.subscribe((state) => {
      this.render(state);
    });

    // Initial render
    this.render(authState);
  }

  render(state) {
    if (state.isLoading) {
      this.container.innerHTML = `
        <div class="animate-pulse">
          <div class="h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
      `;
      return;
    }

    if (!state.isAuthenticated || !state.user) {
      this.container.innerHTML = `
        <button onclick="window.authComponents.login()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base">
          Sign in with Google
        </button>
      `;
      return;
    }

    // User is authenticated
    const { user } = state;
    this.container.innerHTML = `
      <div class="relative" id="userMenuDropdown">
        <button id="userMenuButton"
                class="flex items-center gap-2 hover:opacity-80 transition">
          <img src="${user.picture || '/static/img/default-avatar.png'}"
               alt="${user.name || 'User'}"
               class="w-8 h-8 rounded-full border-2 border-gray-300">
          <span class="hidden md:inline text-sm font-medium">${user.name || 'User'}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <!-- Dropdown Menu (hidden by default) -->
        <div id="userMenuOptions"
             class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div class="px-4 py-2 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900">${user.name || 'User'}</p>
            <p class="text-xs text-gray-500 truncate">${user.email || ''}</p>
          </div>
          <button id="logoutButton"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
            Sign out
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const menuButton = this.container.querySelector('#userMenuButton');
    const menuOptions = this.container.querySelector('#userMenuOptions');
    const logoutButton = this.container.querySelector('#logoutButton');

    if (menuButton && menuOptions) {
      // Toggle dropdown
      menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuOptions.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        menuOptions.classList.add('hidden');
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout failed:', error);
        }
      });
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
