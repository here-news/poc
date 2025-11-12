#!/usr/bin/env python3
"""Check which entities exist vs missing in Neo4j"""

import urllib.request
import urllib.parse
import json
import re

def check_entity_status():
    # Get a story with entity markup
    story_id = 'bde70f6a-a754-4283-bf6a-d534dd1be055'

    response = urllib.request.urlopen(f'http://localhost:7272/api/stories/{story_id}')
    story_data = json.loads(response.read().decode())

    content = story_data.get('story', {}).get('content', '')

    # Extract entities from markup
    entity_pattern = r'\[\[([^\]]+)\]\]'
    entities_in_markup = list(set(re.findall(entity_pattern, content)))

    print(f'Found {len(entities_in_markup)} unique entities in story markup:\n')

    entities_found = []
    entities_missing = []

    for entity_name in entities_in_markup:
        # Try to fetch entity from API
        try:
            encoded_name = urllib.parse.quote(entity_name)
            req = urllib.request.Request(f'http://localhost:7272/api/entity?name={encoded_name}')
            ent_response = urllib.request.urlopen(req)
            ent_data = json.loads(ent_response.read().decode())

            if isinstance(ent_data, list) and len(ent_data) == 2 and ent_data[1] == 404:
                entities_missing.append(entity_name)
                print(f'❌ {entity_name} - NOT FOUND')
            else:
                entities_found.append({
                    'name': entity_name,
                    'type': ent_data.get('entity_type'),
                    'has_thumbnail': bool(ent_data.get('wikidata_thumbnail')),
                    'has_qid': bool(ent_data.get('wikidata_qid')),
                    'has_context': bool(ent_data.get('context'))
                })
                thumb = '📸' if ent_data.get('wikidata_thumbnail') else '  '
                qid = '🔗' if ent_data.get('wikidata_qid') else '  '
                ctx = '📋' if ent_data.get('context') else '  '
                print(f'✅ {entity_name} - {ent_data.get("entity_type")} {thumb}{qid}{ctx}')
        except urllib.error.HTTPError as e:
            entities_missing.append(entity_name)
            print(f'❌ {entity_name} - HTTP {e.code}')
        except Exception as e:
            entities_missing.append(entity_name)
            print(f'⚠️  {entity_name} - ERROR: {e}')

    print(f'\n=== SUMMARY ===')
    print(f'Total entities in markup: {len(entities_in_markup)}')
    print(f'✅ Found in Neo4j: {len(entities_found)}')
    print(f'❌ Missing from Neo4j: {len(entities_missing)}')

    if entities_missing:
        print(f'\n=== MISSING ENTITIES ===')
        for name in entities_missing:
            print(f'  - {name}')

    if entities_found:
        print(f'\n=== ENTITY METADATA COVERAGE ===')
        with_thumbnails = sum(1 for e in entities_found if e['has_thumbnail'])
        with_qids = sum(1 for e in entities_found if e['has_qid'])
        with_context = sum(1 for e in entities_found if e['has_context'])

        print(f'Wikidata thumbnails: {with_thumbnails}/{len(entities_found)} ({with_thumbnails*100//len(entities_found)}%)')
        print(f'Wikidata QIDs: {with_qids}/{len(entities_found)} ({with_qids*100//len(entities_found)}%)')
        print(f'Context (role/domain): {with_context}/{len(entities_found)} ({with_context*100//len(entities_found) if entities_found else 0}%)')

        print(f'\n=== BACKFILL RECOMMENDATIONS ===')
        if entities_missing:
            print(f'🔴 CRITICAL: {len(entities_missing)} entities need to be extracted and created')
        if with_thumbnails < len(entities_found):
            print(f'🟡 OPTIONAL: {len(entities_found) - with_thumbnails} entities missing Wikidata thumbnails')
        if with_context < len(entities_found):
            print(f'🟡 OPTIONAL: {len(entities_found) - with_context} entities missing context metadata')

if __name__ == '__main__':
    check_entity_status()
