#!/usr/bin/env python3
"""Check data coverage for backfill needs"""

import urllib.request
import json

def check_coverage():
    # Get recent stories
    response = urllib.request.urlopen('http://localhost:7272/api/stories?limit=10')
    data = json.loads(response.read().decode())
    stories = data['stories']

    print(f'Checking {len(stories)} recent stories...\n')

    # Check artifacts with/without domains
    artifacts_with_domain = 0
    artifacts_without_domain = 0
    unique_domains = set()

    # Check entities with/without thumbnails
    entities_with_thumbnail = 0
    entities_without_thumbnail = 0
    orgs_with_context = 0
    orgs_without_context = 0

    for story in stories:
        story_id = story['id']
        response = urllib.request.urlopen(f'http://localhost:7272/api/stories/{story_id}')
        story_data = json.loads(response.read().decode())

        # Check artifacts
        artifacts = story_data.get('story', {}).get('artifacts', [])
        for artifact in artifacts:
            domain = artifact.get('domain')
            if domain and domain != 'null':
                artifacts_with_domain += 1
                unique_domains.add(domain)
            else:
                artifacts_without_domain += 1

        # Check entities
        entities = story_data.get('entities', {})

        # Check people for thumbnails
        people = entities.get('people', [])
        for person in people:
            # Fetch entity details
            name = person.get('canonical_name')
            if name:
                try:
                    ent_response = urllib.request.urlopen(f'http://localhost:7272/api/entity?name={urllib.parse.quote(name)}')
                    ent_data = json.loads(ent_response.read().decode())
                    if ent_data.get('wikidata_thumbnail'):
                        entities_with_thumbnail += 1
                    else:
                        entities_without_thumbnail += 1
                except:
                    entities_without_thumbnail += 1

        # Check organizations for context (role, domain)
        organizations = entities.get('organizations', [])
        for org in organizations:
            name = org.get('canonical_name')
            if name:
                try:
                    ent_response = urllib.request.urlopen(f'http://localhost:7272/api/entity?name={urllib.parse.quote(name)}')
                    ent_data = json.loads(ent_response.read().decode())
                    if ent_data.get('context'):
                        orgs_with_context += 1
                    else:
                        orgs_without_context += 1
                except:
                    orgs_without_context += 1

    print('=== ARTIFACTS (Sources) ===')
    print(f'  WITH domain: {artifacts_with_domain}')
    print(f'  WITHOUT domain: {artifacts_without_domain}')
    print(f'  Unique domains: {len(unique_domains)}')
    if artifacts_without_domain > 0:
        print(f'  ⚠️  Need to backfill: {artifacts_without_domain} artifacts missing domain')
    else:
        print(f'  ✅ All artifacts have domains')

    print('\n=== ENTITIES (People) ===')
    print(f'  WITH thumbnail: {entities_with_thumbnail}')
    print(f'  WITHOUT thumbnail: {entities_without_thumbnail}')
    if entities_without_thumbnail > 0:
        print(f'  ℹ️  Could backfill: {entities_without_thumbnail} people without Wikidata thumbnails')
    else:
        print(f'  ✅ All people have thumbnails')

    print('\n=== ENTITIES (Organizations) ===')
    print(f'  WITH context (role/domain): {orgs_with_context}')
    print(f'  WITHOUT context: {orgs_without_context}')
    if orgs_without_context > 0:
        print(f'  ℹ️  Could backfill: {orgs_without_context} organizations without context')
    else:
        print(f'  ✅ All organizations have context')

    print('\n=== RECOMMENDATION ===')
    if artifacts_without_domain > 0:
        print('🔴 CRITICAL: Backfill artifact domains (breaks favicon display)')
    if orgs_without_context > 0:
        print('🟡 OPTIONAL: Backfill organization context (improves media outlet tooltips)')
    if entities_without_thumbnail > 0:
        print('🟡 OPTIONAL: Backfill entity thumbnails (improves person tooltips)')

if __name__ == '__main__':
    check_coverage()
