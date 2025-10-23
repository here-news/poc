# HN4 Services Architecture

## Overview

> **Status**
>
> The runtime pipeline (extraction, cleaning, entity resolution, semantization,
> persistence) now lives in the Cloud Run deployment housed at
> `../story-engine-here`. This document remains as contract-level
> documentation for how HN4 interacts with that service (Pub/Sub topics,
> Firestore documents, GCS artifacts). The Python modules alongside this file
> are deprecated snapshots preserved for reference only.

The HN4 service pipeline extracts, validates, and semantically analyzes web content through a multi-stage processing chain. The architecture is designed to be **site-agnostic**, working across any news website without hardcoded site-specific logic.

## System Flow

```
User Request (URL)
    ↓
server.py (FastAPI)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Extraction (Cloud Run worker: universal extractor) │
│ - Load page with Playwright (anti-bot bypass)               │
│ - Extract all visible text + metadata                       │
│ - Capture screenshot for forensic evidence                  │
│ - Extract canonical URL (strip tracking params)             │
│ Output: WebPageResult (raw extraction)                      │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Validation & Cleaning (Cloud Run worker)           │
│ - LLM-based content cleaning (GPT-4o-mini)                  │
│ - Remove navigation, footers, sidebars                      │
│ - Extract/correct metadata (author, date, title)            │
│ - Flag quality issues (paywall, short content, etc.)        │
│ Output: ValidationResult (cleaned + flags)                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Persistence (Cloud Run worker)                     │
│ - Generate deterministic UUID from canonical URL            │
│ - Store artifacts in GCS bucket (here_news)                 │
│   - screenshot.png (visual evidence)                        │
│   - content.json (structured data)                          │
│   - content.md (human-readable)                             │
│   - metadata.json (retrieval index)                         │
│ Output: GCS paths                                           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Semantic Analysis (Cloud Run worker)               │
│ - LLM-based claim extraction (GPT-4o)                       │
│ - Extract atomic claims with WHO/WHERE/WHEN entities        │
│ - Apply 6-layer premise filter (gatekeeper)                 │
│ - Segregate admitted vs excluded claims                     │
│ Output: Claims + exclusion reasons                          │
└─────────────────────────────────────────────────────────────┘
    ↓
User receives: Cleaned content + flags + claims + GCS paths
```

## Service Components

### 1. server.py (FastAPI Backend)

**Role**: HTTP API layer and orchestration

**Endpoints**:
- `POST /api/extract` - Submit URL for extraction (returns task_id)
- `GET /api/task/{task_id}` - Poll task status and results
- `POST /api/task/{task_id}/clean` - Trigger validation/cleaning
- `POST /api/task/{task_id}/semantize` - Extract semantic claims

**Key Responsibilities**:
- Background task management via `extraction_manager`
- Service orchestration (calls extractor → validator → GCS → analyzer)
- Token usage tracking
- Error handling and status reporting

**Service Dependencies**:
```python
from services.extraction_manager import extraction_manager
from services.universal_web_extractor import web_extractor
from services.content_validator import content_validator
from services.semantic_analyzer import semantic_analyzer
from services.gcs_persistence import initialize_gcs_persistence
```

---

### 2. extraction_manager.py _(legacy)_

> Legacy module retained for documentation. The live task coordinator runs in
> Cloud Run within `story-engine-here`.

**Role**: In-memory task state management

**Data Structure**:
```python
class ExtractionTask:
    task_id: str              # UUID for this extraction job
    url: str                  # Original URL
    status: TaskStatus        # PENDING/PROCESSING/COMPLETED/FAILED
    result: Dict              # Extraction result (JSON-serializable)
    screenshot_bytes: bytes   # Binary PNG data (separate from result)
    token_costs: Dict         # Track API usage by stage
    gcs_paths: Dict          # GCS artifact locations
    user_id: Optional[str]   # Stable user identifier
    created_at: datetime
    completed_at: datetime
```

**Methods**:
- `create_task(url, user_id=None)` - Initialize new extraction tied to a user
- `get_task(task_id)` - Retrieve task state
- `update_task_status()` - Update progress
- `set_task_result()` - Store extraction output
- `add_token_cost()` - Track LLM usage
- `set_gcs_paths()` - Store GCS artifact paths

**Design Notes**:
- In-memory only (no persistence)
- Thread-safe task registry
- Separates binary data (screenshots) from JSON-serializable results

---

### 3. universal_web_extractor.py _(legacy)_

