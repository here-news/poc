/**
 * Type definitions for Epistemic app models
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
}

export interface UserPublic {
  id: string;
  name: string | null;
  picture: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
  user: UserPublic | null;
}

export type TimelineEntryType = 'share' | 'comment' | 'evidence' | 'quest_submission';

export interface TimelineEntry {
  id: string;
  content: string;
  link: string | null;
  type: TimelineEntryType;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
  user?: UserPublic;
}

export interface TimelineEntryCreate {
  content: string;
  link?: string;
  type?: TimelineEntryType;
  metadata?: Record<string, any>;
}

export interface TimelineEntryUpdate {
  content?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export type ConcernType = 'entity-first' | 'quest-first' | 'hybrid';

export interface Concern {
  id: string;
  title: string;
  description: string;
  type: ConcernType;
  topics: string[];
  source?: string;
  entities?: string[];
  quest_title?: string;
  created_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}
