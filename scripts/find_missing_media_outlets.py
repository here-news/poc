#!/usr/bin/env python3
"""Find all media outlet entities that need to be created"""

import urllib.request
import urllib.parse
import json
import re
from collections import defaultdict

def find_missing_media_outlets():
    # Get all stories
    response = urllib.request.urlopen('http://localhost:7272/api/stories?limit=50')
    data = json.loads(response.read().decode())
    stories = data['stories']

    print(f'Scanning {len(stories)} stories for media outlet entities...\n')

    # Track media outlets mentioned in markup
    media_outlets_in_markup = defaultdict(list)  # domain -> [story_ids]

    # Track media outlets from sources
    media_outlets_from_sources = defaultdict(set)  # domain -> set of story_ids

    for story in stories:
        story_id = story['id']

        # Get full story data
        response = urllib.request.urlopen(f'http://localhost:7272/api/stories/{story_id}')
        story_data = json.loads(response.read().decode())

        content = story_data.get('story', {}).get('content', '')
        artifacts = story_data.get('story', {}).get('artifacts', [])

        # Extract domain-like entities from markup (e.g., [[litera.hu]])
        entity_pattern = r'\[\[([a-z0-9-]+\.[a-z]{2,})\]\]'
        domain_entities = re.findall(entity_pattern, content.lower())

        for domain in domain_entities:
            media_outlets_in_markup[domain].append(story_id)

        # Also track domains from sources
        for artifact in artifacts:
            domain = artifact.get('domain')
            if domain and domain != 'null':
                media_outlets_from_sources[domain].add(story_id)

    print('=== MEDIA OUTLETS IN CONTENT MARKUP ===')
    print(f'Found {len(media_outlets_in_markup)} unique media outlet domains in [[markup]]\n')

    # Check which exist in Neo4j
    existing = []
    missing = []

    for domain in sorted(media_outlets_in_markup.keys()):
        story_ids = media_outlets_in_markup[domain]

        # Try to fetch as entity
        try:
            encoded_name = urllib.parse.quote(domain)
            req = urllib.request.Request(f'http://localhost:7272/api/entity?name={encoded_name}')
            ent_response = urllib.request.urlopen(req)
            ent_data = json.loads(ent_response.read().decode())

            if isinstance(ent_data, list) and len(ent_data) == 2 and ent_data[1] == 404:
                missing.append({
                    'domain': domain,
                    'story_count': len(story_ids),
                    'story_ids': story_ids[:3],  # First 3 stories
                    'in_sources': domain in media_outlets_from_sources
                })
                status = '❌ MISSING'
            else:
                existing.append({
                    'domain': domain,
                    'type': ent_data.get('entity_type'),
                    'has_context': bool(ent_data.get('context'))
                })
                ctx = '📋' if ent_data.get('context') else '  '
                status = f'✅ EXISTS {ctx}'

            print(f'{status} - {domain} (in {len(story_ids)} stories)')

        except Exception as e:
            missing.append({
                'domain': domain,
                'story_count': len(story_ids),
                'story_ids': story_ids[:3],
                'in_sources': domain in media_outlets_from_sources
            })
            print(f'❌ MISSING - {domain} (in {len(story_ids)} stories)')

    print(f'\n=== SUMMARY ===')
    print(f'Total media outlets in markup: {len(media_outlets_in_markup)}')
    print(f'✅ Already exist in Neo4j: {len(existing)}')
    print(f'❌ Need to be created: {len(missing)}')

    if missing:
        print(f'\n=== ENTITIES TO CREATE ===')
        for outlet in missing:
            sources = '✓ in sources' if outlet['in_sources'] else ''
            print(f"\n{outlet['domain']} {sources}")
            print(f"  - Mentioned in {outlet['story_count']} stories")
            print(f"  - Sample stories: {', '.join(outlet['story_ids'][:2])}")

    if existing:
        print(f'\n=== EXISTING ENTITIES NEEDING CONTEXT ===')
        for outlet in existing:
            if not outlet['has_context']:
                print(f"⚠️  {outlet['domain']} - Has entity but missing role/domain context")

    print(f'\n=== RECOMMENDATION ===')
    if missing:
        print(f'🔴 Create {len(missing)} media outlet Organization entities')
        print(f'   Each should have:')
        print(f'     - canonical_name: "domain.com"')
        print(f'     - entity_type: "Organization"')
        print(f'     - role: "Media Outlet"')
        print(f'     - domain: "domain.com"')
        print(f'     - confidence: 1.0 (known media source)')
        print(f'   Then create MENTIONS_ORG relationships to stories')

if __name__ == '__main__':
    find_missing_media_outlets()