> Legacy reference; the active Playwright-based extractor lives in the Cloud Run
> service.

**Role**: Universal web page content extraction

**Key Features**:

#### Anti-Bot Detection Bypass
- Headless Chromium with stealth configuration
- JavaScript injection to remove automation signals:
  - `navigator.webdriver = false`
  - Mock `navigator.plugins`, `navigator.languages`
  - Add `window.chrome` object
- Realistic browser fingerprinting (User-Agent, viewport, headers)
- Random human-like delays (1-5 seconds)

#### Content Extraction Strategy
1. Load page completely (wait for dynamic content)
2. Handle cookie consent dialogs
3. Extract all visible text via `document.body.innerText`
4. Extract metadata (title, author, publish date, description)
5. Capture screenshot (main content or full page)
6. Detect CAPTCHA/blocks (only when no content present)

#### Canonical URL Extraction
```python
Priority:
1. <link rel="canonical" href="..."> (publisher's canonical)
2. <meta property="og:url"> (social sharing)
3. Strip tracking params (fallback)
```

**Site-Agnostic Design**:
- No hardcoded selectors for specific sites
- Generic patterns for metadata extraction
- Universal content cleaning (removes common UI noise)

**Output**: `WebPageResult`
```python
{
  "url": "original URL",
  "canonical_url": "cleaned URL without tracking params",
  "domain": "example.com",
  "title": "extracted title",
  "author": "extracted author (may be incomplete)",
  "publish_date": "extracted date (may be incorrect)",
  "content_text": "all visible text",
  "word_count": 544,
  "reading_time_minutes": 2.7,
  "is_readable": true,
  "status": "readable|captcha_blocked|empty",
  "screenshot_bytes": b"PNG binary data",
  "extraction_timestamp": "ISO datetime",
  "processing_time_ms": 16162
}
```

---

### 4. content_validator.py _(legacy)_

> Legacy reference; validation now runs inside the Cloud Run workers.

**Role**: LLM-based content cleaning and quality flagging

**Model**: GPT-4o-mini (cost-effective)

**Two-Phase Validation**:

#### Phase 1: LLM Cleaning
```python
Prompt instructs LLM to:
1. Remove navigation, footers, sidebars, related articles
2. Extract exact publish date/time from content text
3. Extract author(s) - handle single and multiple authors
4. Validate metadata coherence
5. Create concise summary
6. Return flags for quality issues
```

#### Phase 2: Programmatic Verification
```python
_verify_and_add_flags():
- Word count check (< 300 words → short_content)
- Paywall pattern detection (subscribe, subscription, etc.)
- Author fallback extraction (regex patterns)
- Empty content check (< 50 words)
```

**Flag-Based Philosophy**:
- **Never reject content** - always return `is_valid=true`
- Use flags to signal issues for editorial review
- Transparent filtering vs binary rejection

**Quality Flags**:
```python
{
  "paywall_detected": "Subscribe/subscription language found",
  "short_content": "< 300 words after cleaning",
  "empty_content": "< 50 words (likely extraction failure)",
  "metadata_date_mismatch": "Metadata date differs from content date",
  "no_author": "No author in content or metadata",
  "navigation_heavy": "Excessive UI elements",
  "anti_bot": "Bot detection message",
  "error_page": "403/404 content",
  "validation_error": "LLM validation failed"
}
```

**Author Extraction Fallback** (site-agnostic regex):
```python
Pattern 1: Name before "Published:" or "Posted:"
Pattern 2: After "By" (handles comma-separated multiple authors)
Pattern 3: After "Written by" or "Author:"
Pattern 4: Multiple consecutive lines with proper names (USA Today style)

+ Name validation:
- Reject false positives ("shutdown T", "Live Updates")
- Require 2+ name parts (first + last)
- Exclude common words (shutdown, update, breaking, etc.)
```

**Output**: `ValidationResult`
```python
{
  "is_valid": true,
  "reason": "brief quality assessment",
  "flags": ["paywall_detected", "short_content"],
  "cleaned_data": {
    "title": "cleaned title",
    "author": "María Luisa Paúl",
    "publish_date": "October 3, 2025 at 2:58 p.m. EDT",
    "meta_description": "concise summary"
  },
  "cleaned_content": "main article text only",
  "token_usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801,
    "model": "gpt-4o-mini"
  }
}
```

---

### 5. gcs_persistence.py _(legacy)_

> Legacy reference; persistence now runs inside the Cloud Run workers.

**Role**: Forensic evidence storage in Google Cloud Storage

