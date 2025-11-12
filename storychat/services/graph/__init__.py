"""
Graph Module - Neo4j Knowledge Graph Persistence

Exports:
- get_neo4j_store(): Get singleton Neo4j store instance
- Neo4jStore: Main store class (for type hints)
"""

from services.neo4j_store import get_neo4j_store, Neo4jStore

__all__ = ['get_neo4j_store', 'Neo4jStore']
