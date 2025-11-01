/**
 * Story API Types
 *
 * Type definitions for story data returned from the backend API
 */

/**
 * Citation metadata for linking story content to source articles
 */
export interface CitationMetadata {
  url: string
  title: string
  domain: string
  pub_time: string
  snippet: string // First 200 chars of article content
}

/**
 * Entity metadata for linking story content to knowledge graph entities
 */
export interface EntityMetadata {
  name: string
  qid: string // Wikidata QID
  description: string // Wikidata description
  image_url?: string
  entity_type: string // person, organization, location, event, etc.
  claim_count: number // Number of claims mentioning this entity
}

/**
 * Story content with inline citation and entity markup
 *
 * Content includes markup:
 * - Citations: {{cite:page_id1,page_id2}}
 * - Entities: [[Entity Name|canonical_id]]
 */
export interface StoryContent {
  content: string
  citations_metadata: Record<string, CitationMetadata>
  entities_metadata: Record<string, EntityMetadata>
}

/**
 * Article/Page artifact referenced in a story
 */
export interface Artifact {
  url: string
  title: string
  domain: string | null
  pub_time?: string
  published_at?: string
  pub_date?: string
  publication_date?: string
  publish_date?: string
  created_at?: string
  page_id?: string // UUID of Page node in Neo4j
}

/**
 * Complete story response from API
 */
export interface Story {
  id: string
  title: string
  summary?: string
  content?: string // Legacy plain text content
  story_content?: StoryContent // New structured content with citations
  artifacts?: Artifact[]
  created_at?: string
  last_updated?: string
  coherence?: number
  [key: string]: any // Allow additional fields
}
