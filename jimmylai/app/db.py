"""
Simple file-based JSON database for the Truth Market.
Stores stories, cases, asks, answers, sources, and builders.
"""
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from .models import Story, Case, Ask, Answer, Source, Builder, ClarityEvent, ScopeResolution


class TruthMarketDB:
    """File-based JSON database"""

    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        self.stories_file = self.data_dir / "stories.json"
        self.sources_file = self.data_dir / "sources.json"
        self.builders_file = self.data_dir / "builders.json"

        self._init_files()

    def _init_files(self):
        """Initialize JSON files if they don't exist"""
        if not self.stories_file.exists():
            self._save_stories([])
        if not self.sources_file.exists():
            self._save_sources([])
        if not self.builders_file.exists():
            self._save_builders([])

    def _datetime_handler(self, obj):
        """JSON serializer for datetime objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    def _load_json(self, file_path: Path) -> list:
        """Load JSON from file"""
        with open(file_path, "r") as f:
            return json.load(f)

    def _save_json(self, file_path: Path, data: list):
        """Save JSON to file"""
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2, default=self._datetime_handler)

    # Stories
    def _load_stories(self) -> List[Story]:
        """Load all stories"""
        data = self._load_json(self.stories_file)
        return [Story(**s) for s in data]

    def _save_stories(self, stories: List[Story]):
        """Save all stories"""
        data = [s.model_dump() for s in stories]
        self._save_json(self.stories_file, data)

    def get_all_stories(self) -> List[Story]:
        """Get all stories"""
        return self._load_stories()

    def get_story(self, story_id: str) -> Optional[Story]:
        """Get a specific story"""
        stories = self._load_stories()
        for story in stories:
            if story.id == story_id:
                return story
        return None

    def create_story(self, story: Story) -> Story:
        """Create a new story"""
        stories = self._load_stories()
        stories.append(story)
        self._save_stories(stories)
        return story

    def update_story(self, story: Story) -> Story:
        """Update an existing story"""
        stories = self._load_stories()
        for i, s in enumerate(stories):
            if s.id == story.id:
                story.updated_at = datetime.utcnow()
                stories[i] = story
                self._save_stories(stories)
                return story
        raise ValueError(f"Story {story.id} not found")

    # Cases
    def get_case(self, story_id: str, case_id: str) -> Optional[Case]:
        """Get a specific case"""
        story = self.get_story(story_id)
        if story:
            for case in story.cases:
                if case.id == case_id:
                    return case
        return None

    def create_case(self, story_id: str, case: Case) -> Case:
        """Add a case to a story"""
        story = self.get_story(story_id)
        if not story:
            raise ValueError(f"Story {story_id} not found")
        story.cases.append(case)
        self.update_story(story)
        return case

    def update_case(self, story_id: str, case: Case) -> Case:
        """Update a case"""
        story = self.get_story(story_id)
        if not story:
            raise ValueError(f"Story {story_id} not found")
        for i, c in enumerate(story.cases):
            if c.id == case.id:
                case.updated_at = datetime.utcnow()
                story.cases[i] = case
                self.update_story(story)
                return case
        raise ValueError(f"Case {case.id} not found")

    # Asks
    def get_ask(self, story_id: str, case_id: str, ask_id: str) -> Optional[Ask]:
        """Get a specific ask"""
        case = self.get_case(story_id, case_id)
        if case:
            for ask in case.asks:
                if ask.id == ask_id:
                    return ask
        return None

    def create_ask(self, story_id: str, case_id: str, ask: Ask) -> Ask:
        """Create an ask within a case"""
        case = self.get_case(story_id, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")
        case.asks.append(ask)
        self.update_case(story_id, case)
        return ask

    def update_ask(self, story_id: str, case_id: str, ask: Ask) -> Ask:
        """Update an ask"""
        case = self.get_case(story_id, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")
        for i, a in enumerate(case.asks):
            if a.id == ask.id:
                ask.updated_at = datetime.utcnow()
                case.asks[i] = ask
                self.update_case(story_id, case)
                return ask
        raise ValueError(f"Ask {ask.id} not found")

    def add_clarity_event(self, story_id: str, case_id: str, ask_id: str, event: ClarityEvent):
        """Add a clarity event to track ΔClarity"""
        ask = self.get_ask(story_id, case_id, ask_id)
        if not ask:
            raise ValueError(f"Ask {ask_id} not found")
        ask.clarity_events.append(event)
        ask.clarity = event.clarity_after
        self.update_ask(story_id, case_id, ask)

    # Answers
    def create_answer(self, story_id: str, case_id: str, ask_id: str, answer: Answer) -> Answer:
        """Submit an answer to an ask"""
        ask = self.get_ask(story_id, case_id, ask_id)
        if not ask:
            raise ValueError(f"Ask {ask_id} not found")
        ask.answers.append(answer)

        # Create clarity event
        event = ClarityEvent(
            timestamp=datetime.utcnow(),
            clarity_before=ask.clarity,
            clarity_after=ask.clarity + answer.clarity_gain,
            delta=answer.clarity_gain,
            trigger="answer_submitted",
            builder_id=answer.builder_id,
        )
        ask.clarity_events.append(event)
        ask.clarity = event.clarity_after

        self.update_ask(story_id, case_id, ask)
        return answer

    # Sources
    def _load_sources(self) -> List[Source]:
        """Load all sources"""
        data = self._load_json(self.sources_file)
        return [Source(**s) for s in data]

    def _save_sources(self, sources: List[Source]):
        """Save all sources"""
        data = [s.model_dump() for s in sources]
        self._save_json(self.sources_file, data)

    def get_all_sources(self) -> List[Source]:
        """Get all sources"""
        return self._load_sources()

    def get_source(self, source_id: str) -> Optional[Source]:
        """Get a specific source"""
        sources = self._load_sources()
        for source in sources:
            if source.id == source_id:
                return source
        return None

    def create_source(self, source: Source) -> Source:
        """Create a new source"""
        sources = self._load_sources()
        sources.append(source)
        self._save_sources(sources)
        return source

    # Builders
    def _load_builders(self) -> List[Builder]:
        """Load all builders"""
        data = self._load_json(self.builders_file)
        return [Builder(**b) for b in data]

    def _save_builders(self, builders: List[Builder]):
        """Save all builders"""
        data = [b.model_dump() for b in builders]
        self._save_json(self.builders_file, data)

    def get_all_builders(self) -> List[Builder]:
        """Get all builders"""
        return self._load_builders()

    def get_builder(self, builder_id: str) -> Optional[Builder]:
        """Get a specific builder"""
        builders = self._load_builders()
        for builder in builders:
            if builder.id == builder_id:
                return builder
        return None

    def create_builder(self, builder: Builder) -> Builder:
        """Create a new builder"""
        builders = self._load_builders()
        builders.append(builder)
        self._save_builders(builders)
        return builder

    def update_builder(self, builder: Builder) -> Builder:
        """Update a builder"""
        builders = self._load_builders()
        for i, b in enumerate(builders):
            if b.id == builder.id:
                builders[i] = builder
                self._save_builders(builders)
                return builder
        raise ValueError(f"Builder {builder.id} not found")

    def fund_ask(self, story_id: str, case_id: str, ask_id: str, builder_id: str, amount: float):
        """Fund an ask bounty"""
        ask = self.get_ask(story_id, case_id, ask_id)
        if not ask:
            raise ValueError(f"Ask {ask_id} not found")

        builder = self.get_builder(builder_id)
        if not builder:
            raise ValueError(f"Builder {builder_id} not found")

        if builder.credits < amount:
            raise ValueError("Insufficient credits")

        # Deduct from builder
        builder.credits -= amount
        self.update_builder(builder)

        # Add to ask bounty
        ask.bounty += amount
        self.update_ask(story_id, case_id, ask)
