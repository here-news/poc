"""
Content Validator - Uses LLM to validate and clean extracted web content
"""
import os
import json
from typing import Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ValidationResult:
    def __init__(self, is_valid: bool, reason: str = "", cleaned_data: Optional[Dict] = None, cleaned_content: str = "", token_usage: Optional[Dict] = None, flags: Optional[list] = None):
        self.is_valid = is_valid
        self.reason = reason
        self.cleaned_data = cleaned_data or {}
        self.cleaned_content = cleaned_content
        self.token_usage = token_usage or {}
        self.flags = flags or []  # Quality/content flags for editorial review

class ContentValidator:
    """Validates and cleans extracted web content using GPT-4o-mini"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"  # Cheapest model

    async def validate_extraction(self, extraction_result: Dict[str, Any]) -> ValidationResult:
        """
        Validate extracted content for coherence and quality

        Checks:
        1. Content is not anti-bot/paywall message
        2. Metadata (title, author, date) is coherent with content
        3. Content and title match semantically
        4. No duplicate or conflicting metadata
        """

        # Quick checks before calling LLM
        if not extraction_result.get("content_text") or len(extraction_result.get("content_text", "").strip()) < 50:
            return ValidationResult(
                is_valid=True,
                reason="Content too short or empty",
                flags=["short_content", "empty_content"]
            )

        # Build validation prompt
        prompt = self._build_validation_prompt(extraction_result)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a content validation expert. Your job is to analyze extracted web content and:
1. Clean the content to focus ONLY on the main article - remove navigation, footers, related articles, sidebars
2. Extract the actual publish time from the content text (look for patterns like "SEPTEMBER 30, 2025, 3:31 PM")
3. Extract author name(s) from content - handle both single and multiple authors
4. Validate metadata coherence and ensure title/content match
5. Extract a concise summary focusing on the core topic
6. FLAG quality issues rather than rejecting

IMPORTANT: NEVER reject content. Always return is_valid=true and use "flags" array to signal issues.

AUTHOR EXTRACTION: Be diligent - check multiple locations and formats:
- Single author patterns: after "By" or before "Published:"
- Multiple authors: can appear comma-separated on one line or on consecutive lines
- Common locations: after "By", "Written by", "Author:", or before "Published:", "Posted:"
- Near headline, reading time metadata, or between headline and article body
- If multiple authors found, return comma-separated list

Common flags to include (CHECK ALL):
- "paywall_detected" - ANY mention of: Subscribe, subscription, sign in, premium, member-only
- "short_content" - cleaned_content under 300 words (COUNT WORDS!)
- "anti_bot" - bot detection message present
- "error_page" - 403/404/error content
- "metadata_date_mismatch" - publish date in metadata differs from content
- "no_author" - no author in cleaned content or original metadata
- "navigation_heavy" - excessive navigation/UI elements

CRITICAL: Always check word count of cleaned_content and flag if <300 words.

Return a JSON response with:
{
  "is_valid": true,
  "reason": "brief assessment of content quality",
  "flags": ["paywall_detected", "short_content"],
  "cleaned_metadata": {
    "title": "cleaned title focusing on main topic",
    "author": "author extracted from content or metadata (or null if missing)",
    "publish_date": "exact publish date/time extracted from CONTENT TEXT (e.g., 'September 30, 2025, 3:31 PM')",
    "meta_description": "concise 1-2 sentence summary of the main topic"
  },
  "cleaned_content": "main article content only, without navigation/footer/sidebar/related articles (include whatever is available even if partial)"
}"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)

            # Extract token usage
            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
                "model": self.model
            }

            # Get initial flags from LLM
            flags = result_json.get("flags", [])
            cleaned_content = result_json.get("cleaned_content", "")

            # Post-process: Verify and add missing flags (LLMs can be unreliable)
            flags = self._verify_and_add_flags(
                flags,
                cleaned_content,
                extraction_result.get("content_text", ""),
                result_json.get("cleaned_metadata", {})
            )

            return ValidationResult(
                is_valid=result_json.get("is_valid", True),  # Default to True now
                reason=result_json.get("reason", ""),
                cleaned_data=result_json.get("cleaned_metadata", {}),
                cleaned_content=cleaned_content,
                token_usage=token_usage,
                flags=flags
            )

        except Exception as e:
            print(f"❌ Validation error: {e}")
            # On error, allow content through but flag it
            return ValidationResult(
                is_valid=True,
                reason=f"Validation skipped due to error: {str(e)}",
                cleaned_data={},
                flags=["validation_error"]
            )

    def _build_validation_prompt(self, extraction: Dict[str, Any]) -> str:
        """Build validation prompt from extraction result"""
        from datetime import datetime

        # Use full content for cleaning, not just preview
        full_content = extraction.get("content_text", "")
        current_date = datetime.now().strftime("%Y-%m-%d")

        prompt = f"""IMPORTANT: Today's date is {current_date}. Never reject - always flag issues instead.

