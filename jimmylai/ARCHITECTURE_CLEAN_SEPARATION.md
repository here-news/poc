# Truth Market: Clean Architecture with Simulation-Driven Development

**Principle**: Simulation tests the system, NOT part of the system.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     SIMULATION LAYER                         │
│  Purpose: Test realistic user flows, validate services      │
│  Location: /tests/simulations/                              │
│  - jimmy_lai_simulation.py                                  │
│  - generic_quest_simulation.py                              │
│  - stress_test_simulation.py                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ (calls via HTTP/Python)
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER (FastAPI)                     │
│  Purpose: HTTP endpoints, request validation                │
│  Location: /app/main.py                                     │
│  - POST /api/quests                                         │
│  - POST /api/evidence                                       │
│  - GET /api/quests/{id}/status                             │
└─────────────────────────────────────────────────────────────┘
                            ↓ (delegates to)
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                            │
│  Purpose: Business logic, core algorithms                   │
│  Location: /app/services/                                   │
│  - quest_service.py                                         │
│  - evidence_service.py                                      │
│  - probability_service.py                                   │
│  - payout_service.py                                        │
│  - llm_service.py (existing)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ (uses)
┌─────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                          │
│  Purpose: Data persistence, queries                         │
│  Location: /app/repositories/                               │
│  - quest_repository.py                                      │
│  - evidence_repository.py                                   │
│  - hypothesis_repository.py                                 │
│  - payout_repository.py                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ (stores in)
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  Purpose: SQLite storage                                    │
│  Location: /data/truth_market.db                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Service Implementation Plan

### STEP 1: Create Service Interfaces
**Goal**: Define contracts before implementation

### STEP 2: Implement Probability Service
**Goal**: Core truth-seeking algorithm
**Test**: Run simulation, verify probabilities update correctly

### STEP 3: Implement Payout Service
**Goal**: Fair reward distribution
**Test**: Run simulation to convergence, verify payouts sum to 100%

### STEP 4: Implement Evidence Validation
**Goal**: Quality control
**Test**: Submit bad evidence in simulation, verify rejection

### STEP 5: Implement Convergence Detection
**Goal**: Automatic resolution
**Test**: Simulation should auto-resolve at 80% threshold

### STEP 6: End-to-End Integration
**Goal**: Full system working
**Test**: Jimmy Lai simulation completes start-to-finish

---

Let's begin with STEP 1...
