/**
 * Authentication API
 * Handles all auth-related API calls
 */

const BASE_URL = '/epistemic/api/auth';

/**
 * Initiate Google OAuth login
 */
export function login() {
  window.location.href = `${BASE_URL}/login`;
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    await fetch(`${BASE_URL}/logout`);
    window.location.href = '/epistemic/';
  } catch (error) {
    console.error('Logout failed:', error);
    // Force redirect anyway
    window.location.href = '/epistemic/';
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<{id: string, email: string, name: string, picture: string}>}
 */
export async function getCurrentUser() {
  try {
    const response = await fetch(`${BASE_URL}/me`);
    if (!response.ok) {
      if (response.status === 401) {
        return null; // Not authenticated
      }
      throw new Error(`Failed to get current user: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
}

/**
 * Check authentication status
 * @returns {Promise<{authenticated: boolean, user: object|null}>}
 */
export async function getAuthStatus() {
  try {
    const response = await fetch(`${BASE_URL}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get auth status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get auth status failed:', error);
    return { authenticated: false, user: null };
  }
}
