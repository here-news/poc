/**
 * Concerns API
 * Handles all concern-related API calls
 */

import type { Concern } from '@/types/models';

const BASE_URL = '/epistemic/api';

/**
 * Get all concerns (mockup data for now)
 */
export async function getConcerns(): Promise<Concern[]> {
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
 */
export async function getConcern(concernId: string): Promise<Concern> {
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