Analyze this extracted web content:

URL: {extraction.get('url', 'N/A')}
Domain: {extraction.get('domain', 'N/A')}

METADATA (may contain errors):
Title: {extraction.get('title', 'N/A')}
Author: {extraction.get('author', 'N/A')}
Publish Date: {extraction.get('publish_date', 'N/A')} (⚠️ This may be incorrect - extract actual date from content)
Meta Description: {extraction.get('meta_description', 'N/A')}

FULL CONTENT:
{full_content}

WORD COUNT: {extraction.get('word_count', 0)}

Your tasks:
1. Extract the EXACT publish date/time from the CONTENT TEXT (look for "SEPTEMBER 30, 2025, 3:31 PM" or similar patterns)
   - If metadata date differs from content date, TRUST THE CONTENT and add flag "metadata_date_mismatch"
2. Extract the AUTHOR from content using these common patterns:
   - Name appearing RIGHT BEFORE "Published:", "Posted:", or timestamps (e.g., "Xinmei Shen\nPublished: 7:00pm")
   - After "By", "Written by", "Author:" (e.g., "By Kevin F. Hsu")
   - In bylines near headline (first 200 chars)
   - Between headline and first paragraph
   - Near "Reading Time:", "Listen", or other metadata
   - IGNORE navigation text like "Contact", "About", "Staff"
   - If NO author found anywhere, set null and add flag "no_author"
3. Clean the content to include ONLY the main article text:
   - Remove navigation menus (e.g., "Skip to navigation", "Latest Regions", "Search this website")
   - Remove footer links (e.g., "Contact Us", "Copyright", "Privacy Policy")
   - Remove "RELATED ARTICLES", "MOST VIEWED" sections
   - Remove social media links and sharing buttons
   - Keep only the article headline and body paragraphs
4. Create a focused summary of the main topic
5. FLAG quality issues (never reject):
   - "paywall_detected" - contains "Subscribe", "subscription", "sign in", "become a member", "premium content"
   - "short_content" - under 300 words after cleaning (likely incomplete/paywalled)
   - "anti_bot" - contains "Please enable JavaScript", "Access denied", bot detection
   - "error_page" - 403/404/error content
   - "metadata_date_mismatch" - dates don't match
   - "no_author" - no author found in content or metadata
   - "navigation_heavy" - lots of UI/menu elements

IMPORTANT: Count words in cleaned_content. If under 300 words, ADD "short_content" flag.
Check for paywall patterns: "Subscribe", "subscription required", "sign in to read", "become a member".

