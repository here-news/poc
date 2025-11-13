# Epistemic Interactive Mockup

**Interactive HTML mockup demonstrating all three layout patterns**

---

## 🚀 Quick Start

### Option 1: Open Directly (Simplest)
```bash
cd /media/im3/plus/lab4/re_news/apps/epistemic
open mockup.html  # macOS
xdg-open mockup.html  # Linux
start mockup.html  # Windows
```

### Option 2: Serve with Python
```bash
cd /media/im3/plus/lab4/re_news/apps/epistemic
python3 -m http.server 8888
# Open http://localhost:8888/mockup.html
```

### Option 3: Serve with Node
```bash
cd /media/im3/plus/lab4/re_news/apps/epistemic
npx serve
# Open http://localhost:3000/mockup.html
```

---

## 📁 Files

- `mockup.html` - Interactive mockup (single HTML file)
- `mockup-data.json` - Sample data (concerns, quests, evidence, users)
- `MOCKUP_README.md` - This file

---

## 🎯 What's Demonstrated

### **Three Layout Patterns**

1. **Entity-First Layout** (Person, Organization)
   - Click: "Who is Jimmy Lai?" or "What happened to OpenAI?"
   - Shows: Entity info → Knowledge graph → Active discussions → Timeline

2. **Quest-First Layout** (Quest)
   - Click: "Did Trump mention Jimmy Lai..."
   - Shows: Quest status → Hypotheses → Evidence timeline → Comments

3. **Hybrid Layout** (Story, Event)
   - Click: "Newly Released Emails..." or "US Mint Stops Penny..."
   - Shows: Story summary → Active quest preview → Entities → Discussion

### **Interactive Features**

✅ **Concerns Feed** - Browse different types of concerns (story, person, quest, event, poll, org)
✅ **Adaptive Layouts** - Each concern type gets appropriate layout
✅ **Evidence Timeline** - See epistemic value scores and community votes
✅ **Hypotheses Visualization** - Probability bars showing convergence
✅ **Comments Preview** - Top-voted comments displayed
✅ **Navigation** - Click quests from entity pages and vice versa

---

## 📊 Sample Data

### **Concerns** (6 items)
- Story: Trump-Epstein emails
- Person: Jimmy Lai
- Quest: Trump-Xi meeting
- Event: Penny production stopped
- Poll: Trump-Epstein allegations
- Org: OpenAI changes

### **Quests** (2 items)
- Trump-Epstein Connection (18 evidence, 2 hypotheses)
- Trump-Jimmy Lai mention (7 evidence, 3 hypotheses)

### **Evidence** (5 submissions)
- Flight logs, interviews, court documents
- Epistemic value scores (0.54 - 0.85)
- Community votes and comments

### **Users** (4 contributors)
- alice_chen (Expert, 8.5 rep)
- bob_investigator (Master, 9.2 rep)
- carol_reporter (Contributor, 7.9 rep)
- expert_analyst (Expert, 8.8 rep)

---

## 🎨 Design Highlights

### **Color Coding**
- 🔵 Indigo: Primary actions, active states
- 🟢 Green: Active quests, positive indicators
- 🟡 Amber: Polls, warnings
- ⚪ Gray: Neutral, secondary info

### **Typography**
- Headlines: Bold, 2xl
- Body: Regular, sm/base
- Metadata: Small, gray-600

### **Icons**
- 📰 Story
- 👤 Person
- 🎯 Quest
- 📅 Event
- 📊 Poll
- 🏢 Organization

---

## 🔧 Customization

### **Add New Concerns**

Edit `mockup-data.json`:
```json
{
  "concerns": [
    {
      "id": "concern-new-1",
      "type": "story",
      "title": "Your Title",
      "description": "Your description",
      "heat_score": 85.0,
      ...
    }
  ]
}
```

### **Add New Evidence**

```json
{
  "evidence": [
    {
      "id": "ev-new",
      "quest_id": "quest-1",
      "submitted_by": "user-bob",
      "synopsis": "Your evidence description",
      "epistemic_value": 0.75,
      ...
    }
  ]
}
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Entity Discovery**
1. Click "Who is Jimmy Lai?"
2. Read entity bio
3. Explore knowledge graph
4. See active quest: "Did Trump mention Jimmy Lai?"
5. Click quest to dive deeper

### **Scenario 2: Quest Investigation**
1. Click "Did Trump mention Jimmy Lai..."
2. See hypothesis probabilities
3. Read evidence timeline
4. Check comments
5. Understand convergence status

### **Scenario 3: Story to Quest**
1. Click "Newly Released Emails..."
2. Read story summary
3. See quest preview with hypothesis bars
4. Click "View Full Quest"
5. Navigate to evidence

### **Scenario 4: Poll to Quest Escalation**
1. Click poll: "Do you think Trump engaged..."
2. See divided results (52% vs 48%)
3. See escalation suggestion
4. Click "Escalate to Quest"

---

## 🐛 Known Limitations

- ⚠️ Static data (no backend)
- ⚠️ No real voting/submission
- ⚠️ Knowledge graph is placeholder
- ⚠️ No user authentication
- ⚠️ No real-time updates

This is a **design mockup** for UX validation, not a functional prototype.

---

## 💡 Feedback Questions

1. **Layout Priority:** Do entity pages show the right info first?
2. **Quest Clarity:** Are hypotheses and evidence easy to understand?
3. **Navigation:** Is it easy to move between concerns and quests?
4. **Visual Hierarchy:** What draws your eye first?
5. **Information Density:** Too much? Too little?

---

## 📝 Next Steps

After mockup review:
- [ ] Gather user feedback
- [ ] Refine layouts based on feedback
- [ ] Create high-fidelity designs (Figma)
- [ ] Begin Phase 1 implementation

---

**Questions?** See main design doc: `docs/DESIGN_v0.1.md`
