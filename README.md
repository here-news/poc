# HERE.news - Global Real-Time Living News System

A global real-time living news system with AI-powered content analysis and community-driven story building.

> **Migration notice:** The live extraction/cleaning/entity-resolution pipeline now
> runs inside the Cloud Run project in `../story-engine-here`.
> This repo focuses on the FastAPI gateway, Firestore task
> coordination, and the React frontend. The Python modules under `services/` (other
> than `task_store.py` and `pubsub_publisher.py`) are legacy snapshots kept for
> reference only.

## Features

- **URL Extraction**: Extracts content from any URL using Playwright
- **AI Validation**: Uses GPT-4o-mini to validate and clean extracted content
- **Smart Cleaning**:
  - Extracts exact publish time from content
  - Removes navigation, footers, and sidebars
  - Focuses on main article content only
  - Validates metadata coherence

## Architecture

- **Backend**: FastAPI (Python) on port 9494, publishing jobs to Pub/Sub topics
- **Frontend**: React + Vite + Tailwind CSS
- **Pipeline**: Cloud Run service `story-engine-here` at
  `https://story-engine-here-179431661561.us-central1.run.app` (Playwright
  extraction, GPT-4o cleaning, entity resolution, semantic analysis)
- **Persistence**: Firestore for task tracking, Neo4j for knowledge graph, GCS for
  artifacts (managed by Cloud Run workers)

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
│   ├── App.tsx             # Router
│   ├── HomePage.tsx        # URL submission
│   └── ResultPage.tsx      # Task detail view (clean/semantize controls)
├── services/
│   ├── task_store.py       # Firestore-backed task persistence (active)
│   ├── pubsub_publisher.py # Pub/Sub client (active)
│   └── *.py                # Legacy pipeline snapshots (do not modify)
├── server.py               # FastAPI backend proxying to Cloud Run workers
├── Dockerfile              # Multi-stage build
└── docker-compose.yml      # Container setup
```
