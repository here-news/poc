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

interface Entity {
    id: string;
    name: string;
    type: string;
}

interface GraphNode {
    id: string;
    name: string;
    type: 'hero' | 'story' | 'entity';
    val: number;
    color?: string;
    imgUrl?: string;
    img?: HTMLImageElement;
    data?: any; // Original data object
    x?: number;
    y?: number;
    fx?: number; // Fixed x position
    fy?: number; // Fixed y position
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
                // 1. Fetch Feed
                const feedResponse = await fetch('/api/coherence/feed?limit=20');
                const feedResult = await feedResponse.json();

                if (!feedResult.stories || feedResult.stories.length === 0) {
                    setLoading(false);
                    return;
                }

                const stories = feedResult.stories;
                const heroStory = stories[0]; // Most recent/top story is Hero

                // 2. Fetch Hero Details
                const heroResponse = await fetch(`/api/stories/${heroStory.story_id}`);
                const heroResult = await heroResponse.json();
                const heroDetails = heroResult.story;

                const nodes: GraphNode[] = [];
                const links: GraphLink[] = [];
                const addedNodeIds = new Set<string>();

                // --- Add Hero Node ---
                nodes.push({
                    id: heroStory.story_id,
                    name: heroStory.title,
                    type: 'hero',
                    val: 30, // Large size
                    imgUrl: heroStory.cover_image || '/static/placeholder.jpg', // Fallback if needed
                    data: heroStory,
                    fx: 0, // Fix to center
                    fy: 0
                });
                addedNodeIds.add(heroStory.story_id);

                // --- Add Entities from Hero ---
                if (heroDetails.entities) {
                    const allEntities = [
                        ...(heroDetails.entities.people || []),
                        ...(heroDetails.entities.organizations || []),
                        ...(heroDetails.entities.locations || [])
                    ];

                    // Limit entities to avoid clutter
                    allEntities.slice(0, 10).forEach((entity: any) => {
                        if (!addedNodeIds.has(entity.id)) {
                            nodes.push({
                                id: entity.id,
                                name: entity.name,
                                type: 'entity',
                                val: 5,
                                color: getEntityColor(entity), // Helper for entity colors
                                data: entity
                            });
                            addedNodeIds.add(entity.id);
                        }
                        // Link to Hero
                        links.push({
                            source: heroStory.story_id,
                            target: entity.id,
                            color: 'rgba(255,255,255,0.2)',
                            width: 1
                        });
                    });
                }

                // --- Add Related Stories ---
                if (heroDetails.related_stories) {
                    heroDetails.related_stories.forEach((rel: any) => {
                        if (!addedNodeIds.has(rel.id)) {
                            nodes.push({
                                id: rel.id,
                                name: rel.title,
                                type: 'story',
                                val: 10,
                                data: rel
                            });
                            addedNodeIds.add(rel.id);
                        }
                        links.push({
                            source: heroStory.story_id,
                            target: rel.id,
                            color: 'rgba(100,100,255,0.3)',
                            width: 2
                        });
                    });
                }

                // --- Add Remaining Feed Stories (Background) ---
                stories.slice(1).forEach((story: Story) => {
                    if (!addedNodeIds.has(story.story_id)) {
                        nodes.push({
                            id: story.story_id,
                            name: story.title,
                            type: 'story',
                            val: 8,
                            imgUrl: story.cover_image,
                            data: story
                        });
                        addedNodeIds.add(story.story_id);
                        // No links for now, just floating in background
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
                console.log(`GraphPage: Loaded ${nodes.length} nodes and ${links.length} links`);

            } catch (error) {
                console.error('Error fetching graph data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getEntityColor = (_entity: any) => {
        // Simple color mapping based on type (if available in your data structure)
        // Adjust logic based on actual entity data structure
        return '#a78bfa'; // Purple-ish default
    };

    const handleNodeClick = useCallback((node: any) => {
        if (node.type === 'hero' || node.type === 'story') {
            navigate(`/story/${node.id}`);
        } else if (node.type === 'entity') {
            // Maybe navigate to entity page or filter?
            // For now, just log
            console.log('Clicked entity:', node.name);
        }
    }, [navigate]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;

        // --- Draw Node ---
        if (node.type === 'hero' || (node.type === 'story' && node.img)) {
            // Draw Image Node
            const size = node.val;

            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.type === 'hero' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'; // Dim background stories
            ctx.fill();

            // Clip for image
            ctx.clip();

            if (node.img) {
                try {
                    // Maintain aspect ratio - cover the circle
                    const imgWidth = node.img.width;
                    const imgHeight = node.img.height;
                    const circleDiameter = size * 2;

                    // Calculate scale to cover the circle (like object-fit: cover)
                    const scale = Math.max(circleDiameter / imgWidth, circleDiameter / imgHeight);
                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;

                    // Center the image
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
                    // Fallback if image fails
                    ctx.fillStyle = '#374151';
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = '#374151';
                ctx.fill();
            }

            ctx.restore();

            // Border
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.lineWidth = node.type === 'hero' ? 2 / globalScale : 1 / globalScale;
            ctx.strokeStyle = node.type === 'hero' ? '#60a5fa' : '#4b5563';
            ctx.stroke();

        } else {
            // Draw Simple Dot Node (Entity or Story without image)
            const size = node.val;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color || '#9ca3af';
            ctx.fill();
        }

        // --- Draw Label ---
        // Show label for Hero, Entities, or on Hover (not implemented here easily without state)
        // Let's show labels for Hero and Entities always, others maybe small?
        if (node.type === 'hero' || node.type === 'entity') {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            // Draw below the node
            ctx.fillText(label, node.x, node.y + node.val + fontSize + 2);
        }
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center z-10 bg-gray-900">
                <h1 className="text-xl font-bold">Story Graph</h1>
                <div className="text-sm text-gray-400">
                    Center: Latest Story | Connected: Entities & Related
                </div>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                ) : data.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No stories found to visualize.
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
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#111827"
                        linkColor={(link: any) => link.color || '#374151'}
                        linkWidth={(link: any) => link.width || 1}
                        d3AlphaDecay={0.02} // Slower decay for better settling
                        d3VelocityDecay={0.3}
                        cooldownTicks={100}
                    />
                )}
            </div>
        </div>
    );
};

export default GraphPage;