**Bucket**: `gs://here_news/`

**Storage Structure**:
```
domains/
  {domain}/
    {deterministic-uuid}/
      screenshot.png      # Visual snapshot
      content.json        # Structured data
      content.md          # Human-readable markdown
      metadata.json       # Retrieval index
```

**Deterministic UUID Generation**:
```python
# Uses UUID5 (SHA-1 hash) for consistency
uuid5(NAMESPACE_URL, canonical_url)

Benefits:
- Same article → same UUID (idempotent uploads)
- Deduplication across share links
- Predictable GCS paths
```

**Artifacts Stored**:

1. **screenshot.png** - Page visual at extraction time
2. **content.json** - Full structured data
   ```json
   {
     "url": "...",
     "canonical_url": "...",
     "title": "...",
     "author": "...",
     "publish_date": "...",
     "content_text": "...",
     "word_count": 544
   }
   ```
3. **content.md** - Human-readable format
   ```markdown
   # {title}
   **Author:** {author}
   **Published:** {publish_date}
   **Source:** [{domain}]({url})
   ---
   {content_text}
   ```
4. **metadata.json** - Lightweight index for retrieval

**Non-Blocking Design**:
- GCS failures don't break extraction flow
- Try/except wrapper in server.py
- Logs warnings but continues processing

**Output**: GCS paths
```python
{
  "artifact_id": "f2c07c6e-2478-507e-9b34-b5434053f443",
  "domain": "washingtonpost.com",
  "screenshot_path": "gs://here_news/domains/...",
  "content_json_path": "gs://here_news/domains/...",
  "content_md_path": "gs://here_news/domains/...",
  "metadata_path": "gs://here_news/domains/..."
}
```

---

### 6. semantic_analyzer.py _(legacy)_

> Legacy reference; semantic analysis now runs inside the Cloud Run workers.

**Role**: Extract atomic claims with entity metadata

**Model**: GPT-4o (higher quality for semantic analysis)

**Claim Structure**:
```python
{
  "text": "The U.S. military attacked a boat off Venezuela",
  "who": [
    "U.S. military:government_agency",
    "boat crew:unknown"
  ],
  "where": [
    "Venezuela:country",
    "Caribbean Sea:waterbody"
  ],
  "when": {
    "date": "2025-10-03",
    "time": "unknown",
    "timezone": "unknown"
  },
  "modality": "reported_claim",
  "evidence_references": ["Hegseth statement", "official report"],
  "confidence": 0.85
}
```

**6-Layer Premise Filter (Gatekeeper)**:

Claims must pass all checks to be admitted:

1. **Attribution** - Named source required (WHO field)
2. **Temporal Context** - Event time required (WHEN field)
3. **Modality Clarity** - Must be: official_fact, reported_claim, allegation, or opinion
4. **Evidence Signal** - Must reference artifacts/sources
5. **Hedging Filter** - Reject vague language ("reportedly", "allegedly" without attribution)
6. **Controversy Guard** - Criminal claims require `official_fact` modality

**Claim Segregation**:
```python
{
  "claims": [...],              # Admitted claims (passed gatekeeper)
  "excluded_claims": [          # Failed claims with reasons
    {
      "text": "...",
      "exclusion_reason": "Attribution: No named source (WHO)"
    }
  ],
  "token_usage": {...}
}
```

**Output**: Semantic analysis result
```python
{
  "claims": [list of admitted claims],
  "excluded_claims": [list with exclusion reasons],
  "total_claims_extracted": 12,
  "total_claims_admitted": 8,
  "total_claims_excluded": 4,
  "token_usage": {
    "prompt_tokens": 3456,
    "completion_tokens": 2789,
    "total_tokens": 6245,
    "model": "gpt-4o"
  }
}
```

---

## Data Flow Example

### Request: Extract Washington Post Article

**1. Initial Request**
```
POST /api/extract
{
  "url": "https://www.washingtonpost.com/immigration/2025/10/03/mario-guevara-deported-elsalvador-journalist/?utm_campaign=wp_main&utm_source=threads&utm_medium=social"
}

Response:
{
  "task_id": "4c82e61a-06ad-4929-b26a-f4b71e05e49a",
  "status": "submitted"
}
```

