import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    MapPin, Clock, Users, Building2, FileText, ExternalLink,
    Calendar, TrendingUp, Award, Eye, CheckCircle2
} from 'lucide-react';

interface Entity {
    id: string;
    name: string;
    type: string;
    thumbnail?: string;
    description?: string;
    role?: string;
    coordinates?: string;
}

interface Claim {
    id: string;
    text: string;
    stance?: string;
    date?: string;
    confidence?: number;
}

interface Artifact {
    id: string;
    url: string;
    title?: string;
    published_date?: string;
    domain?: string;
    snippet?: string;
}

interface RelatedStory {
    id: string;
    title: string;
    description?: string;
    cover_image?: string;
    created_at?: string;
    match_score: number;
    entities: Array<{name: string; type: string}>;
}

interface EventData {
    id: string;
    slug: string;
    title: string;
    description?: string;
    content?: string;
    cover_image?: string;
    created_at?: string;
    last_updated?: string;
    coherence: number;
    timely: number;
    people: Entity[];
    organizations: Entity[];
    locations: Entity[];
    claims: Claim[];
    artifacts: Artifact[];
    related_stories: RelatedStory[];
    entity_count: number;
    source_count: number;
    claim_count: number;
}

const EventPage: React.FC = () => {
    const { eventSlug } = useParams<{ eventSlug: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'sources' | 'stories'>('overview');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await fetch(`/api/event/${eventSlug}`);
                if (!response.ok) throw new Error('Event not found');

                const data = await response.json();
                setEvent(data.event);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load event');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [eventSlug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
                    <p className="text-gray-400 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/feed')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                        Return to Feed
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Unknown date';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const allEntities = [
        ...(event.people || []).map((p: any) => ({ ...p, type: 'person' })),
        ...(event.organizations || []).map((o: any) => ({ ...o, type: 'organization' })),
        ...(event.locations || []).map((l: any) => ({ ...l, type: 'location' }))
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
            {/* Hero Section */}
            <div className="relative">
                {event.cover_image && (
                    <div className="absolute inset-0 opacity-30">
                        <img
                            src={event.cover_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
                    </div>
                )}

                <div className="relative max-w-7xl mx-auto px-6 py-16">
                    <div className="flex items-center gap-2 text-blue-400 mb-4">
                        <Link to="/feed" className="hover:underline">Feed</Link>
                        <span>/</span>
                        <span className="text-gray-400">{event.slug.replace(/_/g, ' ')}</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                        {event.title}
                    </h1>

                    {event.description && (
                        <p className="text-xl text-gray-300 mb-8 max-w-4xl">
                            {event.description}
                        </p>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex items-center gap-2 text-blue-400 mb-2">
                                <TrendingUp size={20} />
                                <span className="text-sm font-medium">Coherence</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {Math.round(event.coherence)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">out of 100</div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                <Users size={20} />
                                <span className="text-sm font-medium">Entities</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {event.entity_count}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">people, orgs, locations</div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex items-center gap-2 text-purple-400 mb-2">
                                <FileText size={20} />
                                <span className="text-sm font-medium">Claims</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {event.claim_count}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">verified claims</div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex items-center gap-2 text-orange-400 mb-2">
                                <Eye size={20} />
                                <span className="text-sm font-medium">Sources</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {event.source_count}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">primary sources</div>
                        </div>
                    </div>

                    {/* Updated timestamp */}
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Clock size={16} />
                        <span>Last updated: {formatDate(event.last_updated)}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-8">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'timeline', label: 'Timeline' },
                            { id: 'sources', label: 'Sources' },
                            { id: 'stories', label: 'Stories' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 px-2 border-b-2 transition ${
                                    activeTab === tab.id
                                        ? 'border-blue-400 text-blue-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {event.content && (
                                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
                                    <h2 className="text-2xl font-bold text-white mb-4">Full Story</h2>
                                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                                        {event.content.split('\n\n').map((para: string, idx: number) => (
                                            <p key={idx} className="mb-4">{para}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Entities */}
                        <div className="space-y-6">
                            {/* People */}
                            {event.people.length > 0 && (
                                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users size={20} className="text-green-400" />
                                        <h3 className="text-lg font-bold text-white">People Involved</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {event.people.map((person: any) => (
                                            <div key={person.id} className="flex items-start gap-3">
                                                {person.thumbnail && (
                                                    <img
                                                        src={person.thumbnail}
                                                        alt={person.name}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium">{person.name}</div>
                                                    {person.description && (
                                                        <div className="text-sm text-gray-400 line-clamp-2">
                                                            {person.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Organizations */}
                            {event.organizations.length > 0 && (
                                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 size={20} className="text-blue-400" />
                                        <h3 className="text-lg font-bold text-white">Organizations</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {event.organizations.map((org: any) => (
                                            <div key={org.id} className="flex items-start gap-3">
                                                {org.thumbnail && (
                                                    <img
                                                        src={org.thumbnail}
                                                        alt={org.name}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium">{org.name}</div>
                                                    {org.description && (
                                                        <div className="text-sm text-gray-400 line-clamp-2">
                                                            {org.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Locations */}
                            {event.locations.length > 0 && (
                                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin size={20} className="text-red-400" />
                                        <h3 className="text-lg font-bold text-white">Locations</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {event.locations.map((loc: any) => (
                                            <div key={loc.id} className="flex items-start gap-3">
                                                <MapPin size={16} className="text-red-400 mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium">{loc.name}</div>
                                                    {loc.description && (
                                                        <div className="text-sm text-gray-400 line-clamp-2">
                                                            {loc.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                    <div className="max-w-4xl">
                        <h2 className="text-3xl font-bold text-white mb-8">Complete Event Timeline</h2>
                        <p className="text-gray-400 mb-8">Chronological sequence of all verified developments in the Louvre Heist 2025</p>

                        {event.timeline && event.timeline.length > 0 ? (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-500/30"></div>

                                <div className="space-y-6">
                                    {event.timeline.map((item: any) => (
                                        <div key={item.id} className="relative flex gap-6">
                                            {/* Timeline dot - color by severity */}
                                            <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-gray-900 ${
                                                item.severity === 'critical' ? 'bg-red-500' :
                                                item.severity === 'high' ? 'bg-orange-500' :
                                                item.severity === 'medium' ? 'bg-blue-500' :
                                                'bg-green-500'
                                            }`}>
                                                <CheckCircle2 size={24} className="text-white" />
                                            </div>

                                            {/* Timeline card */}
                                            <div className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                                                            <Calendar size={14} />
                                                            {formatDate(item.date)}
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                                    </div>
                                                    {item.verified && (
                                                        <div className="flex items-center gap-1 text-green-400 text-sm">
                                                            <CheckCircle2 size={16} />
                                                            <span>Verified</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-gray-300 leading-relaxed mb-3">{item.description}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className={`px-2 py-1 rounded ${
                                                        item.type === 'event' ? 'bg-red-500/20 text-red-400' :
                                                        item.type === 'development' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-purple-500/20 text-purple-400'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                    {item.sources && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText size={14} />
                                                            {item.sources} source{item.sources !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Timeline data will be added as more events are verified</p>
                            </div>
                        )}
                    </div>
                )}

                {/* SOURCES TAB */}
                {activeTab === 'sources' && (
                    <div className="max-w-5xl">
                        <h2 className="text-3xl font-bold text-white mb-8">Primary Sources</h2>
                        <p className="text-gray-400 mb-8">{event.source_count} verified news articles from credible outlets</p>

                        {event.sources && event.sources.length > 0 ? (
                            <div className="space-y-4">
                                {event.sources.map((source: any) => (
                                    <div
                                        key={source.id}
                                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-1">
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-white font-semibold hover:text-blue-400 transition flex items-center gap-2"
                                                >
                                                    {source.title}
                                                    <ExternalLink size={16} className="flex-shrink-0" />
                                                </a>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className="text-sm text-gray-400">{source.domain}</span>
                                                    {source.credibility && (
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            source.credibility >= 90 ? 'bg-green-500/20 text-green-400' :
                                                            source.credibility >= 80 ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {source.credibility}% credible
                                                        </span>
                                                    )}
                                                    {source.claim_count > 0 && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                                            {source.claim_count} claims extracted
                                                        </span>
                                                    )}
                                                    {source.language && (
                                                        <span className="text-xs text-gray-500">
                                                            {source.language.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Show sample claims if available */}
                                        {source.sample_claims && source.sample_claims.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-700">
                                                <div className="text-sm font-medium text-gray-400 mb-2">
                                                    Key Claims Extracted:
                                                </div>
                                                <div className="space-y-2">
                                                    {source.sample_claims.map((claim: any, idx: number) => (
                                                        <div key={idx} className="text-sm text-gray-300 pl-3 border-l-2 border-blue-500/30">
                                                            "{claim.text}"
                                                            {claim.confidence && (
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    ({Math.round(claim.confidence * 100)}% confidence)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {source.claim_count > 3 && (
                                                    <div className="text-xs text-gray-500 mt-2">
                                                        + {source.claim_count - 3} more claims
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Source articles are being verified and will be added soon</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STORIES TAB */}
                {activeTab === 'stories' && (
                    <div className="max-w-6xl">
                        <h2 className="text-3xl font-bold text-white mb-8">All Stories in This Event</h2>
                        <p className="text-gray-400 mb-8">{event.story_count} news reports covering different aspects of the Louvre Heist</p>

                        {event.stories && event.stories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {event.stories.map((story: any) => (
                                    <Link
                                        key={story.id}
                                        to={`/story/${story.id}`}
                                        className="group bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition"
                                    >
                                        {story.cover_image && (
                                            <div className="aspect-video overflow-hidden">
                                                <img
                                                    src={story.cover_image}
                                                    alt={story.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition line-clamp-2">
                                                {story.title}
                                            </h3>
                                            {story.description && (
                                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                                    {story.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                                    {Math.round(story.match_score * 100)}% match
                                                </span>
                                                {story.created_at && (
                                                    <span>{new Date(story.created_at).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Related stories will appear as more connections are discovered</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventPage;
