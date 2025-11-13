/**
 * Authentication State Management
 * Simple reactive state for auth status
 */

import type { UserPublic } from '@/types/models';
import { getAuthStatus } from '@/api/auth';

interface AuthState {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthStateListener = (state: AuthState) => void;

class AuthStateManager {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: AuthStateListener[] = [];

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<AuthState> {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  setState(updates: Partial<AuthState>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Notify listeners only if state actually changed
    if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
      this.notify();
    }
  }

  /**
   * Subscribe to state changes
   * @returns unsubscribe function
   */
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  /**
   * Load auth status from API
   */
  async loadAuthStatus(): Promise<void> {
    try {
      const status = await getAuthStatus();
      this.setState({
        user: status.user,
        isAuthenticated: status.authenticated,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load auth status:', error);
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }
}

// Export singleton instance
export const authState = new AuthStateManager();

// Auto-load auth status on module import
authState.loadAuthStatus();
