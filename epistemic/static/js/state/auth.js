/**
 * Authentication State Management
 * Simple reactive state for auth status
 */

class AuthState {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.isLoading = true;
    this.listeners = [];
  }

  /**
   * Update state and notify listeners
   */
  setState(updates) {
    const prevState = { ...this };
    Object.assign(this, updates);

    // Notify listeners only if state actually changed
    if (JSON.stringify(prevState) !== JSON.stringify(this)) {
      this.notify();
    }
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  /**
   * Load auth status from API
   */
  async loadAuthStatus() {
    try {
      const { getAuthStatus } = await import('../api/auth.js');
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
export const authState = new AuthState();

// Auto-load auth status on module import
authState.loadAuthStatus();
