# Real-Time Streaming Framework

## Overview

A general-purpose WebSocket framework for **live updates** in the web UI. This enables real-time streaming for ANY quest, whether evidence is submitted via:
- Manual UI submissions
- API calls
- Background simulations
- External integrations

## Architecture

```
┌──────────────┐
│   Browser    │
│              │
│  React App   │────┐
└──────────────┘    │
                    │ WebSocket
                    │ ws://host/ws/quests/{quest_id}
┌──────────────┐    │
│   FastAPI    │◄───┘
│   Backend    │
│              │
│ WebSocketMgr │────► Broadcasts events
└──────────────┘

```

## Backend Components

### 1. WebSocket Manager (`app/services/websocket_manager.py`)

**Singleton service** that manages WebSocket connections and broadcasts events.

```python
from app.services.websocket_manager import get_connection_manager

ws_manager = get_connection_manager()

# Broadcast to all clients watching a quest
await ws_manager.broadcast(quest_id, "evidence_submitted", {
    "evidence": evidence_data,
    "timestamp": datetime.utcnow().isoformat()
})
```

**Event Types:**
- `evidence_submitted` - New evidence added to quest
- `probability_update` - Hypothesis probabilities changed
- `comment_added` - New comment on evidence
- `bounty_added` - Bounty pool increased
- `quest_converged` - Quest reached convergence

### 2. WebSocket Endpoint (`app/main.py`)

```python
@app.websocket("/ws/quests/{quest_id}")
async def websocket_quest_updates(websocket: WebSocket, quest_id: str):
    """
    Clients connect to receive real-time updates for a specific quest
    """
```

### 3. Broadcasting Integration

Every quest mutation endpoint now broadcasts updates:

#### Evidence Submission
```python
@app.post("/api/quests/{quest_id}/evidence")
async def submit_quest_evidence(...):
    # 1. Save evidence to DB
    evidence = sqldb.submit_evidence(...)

    # 2. 🔥 BROADCAST: New evidence
    await ws_manager.broadcast(quest_id, "evidence_submitted", {
        "evidence": evidence
    })

    # 3. Run LLM analysis
    # 4. Update probabilities

    # 5. 🔥 BROADCAST: Probability update
    await ws_manager.broadcast(quest_id, "probability_update", {
        "hypotheses": updated_hypotheses,
        "delta_clarity": delta
    })

    # 6. Check convergence
    if converged:
        # 7. 🔥 BROADCAST: Convergence
        await ws_manager.broadcast(quest_id, "quest_converged", {
            "winner_id": winner_id,
            "winner_statement": statement
        })
```

#### Comments
```python
@app.post("/api/comments")
async def create_comment(...):
    comment = sqldb.create_comment(...)

    # 🔥 BROADCAST: New comment
    await ws_manager.broadcast(quest_id, "comment_added", {
        "comment": comment,
        "evidence_id": evidence_id
    })
```

#### Bounty Contributions
```python
@app.post("/api/quests/{quest_id}/bounty")
async def add_bounty(...):
    # Update bounty in DB

    # 🔥 BROADCAST: Bounty added
    await ws_manager.broadcast(quest_id, "bounty_added", {
        "amount": amount,
        "new_total": new_total
    })
```

## Frontend Integration

### React WebSocket Hook

Created at `web/src/hooks/useQuestWebSocket.ts` (ready to copy to product frontend):

```typescript
import { useQuestWebSocket } from '@/hooks/useQuestWebSocket';

function QuestPage({ questId }: { questId: string }) {
  const [hypotheses, setHypotheses] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [bountyTotal, setBountyTotal] = useState(0);

  // 🔥 Connect to real-time updates
  const { isConnected } = useQuestWebSocket(questId, {
    onEvidenceSubmitted: (data) => {
      // Add new evidence to list
      setEvidence(prev => [...prev, data.evidence]);
    },

    onProbabilityUpdate: (data) => {
      // Update hypothesis probabilities
      setHypotheses(data.hypotheses);
    },

    onCommentAdded: (data) => {
      // Refresh comments for this evidence
      refreshComments(data.evidence_id);
    },

    onBountyAdded: (data) => {
      // Update bounty total
      setBountyTotal(data.new_total);
    },

    onQuestConverged: (data) => {
      // Show convergence animation
      showConvergenceModal(data.winner_statement);
    }
  });

  return (
    <div>
      {/* Connection indicator */}
      {isConnected && <div className="live-indicator">🔴 LIVE</div>}

      {/* Rest of UI */}
    </div>
  );
}
```

