import { ParsedInput } from '../types/chat'

const URL_REGEX = /(https?:\/\/[^\s]+)/gi

/**
 * Parse and classify user input into text, URLs, or mixed
 */
export const parseInput = (input: string): ParsedInput => {
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      type: 'text_only',
      text: '',
      urls: [],
      originalInput: input
    }
  }

  // Extract all URLs
  const urlMatches = trimmed.match(URL_REGEX) || []
  const urls = [...new Set(urlMatches)] // Remove duplicates

  // Remove URLs from text to get remaining text content
  let textOnly = trimmed
  urls.forEach(url => {
    textOnly = textOnly.replace(url, '')
  })
  textOnly = textOnly.trim()

  // Classify input type
  let type: ParsedInput['type']
  if (urls.length === 0) {
    type = 'text_only'
  } else if (textOnly.length === 0) {
    type = 'url_only'
  } else {
    type = 'mixed'
  }

  return {
    type,
    text: textOnly,
    urls,
    originalInput: input
  }
}

/**
 * Validate if a string is a valid URL
 */
export const isValidUrl = (str: string): boolean => {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract domain from URL for display
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Detect if input contains any URLs
 */
export const containsUrl = (input: string): boolean => {
  return URL_REGEX.test(input)
}
