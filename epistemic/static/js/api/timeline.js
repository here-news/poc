/**
 * Timeline API
 * Handles all timeline-related API calls
 */

const BASE_URL = '/epistemic/api/timeline';

/**
 * Get user's timeline entries
 * @param {number} limit - Number of entries to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>}
 */
export async function getTimeline(limit = 50, offset = 0) {
  try {
    const response = await fetch(`${BASE_URL}/?limit=${limit}&offset=${offset}`);
    if (!response.ok) {
      throw new Error(`Failed to get timeline: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get timeline failed:', error);
    throw error;
  }
}

/**
 * Create new timeline entry
 * @param {object} entryData - Entry data
 * @param {string} entryData.content - Entry content (required)
 * @param {string} entryData.link - Optional URL link
 * @param {string} entryData.type - Entry type (share|comment|evidence|quest_submission)
 * @param {object} entryData.metadata - Optional metadata
 * @returns {Promise<object>}
 */
export async function createTimelineEntry(entryData) {
  try {
    const response = await fetch(BASE_URL + '/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to create timeline entry: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create timeline entry failed:', error);
    throw error;
  }
}

/**
 * Get specific timeline entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<object>}
 */
export async function getTimelineEntry(entryId) {
  try {
    const response = await fetch(`${BASE_URL}/${entryId}`);
    if (!response.ok) {
      throw new Error(`Failed to get timeline entry: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get timeline entry failed:', error);
    throw error;
  }
}

/**
 * Update timeline entry
 * @param {string} entryId - Entry ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>}
 */
export async function updateTimelineEntry(entryId, updates) {
  try {
    const response = await fetch(`${BASE_URL}/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to update timeline entry: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update timeline entry failed:', error);
    throw error;
  }
}

/**
 * Delete timeline entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<void>}
 */
export async function deleteTimelineEntry(entryId) {
  try {
    const response = await fetch(`${BASE_URL}/${entryId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to delete timeline entry: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Delete timeline entry failed:', error);
    throw error;
  }
}
