"""
Universal Web Content Extractor - Simple text reader

Core Logic:
1. Load web page completely
2. Extract all visible text content
3. Return structured result

Site-agnostic approach - extracts whatever text is visible without judgments.
"""

import json
import time
from typing import Dict, Any
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from urllib.parse import urlparse
from dataclasses import dataclass, asdict

@dataclass
class WebPageResult:
    """Universal web page extraction result"""
    # Basic identification
    url: str
    canonical_url: str
    domain: str

    # Simple status
    is_readable: bool
    status: str  # readable, empty, error

    # Extracted content
    title: str = ""
    content_text: str = ""
    meta_description: str = ""
    author: str = ""
    publish_date: str = ""

    # Metrics
    word_count: int = 0
    reading_time_minutes: float = 0.0

    # Screenshot
    screenshot_bytes: bytes = None

    # Technical details
    extraction_timestamp: str = ""
    processing_time_ms: int = 0
    error_message: str = ""

    def __post_init__(self):
        if not self.extraction_timestamp:
            self.extraction_timestamp = datetime.now().isoformat()
        if not self.canonical_url:
            self.canonical_url = self.url
        if not self.domain:
            self.domain = urlparse(self.url).netloc

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for easy serialization (exclude binary data)"""
        data = asdict(self)
        # Remove screenshot_bytes from dict (binary data not JSON serializable)
        data.pop('screenshot_bytes', None)
        return data

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)

class UniversalWebExtractor:
    """
    Universal web content extractor - simple text reader for any site
    """

    def __init__(self):
        pass  # No configuration needed - pure text extraction

    async def extract_page(self, url: str, timeout_seconds: int = 30) -> WebPageResult:
        """
        Main extraction method:
        Load page → Extract all visible text → Return result
        """
        start_time = time.time()

        result = WebPageResult(
            url=url,
            canonical_url=url,
            domain=urlparse(url).netloc,
            is_readable=False,
            status="error"
        )

        try:
            async with async_playwright() as p:
                # Step 1: Setup browser with realistic configuration + anti-detection
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-web-security',
                        '--disable-features=IsolateOrigins,site-per-process'
                    ]
                )

                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    locale='en-US',
                    timezone_id='America/New_York',
                    permissions=['geolocation'],
                    extra_http_headers={
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }
                )

                page = await context.new_page()
                page.set_default_timeout(timeout_seconds * 1000)

                # Inject anti-detection scripts before navigation
                await page.add_init_script("""
                    // Remove webdriver flag
                    Object.defineProperty(navigator, 'webdriver', {get: () => false});

                    // Mock plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });

                    // Mock languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });

                    // Chrome object
                    window.chrome = {runtime: {}};

                    // Permissions API
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({state: Notification.permission}) :
                            originalQuery(parameters)
                    );
                """)

                # Step 2: Load page completely
                load_success = await self._load_page_completely(page, url)
                if not load_success:
                    result.status = "error"
                    result.error_message = "Failed to load page"
                    return result

                # Extract canonical URL (prefer meta tag, fallback to cleaned URL)
                result.canonical_url = await self._extract_canonical_url(page)
                result.domain = urlparse(result.canonical_url).netloc

                # Step 3: Check if content is available and extract
                readability_check = await self._check_readability(page)
                result.status = readability_check['status']
                result.is_readable = readability_check['is_readable']

                if result.is_readable:
                    # Step 4: Extract content and metadata
                    await self._extract_content_and_metadata(page, result)
                else:
                    result.error_message = readability_check.get('reason', 'No content found')

                # Step 5: Capture screenshot (always - for forensic evidence even if blocked)
                result.screenshot_bytes = await self._capture_screenshot(page)

                await browser.close()

        except Exception as e:
            result.status = "error"
            result.error_message = str(e)
            result.is_readable = False

        finally:
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000
            result.processing_time_ms = int(processing_time)

        return result

    async def _load_page_completely(self, page, url: str) -> bool:
        """
        Step 2: Load page completely with multiple strategies + anti-bot delays
        """
        print(f"🌐 Loading: {url}")

        try:
            # Add random human-like delay before navigation
            import random
            await page.wait_for_timeout(random.randint(1000, 2000))

            # Primary loading strategy with longer timeout for CAPTCHA pages
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)

            # Wait longer for dynamic content / CAPTCHA challenges
            await page.wait_for_timeout(random.randint(3000, 5000))

            # Handle cookie consent
            await self._handle_cookie_consent(page)

            # Wait for content to be ready
            await self._wait_for_content_ready(page)

            print("✅ Page loaded completely")
            return True

        except PlaywrightTimeoutError:
            print("⚠️ Load timeout, trying alternative strategy...")

            try:
                # Alternative strategy: network idle
                await page.goto(url, wait_until='networkidle', timeout=10000)
                await self._wait_for_content_ready(page)
                print("✅ Page loaded with alternative strategy")
                return True
            except:
                print("⚠️ Alternative load strategy failed, proceeding with current state")
                return True  # Still try to extract content

        except Exception as e:
            print(f"❌ Page load failed: {e}")
            return False

    async def _handle_cookie_consent(self, page):
        """Handle cookie consent dialogs quickly"""
        consent_selectors = [
            'button:has-text("Accept")',
            'button:has-text("Accept All")',
            'button:has-text("I Accept")',
            'button:has-text("Agree")',
            '[id*="accept"]',
            '.cookie-accept'
        ]

        for selector in consent_selectors:
            try:
                element = page.locator(selector).first()
                if await element.is_visible(timeout=2000):
                    await element.click(timeout=3000)
                    await page.wait_for_timeout(1000)
                    break
            except:
                continue

    async def _wait_for_content_ready(self, page):
        """Wait for content to be ready for extraction"""
        try:
            # Universal waiting - just wait for substantial content to appear
            await page.wait_for_function(
                '''() => {
                    const text = document.body.textContent || '';
                    const words = text.trim().split(/\\s+/).length;
                    return words > 100;
                }''',
                timeout=15000
            )
        except:
            # If timeout, wait a bit more for dynamic content
            await page.wait_for_timeout(5000)

    async def _check_readability(self, page) -> Dict[str, Any]:
        """
        Step 3: Check if content is readable (detect CAPTCHA/blocks)
        """
        try:
            page_text = await page.evaluate('document.body.textContent || ""')
            page_html = await page.content()

            text_lower = page_text.lower()
            html_lower = page_html.lower()

            # Check for actual content first
            has_content = page_text and len(page_text.strip()) > 100

            # Detect CAPTCHA/verification pages (only if no content)
            # This prevents false positives on paywalled articles with teasers
            if not has_content:
                captcha_indicators = [
                    'verification required',
                    'verify you are human',
                    'checking your browser',
                    'enable javascript',
                    'access denied',
                    'unusual activity'
                ]

                for indicator in captcha_indicators:
                    if indicator in text_lower or indicator in html_lower:
                        print(f"🛡️ CAPTCHA/Block detected: {indicator}")
                        return {
                            'is_readable': False,
                            'status': 'captcha_blocked',
                            'reason': f'CAPTCHA or bot detection ({indicator})'
                        }

            # Return readable if we have content (even if paywalled - validator will flag it)
            if has_content:
                print("✅ Content is readable")
                return {
                    'is_readable': True,
                    'status': 'readable'
                }
            else:
                print("⚠️ No content found")
                return {
                    'is_readable': False,
                    'status': 'empty',
                    'reason': 'No text content found'
                }

        except Exception as e:
            print(f"❌ Readability check failed: {e}")
            return {
                'is_readable': False,
                'status': 'error',
                'reason': str(e)
            }

    async def _extract_content_and_metadata(self, page, result: WebPageResult):
        """
        Step 4: Extract content and metadata from readable page
        """
        try:
            # Extract title
            result.title = await self._extract_title(page)

            # Extract main content
            result.content_text = await self._extract_main_content(page)

            # Extract metadata
            result.meta_description = await self._extract_meta_description(page)
            result.author = await self._extract_author(page)
            result.publish_date = await self._extract_publish_date(page)

            # Calculate metrics
            if result.content_text:
                words = result.content_text.split()
                result.word_count = len(words)
                result.reading_time_minutes = round(result.word_count / 200, 1)

            print(f"📄 Extracted: {result.word_count} words, title: '{result.title[:50]}...'")

        except Exception as e:
            print(f"❌ Content extraction failed: {e}")
            result.error_message = f"Content extraction failed: {str(e)}"

    async def _extract_title(self, page) -> str:
        """Extract page title"""
        title_selectors = [
            'h1',
            'title',
            'meta[property="og:title"]',
            'meta[name="twitter:title"]'
        ]

        for selector in title_selectors:
            try:
                if selector == 'title':
                    title = await page.title()
                elif selector.startswith('meta'):
                    title = await page.get_attribute(selector, 'content')
                else:
                    element = await page.query_selector(selector)
                    title = await element.text_content() if element else None

                if title and len(title.strip()) > 5:
                    return title.strip()
            except:
                continue

        return ""

    async def _extract_main_content(self, page) -> str:
        """Extract visible content - simple and universal"""

        try:
            # Simple approach: get all visible text content
            body_text = await page.evaluate('document.body.innerText')
            if body_text:
                return self._clean_content(body_text)
        except:
            pass

        return ""

    async def _extract_meta_description(self, page) -> str:
        """Extract meta description"""
        try:
            # Try meta description
            meta_desc = await page.get_attribute('meta[name="description"]', 'content')
            if meta_desc:
                return meta_desc.strip()

            # Try og:description
            og_desc = await page.get_attribute('meta[property="og:description"]', 'content')
            if og_desc:
                return og_desc.strip()
        except:
            pass

        return ""

    async def _extract_author(self, page) -> str:
        """Extract author information"""
        author_selectors = [
            '[rel="author"]',
            '.author',
            '.byline',
            '[class*="author"]',
            '[class*="byline"]'
        ]

        for selector in author_selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    author = await element.text_content()
                    if author and len(author.strip()) > 2:
                        return author.strip()
            except:
                continue

        return ""

    async def _extract_publish_date(self, page) -> str:
        """Extract publication date"""
        date_selectors = [
            'time[datetime]',
            'meta[property="article:published_time"]',
            '[class*="date"]',
            '.publish-date'
        ]

        for selector in date_selectors:
            try:
                if selector.startswith('meta'):
                    date = await page.get_attribute(selector, 'content')
                else:
                    element = await page.query_selector(selector)
                    if element:
                        # Try datetime attribute first
                        date = await element.get_attribute('datetime')
                        if not date:
                            date = await element.text_content()

                if date and len(date.strip()) > 5:
                    return date.strip()
            except:
                continue

        return ""

    def _clean_content(self, content: str) -> str:
        """Clean extracted content"""
        if not content:
            return ""

        lines = content.split('\n')
        cleaned_lines = []

        # Patterns to skip (only obvious UI noise, NOT paywall indicators)
        # Don't skip 'subscribe' - validator needs to see it for paywall detection
        skip_patterns = [
            'cookie', 'privacy policy', 'terms of service',
            'newsletter', 'follow us',
            'share', 'tweet', 'facebook', 'linkedin',
            'advertisement', 'sponsored'
        ]

        for line in lines:
            line = line.strip()

            # Skip very short lines
            if len(line) < 10:
                continue

            # Skip lines that are mostly noise (only for short lines)
            if len(line) < 100:
                if any(pattern in line.lower() for pattern in skip_patterns):
                    continue

            cleaned_lines.append(line)

        return '\n\n'.join(cleaned_lines)

    async def _capture_screenshot(self, page) -> bytes:
        """
        Capture screenshot of the page for forensic evidence
        Tries to focus on main content, falls back to full page
        """
        try:
            # Try to screenshot main content area
            content_selectors = ['main', 'article', '[role="main"]', '.article-body', '.story-body']

            for selector in content_selectors:
                try:
                    element = page.locator(selector).first()
                    if await element.is_visible(timeout=2000):
                        screenshot_bytes = await element.screenshot(timeout=5000)
                        print(f"📸 Content-focused screenshot captured ({len(screenshot_bytes)} bytes)")
                        return screenshot_bytes
                except:
                    continue

            # Fallback to full page screenshot
            screenshot_bytes = await page.screenshot(full_page=True, timeout=10000)
            print(f"📸 Full-page screenshot captured ({len(screenshot_bytes)} bytes)")
            return screenshot_bytes

        except Exception as e:
            print(f"❌ Screenshot failed: {e}")
            return None

    async def _extract_canonical_url(self, page) -> str:
        """
        Extract canonical URL from page metadata or clean the current URL

        Strategy:
        1. Try <link rel="canonical"> tag (publisher's official canonical URL)
        2. Try og:url meta tag
        3. Fallback: strip tracking parameters from current URL
        """
        try:
            # Method 1: <link rel="canonical" href="...">
            canonical = await page.get_attribute('link[rel="canonical"]', 'href')
            if canonical:
                print(f"📎 Canonical URL from <link>: {canonical}")
                return canonical

            # Method 2: <meta property="og:url">
            og_url = await page.get_attribute('meta[property="og:url"]', 'content')
            if og_url:
                print(f"📎 Canonical URL from og:url: {og_url}")
                return og_url

        except:
            pass

        # Method 3: Fallback - strip tracking parameters
        current_url = page.url
        cleaned_url = self._strip_tracking_params(current_url)
        if cleaned_url != current_url:
            print(f"📎 Canonical URL (cleaned): {cleaned_url}")
        return cleaned_url

    def _strip_tracking_params(self, url: str) -> str:
        """
        Strip common tracking/marketing parameters from URL

        Generic approach - removes widely used tracking params across all sites
        """
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        # Common tracking parameters to remove (site-agnostic)
        tracking_params = {
            # UTM parameters (Google Analytics, common across all sites)
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            # Facebook/Social
            'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
            # Google
            'gclid', 'gclsrc', 'dclid',
            # Analytics/Tracking
            'mc_cid', 'mc_eid',  # Mailchimp
            '_hsenc', '_hsmi',    # HubSpot
            'mkt_tok',            # Marketo
            # Referral tracking
            'ref', 'referrer', 'source',
            # Session/Click tracking
            'click_id', 'clickid', 'sid', 'sessionid',
            # Newsletter/Email
            'newsletter_id', 'email_id',
            # Misc
            'share', 'platform'
        }

        # Remove tracking parameters
        cleaned_params = {k: v for k, v in params.items() if k not in tracking_params}

        # Rebuild URL
        cleaned_query = urlencode(cleaned_params, doseq=True)
        cleaned = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            cleaned_query,
            ''  # Remove fragment
        ))

        return cleaned

# Global instance
web_extractor = UniversalWebExtractor()