Return validation result as JSON. ALWAYS set is_valid=true. Include whatever content is available, even if partial."""

        return prompt

    def _verify_and_add_flags(self, llm_flags: list, cleaned_content: str,
                              original_content: str, cleaned_metadata: dict) -> list:
        """
        Post-process flags to ensure critical checks weren't missed by LLM
        Also attempts fallback author extraction if LLM missed it
        """
        flags = list(llm_flags)  # Copy to avoid mutation

        # Check 1: Word count (CRITICAL)
        word_count = len(cleaned_content.split())
        if word_count < 300 and "short_content" not in flags:
            flags.append("short_content")
            print(f"⚠️  Added short_content flag ({word_count} words < 300)")

        # Check 2: Paywall patterns (case-insensitive)
        paywall_patterns = [
            "subscribe", "subscription", "sign in to read", "sign in to continue",
            "become a member", "premium content", "member-only", "subscribers only",
            "unlock this article", "create a free account", "register to read",
            "see subscription options", "enjoy unlimited access", "subscriber exclusive"
        ]
        content_lower = (original_content + " " + cleaned_content).lower()
        has_paywall = any(pattern in content_lower for pattern in paywall_patterns)
        if has_paywall and "paywall_detected" not in flags:
            flags.append("paywall_detected")
            print(f"⚠️  Added paywall_detected flag")

        # Check 3: No author - try fallback extraction before flagging
        has_author = cleaned_metadata.get("author") and cleaned_metadata["author"] not in [None, "", "N/A", "null"]
        if not has_author:
            # Attempt programmatic author extraction as fallback
            fallback_author = self._extract_author_fallback(original_content)
            if fallback_author:
                cleaned_metadata["author"] = fallback_author
                print(f"✅ Fallback extracted author: {fallback_author}")
                # Don't flag if fallback succeeded
            else:
                # Only flag if both LLM and fallback failed
                if "no_author" not in flags:
                    flags.append("no_author")

        # Check 4: Very short content (likely extraction failure)
        if word_count < 50 and "empty_content" not in flags:
            flags.append("empty_content")

        return flags

    def _extract_author_fallback(self, content: str) -> str:
        """
        Programmatic fallback to extract author from common patterns
        Generic patterns that work across different site layouts
        """
        import re

        # Pattern 1: Name before "Published:" or "Posted:"
        # Matches: "John Smith\nPublished:" or "Jane Doe\nPosted:"
        pattern1 = r'([A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)+)\s*[\r\n]+\s*(?:Published|Posted|By\s*line):'
        match = re.search(pattern1, content)
        if match:
            author = match.group(1).strip()
            if self._is_valid_author_name(author):
                return author

        # Pattern 2: After "By"
        # Matches: "By John Smith" or "By John Smith, Jane Doe, Bob Wilson"
        pattern2 = r'(?:^|\n)By\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)+(?:,\s+[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)+)*)'
        match = re.search(pattern2, content, re.MULTILINE)
        if match:
            author = match.group(1).strip()
            if self._is_valid_author_name(author):
                return author

        # Pattern 3: After "Written by" or "Author:"
        # Matches: "Written by John Smith" or "Author: Jane Doe"
        pattern3 = r'(?:Written\s+by|Author):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'
        match = re.search(pattern3, content)
        if match:
            author = match.group(1).strip()
            if self._is_valid_author_name(author):
                return author

        # Pattern 4: Multiple consecutive lines with proper names (multi-author byline)
        # Generic pattern: looks for 2-5 consecutive lines with valid names in first 100 lines
        # This handles sites that list authors on separate lines
        lines = content.split('\n')
        for i in range(min(100, len(lines))):
            line = lines[i].strip()
            # Check if this line is a valid author name
            if self._is_valid_author_name(line):
                authors = [line]
                # Look for consecutive author names
                for j in range(i + 1, min(i + 5, len(lines))):
                    next_line = lines[j].strip()
                    if self._is_valid_author_name(next_line):
                        authors.append(next_line)
                    else:
                        # Stop if we hit a non-name line
                        break
                # If we found multiple consecutive names, likely a multi-author byline
                if len(authors) >= 2:
                    result = ', '.join(authors)
                    print(f"✅ Fallback extracted multiple authors: {result}")
                    return result

        return ""

    def _is_valid_author_name(self, name: str) -> bool:
        """
        Validate that a string looks like a real author name
        Rejects common false positives
        """
        if not name or len(name) < 4:
            return False

        # Exclude common false positives
        name_lower = name.lower()
        exclude_words = [
            "sign", "subscribe", "click", "read", "more", "here", "now",
            "continue", "share", "print", "save", "follow", "latest",
            "shutdown", "update", "breaking", "live", "today", "news"
        ]

        # Check if name contains excluded words
        for word in exclude_words:
            if word in name_lower:
                return False

        # Name should have at least 2 parts (first + last)
        parts = name.split()
        if len(parts) < 2:
            return False

        # Each part should be mostly alphabetic (allow apostrophes, hyphens)
        for part in parts:
            if part in [".", "Jr", "Sr", "Jr.", "Sr.", "II", "III"]:
                continue
            clean_part = part.replace("'", "").replace("-", "").replace(".", "")
            if not clean_part.isalpha() or len(clean_part) < 2:
                return False

        return True

# Global validator instance
content_validator = ContentValidator()
