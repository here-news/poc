/**
 * Concerns API
 * Handles all concern-related API calls
 * Currently serves mockup data, ready for backend integration
 */

const BASE_URL = '/epistemic/api';

/**
 * Get all concerns (mockup data for now)
 * @returns {Promise<Array>}
 */
export async function getConcerns() {
  try {
    const response = await fetch(`${BASE_URL}/data`);
    if (!response.ok) {
      throw new Error(`Failed to get concerns: ${response.statusText}`);
    }
    const data = await response.json();
    return data.concerns || [];
  } catch (error) {
    console.error('Get concerns failed:', error);
    throw error;
  }
}

/**
 * Get specific concern by ID
 * @param {string} concernId - Concern ID
 * @returns {Promise<object>}
 */
export async function getConcern(concernId) {
  try {
    const concerns = await getConcerns();
    const concern = concerns.find(c => c.id === concernId);
    if (!concern) {
      throw new Error(`Concern not found: ${concernId}`);
    }
    return concern;
  } catch (error) {
    console.error('Get concern failed:', error);
    throw error;
  }
}

// Future endpoints (when backend is ready):
// POST /api/concerns - Create new concern
// PUT /api/concerns/{id} - Update concern
// DELETE /api/concerns/{id} - Delete concern
