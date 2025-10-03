# HN4 - Web Content Extraction Prototype

A prototype web content extractor with AI-powered content validation and cleaning.

## Features

- **URL Extraction**: Extracts content from any URL using Playwright
- **AI Validation**: Uses GPT-4o-mini to validate and clean extracted content
- **Smart Cleaning**:
  - Extracts exact publish time from content
  - Removes navigation, footers, and sidebars
  - Focuses on main article content only
  - Validates metadata coherence

## Architecture

- **Backend**: FastAPI (Python) on port 9494
- **Frontend**: React + Vite + Tailwind CSS
- **Extraction**: Playwright (headless browser)
- **Validation**: OpenAI GPT-4o-mini

## Quick Start

### Using Docker (Recommended)

```bash
cd hn4
docker-compose up --build
```

Then open http://localhost:9494

### Local Development

1. **Install dependencies**:
```bash
npm install
pip install -r requirements.txt
playwright install chromium
```

2. **Build frontend**:
```bash
npm run build
```

3. **Run backend**:
```bash
python server.py
```

Then open http://localhost:9494

## Usage

1. **Extract URL**: Enter a URL in the homepage and click "Submit"
2. **View Content**: The extracted content appears on the result page
3. **Clean Content**: Click the green "Clean" button to:
   - Validate the content
   - Extract exact publish time from article
   - Remove navigation/footer/sidebar
   - Get focused, clean article content
4. **Semantize Content**: After cleaning, click the purple "Semantize" button to:
   - Extract atomic, citable claims with evidence
   - Identify named entities (people, organizations, locations)
   - Extract temporal context (WHO, WHERE, WHEN)
   - Generate one-sentence summary
   - Display confidence scores for each claim

## API Endpoints

- `POST /api/extract` - Submit URL for extraction
- `GET /api/task/{task_id}` - Get extraction status
- `POST /api/task/{task_id}/clean` - Validate and clean content
- `POST /api/task/{task_id}/semantize` - Extract semantic claims and entities

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - For content validation

## File Structure

```
hn4/
├── app/                    # React frontend
│   ├── App.tsx            # Router
│   ├── HomePage.tsx       # URL submission
│   └── ResultPage.tsx     # Content display + Clean button
├── services/
│   ├── universal_web_extractor.py   # Playwright extraction
│   ├── content_validator.py         # AI validation
│   ├── semantic_analyzer.py         # Claims extraction with NER
│   └── extraction_manager.py        # Task management
├── server.py              # FastAPI backend
├── Dockerfile             # Multi-stage build
└── docker-compose.yml     # Container setup
```
