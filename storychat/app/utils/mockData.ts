import { ChatMessage, StoryMatch, URLPreview } from '../types/chat'

/**
 * Mock story matches for demonstration
 */
export const mockStoryMatches: StoryMatch[] = [
  {
    id: 'story_001',
    title: 'SpaceX Starship Development Program',
    description: 'Tracking the development, testing, and regulatory challenges of SpaceX\'s Starship rocket system',
    healthIndicator: 'healthy',
    lastUpdated: '2h ago',
    matchScore: 0.92,
    contributorCount: 12,
    claimCount: 47
  },
  {
    id: 'story_002',
    title: 'Commercial Space Flight Safety Records',
    description: 'Analysis of safety incidents and regulatory responses in the commercial spaceflight industry',
    healthIndicator: 'growing',
    lastUpdated: '5h ago',
    matchScore: 0.78,
    contributorCount: 8,
    claimCount: 23
  },
  {
    id: 'story_003',
    title: 'FAA Space Launch Regulations 2024',
    description: 'Updates to Federal Aviation Administration regulations governing commercial space launches',
    healthIndicator: 'stale',
    lastUpdated: '2d ago',
    matchScore: 0.65,
    contributorCount: 5,
    claimCount: 15
  }
]

/**
 * Mock URL previews for demonstration
 */
export const mockUrlPreviews: Record<string, URLPreview> = {
  'nytimes': {
    url: 'https://www.nytimes.com/2024/10/06/spacex-starship-test.html',
    title: 'SpaceX Starship Test Ends in Dramatic Explosion',
    description: 'The latest test flight of SpaceX\'s Starship rocket ended in an explosion during the landing attempt, raising questions about the timeline for NASA\'s lunar missions.',
    thumbnail: 'https://via.placeholder.com/600x400/1a1a2e/ffffff?text=SpaceX+Starship',
    siteName: 'The New York Times',
    author: 'Kenneth Chang',
    favicon: 'https://www.google.com/s2/favicons?domain=nytimes.com&sz=32'
  },
  'techcrunch': {
    url: 'https://techcrunch.com/2024/10/06/openai-new-model-launch',
    title: 'OpenAI Announces GPT-5 with Enhanced Reasoning Capabilities',
    description: 'OpenAI has unveiled GPT-5, claiming significant improvements in mathematical reasoning, code generation, and long-term planning.',
    thumbnail: 'https://via.placeholder.com/600x400/0f2027/ffffff?text=OpenAI+GPT-5',
    siteName: 'TechCrunch',
    author: 'Sarah Perez',
    favicon: 'https://www.google.com/s2/favicons?domain=techcrunch.com&sz=32'
  },
  'reuters': {
    url: 'https://www.reuters.com/world/climate-summit-2024',
    title: 'World Leaders Commit to Aggressive Carbon Reduction Targets',
    description: 'At COP29 in Dubai, major economies pledged to accelerate decarbonization efforts with new binding commitments through 2035.',
    thumbnail: 'https://via.placeholder.com/600x400/134e5e/ffffff?text=Climate+Summit',
    siteName: 'Reuters',
    author: 'Valerie Volcovici',
    favicon: 'https://www.google.com/s2/favicons?domain=reuters.com&sz=32'
  }
}

/**
 * Generate mock chat flow for text-only input
 */
export const generateTextOnlyChatFlow = (userInput: string): ChatMessage[] => {
  return [
    {
      id: 'msg_1',
      role: 'user',
      timestamp: new Date(Date.now() - 5000),
      content: {
        type: 'text',
        data: { text: userInput }
      }
    },
    {
      id: 'msg_2',
      role: 'system',
      timestamp: new Date(Date.now() - 3000),
      content: {
        type: 'story_matches',
        data: {
          matches: mockStoryMatches,
          query: userInput,
          totalFound: mockStoryMatches.length
        }
      }
    },
    {
      id: 'msg_3',
      role: 'system',
      timestamp: new Date(Date.now() - 2000),
      content: {
        type: 'action_prompt',
        data: {
          prompt: {
            type: 'join_or_create',
            message: 'I found 3 related story threads. Would you like to join one or create a new thread?',
            actions: [
              {
                id: 'create_new',
                label: 'Create New Thread',
                variant: 'primary',
                route: '/build/new'
              },
              {
                id: 'refine_search',
                label: 'Refine Search',
                variant: 'secondary'
              }
            ]
          }
        }
      }
    }
  ]
}

/**
 * Generate mock chat flow for URL input
 */
export const generateUrlChatFlow = (url: string): ChatMessage[] => {
  const preview = mockUrlPreviews['nytimes']

  return [
    {
      id: 'msg_1',
      role: 'user',
      timestamp: new Date(Date.now() - 8000),
      content: {
        type: 'text',
        data: {
          text: url,
          urlPreviews: [preview]  // Include preview inline with user message
        }
      }
    },
    {
      id: 'msg_2',
      role: 'system',
      timestamp: new Date(Date.now() - 4000),
      content: {
        type: 'story_matches',
        data: {
          matches: mockStoryMatches.slice(0, 2),
          query: preview.title,
          totalFound: 2
        }
      }
    },
    {
      id: 'msg_3',
      role: 'system',
      timestamp: new Date(Date.now() - 2000),
      content: {
        type: 'action_prompt',
        data: {
          prompt: {
            type: 'join_or_create',
            message: 'This article relates to 2 existing threads. Join one to add this source, or start a new investigation.',
            actions: [
              {
                id: 'add_to_existing',
                label: 'Add to Existing Thread',
                variant: 'secondary'
              },
              {
                id: 'create_new',
                label: 'Start New Investigation',
                variant: 'primary',
                route: '/build/new?source=' + encodeURIComponent(url)
              }
            ]
          }
        }
      }
    }
  ]
}

/**
 * Generate mock chat flow for mixed input (text + URL)
 */
export const generateMixedChatFlow = (text: string, url: string): ChatMessage[] => {
  const preview = mockUrlPreviews['techcrunch']

  return [
    {
      id: 'msg_1',
      role: 'user',
      timestamp: new Date(Date.now() - 10000),
      content: {
        type: 'text',
        data: {
          text: `${text} ${url}`,
          urlPreviews: [preview]  // Include preview inline with user message
        }
      }
    },
    {
      id: 'msg_2',
      role: 'system',
      timestamp: new Date(Date.now() - 4000),
      content: {
        type: 'story_matches',
        data: {
          matches: [
            {
              id: 'story_ai_001',
              title: 'AI Model Development Race 2024',
              description: 'Tracking major AI labs\' releases and capabilities claims',
              healthIndicator: 'healthy',
              lastUpdated: '1h ago',
              matchScore: 0.88,
              contributorCount: 24,
              claimCount: 89
            }
          ],
          query: text,
          totalFound: 1
        }
      }
    },
    {
      id: 'msg_3',
      role: 'system',
      timestamp: new Date(Date.now() - 2000),
      content: {
        type: 'action_prompt',
        data: {
          prompt: {
            type: 'join_or_create',
            message: 'Found 1 highly relevant thread. This source could strengthen the investigation.',
            actions: [
              {
                id: 'join_story',
                label: 'Add to "AI Model Development Race 2024"',
                variant: 'primary',
                route: '/story/story_ai_001?add_source=true'
              },
              {
                id: 'create_new',
                label: 'Create Separate Thread',
                variant: 'secondary',
                route: '/build/new'
              }
            ]
          }
        }
      }
    }
  ]
}