**2. Background Extraction**
```python
extract_url_background():
  1. extraction_manager.update_task_status(PROCESSING)
  2. web_extractor.extract_page(url)
     - Canonical URL: https://www.washingtonpost.com/immigration/2025/10/03/mario-guevara-deported-elsalvador-journalist/
     - Content: 544 words
     - Author: María Luisa Paúl
     - Screenshot: PNG bytes
  3. extraction_manager.set_task_result(result.to_dict())
  4. extraction_manager.update_task_status(COMPLETED)
```

**3. Cleaning Request**
```
POST /api/task/{task_id}/clean

Process:
  1. content_validator.validate_extraction(task.result)
     - LLM cleaning: 544 → 99 words (paywall removed most content)
     - Author: María Luisa Paúl (validated)
     - Flags: ["paywall_detected", "short_content", "metadata_date_mismatch"]
  2. gcs_persistence.persist_extraction(...)
     - UUID: f2c07c6e-2478-507e-9b34-b5434053f443 (deterministic from canonical URL)
     - Stored: screenshot.png, content.json, content.md, metadata.json
  3. extraction_manager.add_token_cost("cleaning", 1801)
  4. extraction_manager.set_gcs_paths(task_id, paths)

Response:
{
  "is_valid": true,
  "flags": ["paywall_detected", "short_content", "metadata_date_mismatch"],
  "cleaned_data": {
    "author": "María Luisa Paúl",
    "publish_date": "October 3, 2025 at 2:58 p.m. EDT"
  },
  "result": {...}  # Updated task result
}
```

**4. Semantization Request**
```
POST /api/task/{task_id}/semantize

Process:
  1. semantic_analyzer.extract_enhanced_claims(...)
     - Extracted: 5 claims
     - Admitted: 3 claims (passed gatekeeper)
     - Excluded: 2 claims (failed attribution check)
  2. extraction_manager.set_semantic_data(task_id, result)
  3. extraction_manager.add_token_cost("semantization", 6245)

Response:
{
  "claims": [3 admitted claims],
  "excluded_claims": [2 with reasons],
  "claims_count": 3,
  "excluded_count": 2
}
```

---

## Design Principles

### 1. Site-Agnostic Architecture
- **No hardcoded site selectors** - Uses generic patterns
- **Universal extraction** - Works across any site structure
- **Pattern-based detection** - Paywall, CAPTCHA, author extraction via universal heuristics

### 2. Transparent Filtering
- **Flag-based validation** - Never reject, always flag issues
- **Segregated claims** - Show both admitted and excluded claims with reasons
- **Forensic evidence** - Store original extractions even if flawed

### 3. Deterministic Storage
- **UUID5 from canonical URL** - Same article → same UUID
- **Canonical URL extraction** - Respect publisher's canonical + strip tracking
- **Idempotent uploads** - Re-extracting same article overwrites (no versioning)

### 4. Layered Quality Control
- **Stage 1 (Extractor)**: Cloud Run worker that captures raw page artifacts
- **Stage 2 (Validator)**: Cloud Run worker that cleans text and flags issues
- **Stage 3 (Persistence)**: Cloud Run worker that writes to GCS/Firestore
- **Stage 4 (Analyzer)**: Cloud Run worker that emits claims/entities

### 5. Cost Optimization
- **GPT-4o-mini** for cleaning (cheap, sufficient quality)
- **GPT-4o** for semantic analysis (expensive, high quality needed)
- **Token tracking** per stage for cost visibility

---

## Error Handling Strategy

### Non-Blocking Failures
- GCS persistence failure → log warning, continue
- Screenshot capture failure → continue without screenshot
- LLM validation failure → flag as `validation_error`, continue

### Blocking Failures
- Page load timeout → return `status: error`
- CAPTCHA detected with no content → return `status: captcha_blocked`
- Invalid URL → return error immediately

### Retry Strategy
- No automatic retries (user can resubmit task_id)
- CAPTCHA blocks are permanent (anti-bot detection succeeded)

---

## Token Usage Tracking

```python
task.token_costs = {
  "cleaning": {
    "total_tokens": 1801,
    "model": "gpt-4o-mini"
  },
  "semantization": {
    "total_tokens": 6245,
    "model": "gpt-4o"
  }
}
```

Used for:
- Cost analysis per article
- Model performance benchmarking
- Budget alerts

---

## Future Enhancements

1. **Versioning**: Store multiple versions of same article over time
2. **Async semantization**: Queue claims extraction for batch processing
3. **Cache layer**: Redis for task state (replace in-memory)
4. **Webhook support**: Notify external systems on completion
5. **Advanced author extraction**: NER models for complex bylines
6. **Paywall bypass**: Cookie injection, archive.org fallback
