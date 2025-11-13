/**
 * Timeline API
 * Handles all timeline-related API calls
 */

import type { TimelineEntry, TimelineEntryCreate, TimelineEntryUpdate } from '@/types/models';

const BASE_URL = '/epistemic/api/timeline';

/**
 * Get user's timeline entries
 */
export async function getTimeline(limit: number = 50, offset: number = 0): Promise<TimelineEntry[]> {
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
 */
export async function createTimelineEntry(entryData: TimelineEntryCreate): Promise<TimelineEntry> {
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
 */
export async function getTimelineEntry(entryId: string): Promise<TimelineEntry> {
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
 */
export async function updateTimelineEntry(
  entryId: string,
  updates: TimelineEntryUpdate
): Promise<TimelineEntry> {
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
 */
export async function deleteTimelineEntry(entryId: string): Promise<void> {
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