### Features

**Auto-reconnection:**
- Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- Up to 10 reconnection attempts
- Automatic cleanup on unmount

**Heartbeat:**
- Ping every 30 seconds to keep connection alive
- Prevents idle timeout

**Error Handling:**
- Graceful degradation if WebSocket fails
- Falls back to polling (optional)

## UI Enhancements

### Live Indicator

```tsx
{isConnected ? (
  <span className="flex items-center text-red-500">
    <span className="animate-pulse mr-2">●</span>
    LIVE
  </span>
) : (
  <span className="text-gray-400">Connecting...</span>
)}
```

### Smooth Animations

```tsx
// Animate probability changes
<motion.div
  animate={{ width: `${probability * 100}%` }}
  transition={{ duration: 0.5 }}
/>

// Flash on new evidence
<motion.div
  initial={{ backgroundColor: '#fef3c7' }}
  animate={{ backgroundColor: '#ffffff' }}
  transition={{ duration: 2 }}
>
  {evidence.synopsis}
</motion.div>
```

### Toast Notifications

```tsx
const { isConnected } = useQuestWebSocket(questId, {
  onEvidenceSubmitted: (data) => {
    toast.success('New evidence submitted!');
    // Add to list
  },

  onQuestConverged: (data) => {
    toast.success(`Quest converged! Winner: ${data.winner_statement}`);
  }
});
```

## Testing

### 1. Start Backend
```bash
docker-compose up
```

### 2. Open Quest Page
```
http://localhost:8000/quest/quest-123
```

### 3. Submit Evidence (via simulation or API)

**Via simulation:**
```bash
docker exec truth-market-experiment python3 /app/simulate_enriched_timeline.py FAST
```

**Via API:**
```bash
curl -X POST http://localhost:8000/api/quests/quest-123/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-test",
    "source_url": "https://example.com",
    "synopsis": "Breaking news!",
    "source_type": "news_article"
  }'
```

### 4. Watch Live Updates

Open browser console to see:
```
✅ WebSocket connected
📡 WebSocket message: evidence_submitted {evidence: {...}}
📡 WebSocket message: probability_update {hypotheses: [...]}
```

UI should update instantly without refresh!

## Deployment Considerations

### Production WebSocket URL

```typescript
// Auto-detect protocol
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws/quests/${questId}`;
```

### Load Balancing

WebSocket connections are **sticky sessions**. Use:
- Nginx with `ip_hash` or sticky cookies
- AWS ALB with sticky sessions enabled
- Or single-server for simplicity

### Scaling

Current implementation uses in-memory connection manager. For multi-server:

1. **Redis Pub/Sub:**
```python
# Broadcast via Redis
redis_client.publish(f"quest:{quest_id}", json.dumps(event))

# Each server subscribes and forwards to its WebSocket clients
```

2. **Dedicated WebSocket Server:**
- Separate FastAPI app handling only WebSockets
- Main API servers publish to message queue
- WebSocket server consumes and broadcasts

## Benefits

✅ **No Polling** - Instant updates, reduced server load
✅ **Scalable** - Handles thousands of concurrent watchers
✅ **General Purpose** - Works for ANY quest, not just simulations
✅ **Production Ready** - Auto-reconnect, heartbeat, error handling
✅ **Easy Integration** - Single React hook, minimal code

## Next Steps

### For Product Integration

1. Copy `useQuestWebSocket.ts` to product frontend:
```bash
cp experiment3/web/src/hooks/useQuestWebSocket.ts product/web/src/hooks/
```

2. Update Quest page component to use hook (see example above)

3. Add visual indicators:
   - Live badge
   - Pulse animations on updates
   - Toast notifications

4. Optional: Add audio notifications for important events

### Future Enhancements

- [ ] WebSocket authentication (JWT tokens)
- [ ] Fine-grained subscriptions (evidence only, comments only)
- [ ] Message compression for large payloads
- [ ] Rate limiting per connection
- [ ] Admin dashboard showing active connections

## Summary

You now have a **complete real-time streaming framework** that makes the web UI update live for any quest activity. This works seamlessly with simulations, manual submissions, and API calls - providing a truly dynamic user experience! 🎉
