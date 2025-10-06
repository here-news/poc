export type MessageRole = 'user' | 'system'

export type MessageContentType =
  | 'text'
  | 'url_preview'
  | 'story_matches'
  | 'action_prompt'
  | 'typing_indicator'

export interface ParsedInput {
  type: 'text_only' | 'url_only' | 'mixed'
  text: string
  urls: string[]
  originalInput: string
}

export interface URLPreview {
  url: string
  title: string
  description: string
  thumbnail?: string
  siteName?: string
  author?: string
  favicon?: string
}

export interface StoryMatch {
  id: string
  title: string
  description: string
  healthIndicator: 'healthy' | 'growing' | 'stale' | 'archived'
  lastUpdated: string
  matchScore?: number
  contributorCount?: number
  claimCount?: number
}

export interface ActionPrompt {
  type: 'join_or_create' | 'clarify' | 'processing'
  message: string
  actions?: Array<{
    id: string
    label: string
    variant: 'primary' | 'secondary' | 'ghost'
    route?: string
  }>
}

export interface ChatMessage {
  id: string
  role: MessageRole
  timestamp: Date
  content: {
    type: MessageContentType
    data: any // Will be typed based on contentType
  }
}

export interface ChatSession {
  id: string
  userId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// Specific content data types
export interface TextContent {
  text: string
  parsedInput?: ParsedInput  // Include parsed input data
  urlPreviews?: URLPreview[]  // Include inline URL previews
}

export interface URLPreviewContent {
  preview: URLPreview
  extractionTaskId?: string
}

export interface StoryMatchesContent {
  matches: StoryMatch[]
  query: string
  totalFound: number
}

export interface ActionPromptContent {
  prompt: ActionPrompt
}
