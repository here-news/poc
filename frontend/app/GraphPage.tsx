import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';

interface Story {
    story_id: string;
    title: string;
    coherence?: number;
    tcf_score?: number;
    cover_image?: string;
}

interface Person {
    id: string;
    name: string;
    canonical_id?: string;
    wikidata_thumbnail?: string;
}

interface GraphNode {
    id: string;
    name: string;
    type: 'person' | 'story';
    val: number;
    color?: string;
    imgUrl?: string;
    img?: HTMLImageElement;
    data?: any;
    x?: number;
    y?: number;
    storyIds?: string[]; // For people: which stories they appear in
}

interface GraphLink {
    source: string;
    target: string;
    color?: string;
    width?: number;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

const GraphPage: React.FC = () => {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const navigate = useNavigate();
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch top stories
                const feedResponse = await fetch('/api/coherence/feed?limit=30');
                const feedResult = await feedResponse.json();

                if (!feedResult.stories || feedResult.stories.length === 0) {
                    setLoading(false);
                    return;
                }

                const stories = feedResult.stories;

                // 2. Fetch details for each story to get entities
                const storyDetailsPromises = stories.slice(0, 20).map((story: Story) =>
                    fetch(`/api/stories/${story.story_id}`)
                        .then(res => res.json())
                        .catch(err => {
                            console.error(`Failed to fetch story ${story.story_id}:`, err);
                            return null;
                        })
                );

                const storyDetailsResults = await Promise.all(storyDetailsPromises);
                const validStoryDetails = storyDetailsResults.filter(r => r && r.story);

                // 3. Extract all people across all stories
                const peopleMap = new Map<string, { person: Person; storyIds: string[] }>();
                const storyMap = new Map<string, Story>();

                validStoryDetails.forEach((result) => {
                    const story = result.story;
                    storyMap.set(story.id, story);

                    // Extract people entities
                    const people = story.entities?.people || [];
                    people.forEach((person: any) => {
                        const personId = person.canonical_id || person.id;
                        const personName = person.canonical_name || person.name;

                        if (personId && personName) {
                            if (!peopleMap.has(personId)) {
                                peopleMap.set(personId, {
                                    person: {
                                        id: personId,
                                        name: personName,
                                        canonical_id: person.canonical_id,
                                        wikidata_thumbnail: person.wikidata_thumbnail
                                    },
                                    storyIds: []
                                });
                            }
                            peopleMap.get(personId)!.storyIds.push(story.id);
                        }
                    });
                });

                // 4. Build graph data: People as primary nodes, Stories as secondary
                const nodes: GraphNode[] = [];
                const links: GraphLink[] = [];
                const addedNodeIds = new Set<string>();

                // Add people nodes (primary, larger, circular)
                peopleMap.forEach(({ person, storyIds }, personId) => {
                    // Only show people who appear in multiple stories (more interesting)
                    if (storyIds.length >= 1) {
                        nodes.push({
                            id: personId,
                            name: person.name,
                            type: 'person',
                            val: 8 + Math.min(storyIds.length * 2, 20), // Size based on # of stories
                            color: '#a78bfa', // Purple for people
                            imgUrl: person.wikidata_thumbnail,
                            data: person,
                            storyIds: storyIds
                        });
                        addedNodeIds.add(personId);
                    }
                });

                // Add story nodes (secondary, smaller, rectangular)
                storyMap.forEach((story, storyId) => {
                    nodes.push({
                        id: storyId,
                        name: story.title,
                        type: 'story',
                        val: 6, // Smaller than people
                        color: '#60a5fa', // Blue for stories
                        imgUrl: story.cover_image,
                        data: story
                    });
                    addedNodeIds.add(storyId);
                });

                // Add links: people -> stories they appear in
                peopleMap.forEach(({ storyIds }, personId) => {
                    if (addedNodeIds.has(personId)) {
                        storyIds.forEach(storyId => {
                            if (addedNodeIds.has(storyId)) {
                                links.push({
                                    source: personId,
                                    target: storyId,
                                    color: 'rgba(167, 139, 250, 0.2)', // Purple, transparent
                                    width: 1
                                });
                            }
                        });
                    }
                });

                // Pre-load images
                nodes.forEach(node => {
                    if (node.imgUrl) {
                        const img = new Image();
                        img.src = node.imgUrl;
                        img.onload = () => {
                            node.img = img;
                        };
                    }
                });

                setData({ nodes, links });
                console.log(`GraphPage: Loaded ${nodes.length} nodes (${Array.from(peopleMap.keys()).length} people, ${storyMap.size} stories) and ${links.length} links`);

            } catch (error) {
                console.error('Error fetching graph data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleNodeClick = useCallback((node: any) => {
        if (node.type === 'person') {
            // Toggle selection on person
            setSelectedPersonId(prev => prev === node.id ? null : node.id);
        } else if (node.type === 'story') {
            // Navigate to story page
            navigate(`/story/${node.id}`);
        }
    }, [navigate]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        const isPersonSelected = node.type === 'person' && selectedPersonId === node.id;
        const isStoryHighlighted = node.type === 'story' && selectedPersonId &&
            data.nodes.find(n => n.id === selectedPersonId)?.storyIds?.includes(node.id);

        // Determine if this node should be highlighted
        const isHighlighted = isPersonSelected || isStoryHighlighted;
        const opacity = selectedPersonId && !isHighlighted ? 0.2 : 1.0;

        ctx.globalAlpha = opacity;

        if (node.type === 'person') {
            // --- Draw Person Node (Circle) ---
            const size = node.val;

            if (node.img) {
                // Draw circular image
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color || '#a78bfa';
                ctx.fill();
                ctx.clip();

                try {
                    // Maintain aspect ratio - cover style
                    const imgWidth = node.img.width;
                    const imgHeight = node.img.height;
                    const circleDiameter = size * 2;
                    const scale = Math.max(circleDiameter / imgWidth, circleDiameter / imgHeight);
                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;
                    const offsetX = (circleDiameter - scaledWidth) / 2;
                    const offsetY = (circleDiameter - scaledHeight) / 2;

                    ctx.drawImage(
                        node.img,
                        node.x - size + offsetX,
                        node.y - size + offsetY,
                        scaledWidth,
                        scaledHeight
                    );
                } catch (e) {
                    ctx.fillStyle = '#a78bfa';
                    ctx.fill();
                }

                ctx.restore();
            } else {
                // No image, just colored circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color || '#a78bfa';
                ctx.fill();
            }

            // Border (thicker if selected)
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.lineWidth = (isPersonSelected ? 3 : 1.5) / globalScale;
            ctx.strokeStyle = isPersonSelected ? '#fbbf24' : '#8b5cf6'; // Gold if selected, purple otherwise
            ctx.stroke();

            // Label (always show for people)
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(label, node.x, node.y + size + fontSize + 2);

        } else if (node.type === 'story') {
            // --- Draw Story Node (Rectangle) ---
            const width = node.val * 4;
            const height = node.val * 2.5;

            if (node.img) {
                // Draw image in rectangle
                ctx.save();
                ctx.beginPath();
                ctx.rect(node.x - width / 2, node.y - height / 2, width, height);
                ctx.fillStyle = node.color || '#60a5fa';
                ctx.fill();
                ctx.clip();

                try {
                    const imgWidth = node.img.width;
                    const imgHeight = node.img.height;
                    const scale = Math.max(width / imgWidth, height / imgHeight);
                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;
                    const offsetX = (width - scaledWidth) / 2;
                    const offsetY = (height - scaledHeight) / 2;

                    ctx.drawImage(
                        node.img,
                        node.x - width / 2 + offsetX,
                        node.y - height / 2 + offsetY,
                        scaledWidth,
                        scaledHeight
                    );
                } catch (e) {
                    ctx.fillStyle = '#60a5fa';
                    ctx.fill();
                }

                ctx.restore();
            } else {
                // No image, just colored rectangle
                ctx.fillStyle = node.color || '#60a5fa';
                ctx.fillRect(node.x - width / 2, node.y - height / 2, width, height);
            }

            // Border (thicker if highlighted)
            ctx.strokeStyle = isStoryHighlighted ? '#fbbf24' : '#3b82f6'; // Gold if highlighted
            ctx.lineWidth = (isStoryHighlighted ? 2.5 : 1) / globalScale;
            ctx.strokeRect(node.x - width / 2, node.y - height / 2, width, height);

            // Label (show if highlighted or zoomed in)
            if (isStoryHighlighted || globalScale > 1.5) {
                ctx.font = `${fontSize * 0.8}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                const maxWidth = width * 0.9;
                const truncated = label.length > 30 ? label.substring(0, 30) + '...' : label;
                ctx.fillText(truncated, node.x, node.y + height / 2 + fontSize + 2);
            }
        }

        ctx.globalAlpha = 1.0;
    }, [selectedPersonId, data.nodes]);

    const linkColor = useCallback((link: any) => {
        // Highlight links connected to selected person
        if (selectedPersonId) {
            if (link.source.id === selectedPersonId || link.target.id === selectedPersonId ||
                link.source === selectedPersonId || link.target === selectedPersonId) {
                return 'rgba(251, 191, 36, 0.6)'; // Gold, more visible
            }
            return 'rgba(167, 139, 250, 0.05)'; // Very faint for non-selected
        }
        return link.color || 'rgba(167, 139, 250, 0.2)';
    }, [selectedPersonId]);

    const linkWidth = useCallback((link: any) => {
        if (selectedPersonId) {
            if (link.source.id === selectedPersonId || link.target.id === selectedPersonId ||
                link.source === selectedPersonId || link.target === selectedPersonId) {
                return 2;
            }
            return 0.5;
        }
        return link.width || 1;
    }, [selectedPersonId]);

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center z-10 bg-gray-900">
                <h1 className="text-xl font-bold">Knowledge Graph: People & Stories</h1>
                <div className="text-sm text-gray-400">
                    {selectedPersonId ? (
                        <span className="text-yellow-400">
                            Click person again to deselect • Click story to view
                        </span>
                    ) : (
                        <span>
                            People (circles) • Stories (rectangles) • Click person to highlight their stories
                        </span>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                ) : data.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No data found to visualize.
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={data}
                        nodeCanvasObject={nodeCanvasObject}
                        nodePointerAreaPaint={(node: any, color, ctx) => {
                            ctx.fillStyle = color;
                            if (node.type === 'person') {
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                                ctx.fill();
                            } else {
                                const width = node.val * 4;
                                const height = node.val * 2.5;
                                ctx.fillRect(node.x - width / 2, node.y - height / 2, width, height);
                            }
                        }}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#111827"
                        linkColor={linkColor}
                        linkWidth={linkWidth}
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}
                        cooldownTicks={100}
                        nodeRelSize={1}
                    />
                )}
            </div>
        </div>
    );
};

export default GraphPage;
