# Neo4j Artifact Pattern - Multiple Labels

**Issue**: Stories can have different types of artifacts (Page, File, Image, Video), but we need a unified way to query them.

**Solution**: Use Neo4j's multiple label feature with a base `Artifact` label.

---

## 🎯 Recommended Pattern

### All artifact types inherit from `Artifact` label:

```cypher
// Current
(page:Page)

// Future-proof
(page:Page:Artifact)
(file:File:Artifact)
(image:Image:Artifact)
(video:Video:Artifact)
```

### Then queries work universally:

```cypher
// Get all artifacts regardless of type
MATCH (story:Story)-[:HAS_ARTIFACT]->(artifact:Artifact)
RETURN count(artifact)

// Get only pages
MATCH (story:Story)-[:HAS_ARTIFACT]->(page:Page:Artifact)
RETURN count(page)

// Get only images
MATCH (story:Story)-[:HAS_ARTIFACT]->(image:Image:Artifact)
RETURN count(image)
```

---

## 🔧 Migration Steps

### 1. Update Extraction Service Schema

**File**: `here-extraction-service/NEO4J_SCHEMA.md`

```markdown
### Artifact (Base Label)
All artifact types (Page, File, Image, Video) inherit this label

### Page:Artifact
Web articles/documents
```

### 2. Update Page Creation in Extraction Service

**File**: `here-extraction-service/services/neo4j_store.py`

```python
# OLD
CREATE (p:Page {url: $url, title: $title, ...})

# NEW - Add Artifact label
CREATE (p:Page:Artifact {url: $url, title: $title, ...})
```

### 3. Add Migration Query (One-time)

```cypher
// Add Artifact label to all existing Page nodes
MATCH (p:Page)
SET p:Artifact
RETURN count(p) as updated_pages
```

### 4. Update Web App Queries

**File**: `hn4/services/neo4j_client.py`

```python
# Use base Artifact label
OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
```

---

## 📊 Future Artifact Types

### File:Artifact
```cypher
CREATE (f:File:Artifact {
  url: "https://example.com/document.pdf",
  filename: "report.pdf",
  file_type: "pdf",
  size_bytes: 1024000,
  created_at: datetime()
})
```

### Image:Artifact
```cypher
CREATE (i:Image:Artifact {
  url: "https://example.com/photo.jpg",
  filename: "evidence.jpg",
  width: 1920,
  height: 1080,
  format: "jpeg",
  created_at: datetime()
})
```

### Video:Artifact
```cypher
CREATE (v:Video:Artifact {
  url: "https://youtube.com/watch?v=...",
  title: "Interview Video",
  duration_seconds: 300,
  platform: "youtube",
  created_at: datetime()
})
```

---

## ✅ Implementation Plan

### Phase 1: Add Artifact Label to Pages (Now)
```cypher
// 1. Add label to existing pages
MATCH (p:Page)
SET p:Artifact
RETURN count(p)

// 2. Update extraction service to create Page:Artifact
// File: here-extraction-service/services/neo4j_store.py
```

### Phase 2: Update Web App Query (Now)
```python
# Change from:
OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(page:Page)

# To:
OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
```

### Phase 3: Add New Artifact Types (Future)
- Implement File upload → create File:Artifact
- Implement Image extraction → create Image:Artifact
- Implement Video links → create Video:Artifact

---

## 🎨 Query Examples

### Count All Artifacts
```cypher
MATCH (story:Story)-[:HAS_ARTIFACT]->(artifact:Artifact)
RETURN story.topic as title, count(artifact) as total_artifacts
```

### Count by Type
```cypher
MATCH (story:Story)-[:HAS_ARTIFACT]->(artifact:Artifact)
RETURN story.topic as title,
       count(CASE WHEN artifact:Page THEN 1 END) as pages,
       count(CASE WHEN artifact:File THEN 1 END) as files,
       count(CASE WHEN artifact:Image THEN 1 END) as images,
       count(CASE WHEN artifact:Video THEN 1 END) as videos
```

### Get Cover Image (prioritize Image artifacts)
```cypher
MATCH (story:Story)-[:HAS_ARTIFACT]->(artifact:Artifact)
RETURN story.topic,
       // Prefer Image:Artifact, fallback to Page thumbnail
       coalesce(
         head([i IN collect(artifact) WHERE i:Image | i.url]),
         head([p IN collect(artifact) WHERE p:Page AND p.thumbnail_url IS NOT NULL | p.thumbnail_url])
       ) as cover_image
```

---

## 🚀 Immediate Action

**Option A: Proper Solution (Recommended)**
1. Run migration query to add `Artifact` label to existing Pages
2. Update extraction service to create `Page:Artifact`
3. Update web app query to use `artifact:Artifact`

**Option B: Quick Fix (Temporary)**
1. Keep current fix using `page:Page`
2. Plan proper migration for next sprint
3. Document technical debt

---

**Recommendation**: Go with Option A now - it's only a few changes and future-proofs the schema!
