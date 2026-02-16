'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Idea } from '@/types/sinergy'
import { Search, Tag, X, Filter, ArrowUpRight, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArchiveListProps {
    initialIdeas: Idea[] | null
}

export function ArchiveList({ initialIdeas }: ArchiveListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // Extract unique tags and count them
    const allTags = useMemo(() => {
        if (!initialIdeas) return []
        const tags = new Map<string, number>()
        initialIdeas.forEach(idea => {
            idea.core_tech?.forEach(tag => {
                const normalized = tag.toLowerCase().trim()
                tags.set(normalized, (tags.get(normalized) || 0) + 1)
            })
            // Also add vertical as a tag? Maybe separate filter.
            // For now, let's treat verticals as distinct badges, but maybe searchable.
        })
        return Array.from(tags.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by count desc
            .map(([tag]) => tag)
    }, [initialIdeas])

    const filteredIdeas = useMemo(() => {
        if (!initialIdeas) return []
        return initialIdeas.filter(idea => {
            // Search text
            const searchContent = `${idea.title} ${idea.description} ${idea.vertical} ${idea.business_model || ''}`.toLowerCase()
            const matchesSearch = searchContent.includes(searchQuery.toLowerCase())

            // Filter tags
            const ideaTags = (idea.core_tech || []).map(t => t.toLowerCase())
            const matchesTags = selectedTags.length === 0 || selectedTags.every(t => ideaTags.includes(t))

            return matchesSearch && matchesTags
        })
    }, [initialIdeas, searchQuery, selectedTags])

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        )
    }

    const handleCardClick = (id: string) => {
        router.push(`/sinergy/analysis/${id}`)
    }

    return (
        <div className="space-y-8">
            {/* Controls */}
            <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Поиск по смыслу, словам или технологиям..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3 pl-12 pr-4 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                </div>

                {/* Popular Tags */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-2 flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        Фильтр:
                    </span>
                    {allTags.slice(0, 12).map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                selectedTags.includes(tag)
                                    ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-400"
                                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                            )}
                        >
                            {tag}
                            {selectedTags.includes(tag) && <X className="w-3 h-3" />}
                        </button>
                    ))}
                    {selectedTags.length > 0 && (
                        <button
                            onClick={() => setSelectedTags([])}
                            className="text-xs text-neutral-500 hover:text-neutral-300 ml-auto underline"
                        >
                            Сбросить
                        </button>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIdeas.map((idea) => (
                    <div
                        key={idea.id}
                        onClick={() => handleCardClick(idea.id)}
                        className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl hover:border-emerald-500/50 hover:bg-neutral-900 transition-all group cursor-pointer relative"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        </div>

                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-900 group-hover:border-emerald-500/30 group-hover:text-emerald-500/70 transition-colors">
                                {idea.vertical}
                            </span>
                            <span className="text-[10px] text-neutral-600 mr-6">
                                {new Date(idea.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <h3 className="font-semibold text-neutral-200 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1 pr-4">
                            {idea.title}
                        </h3>

                        <p className="text-sm text-neutral-400 line-clamp-3 mb-4 h-[60px] group-hover:text-neutral-300 transition-colors">
                            {idea.description}
                        </p>

                        <div className="flex flex-wrap gap-1">
                            {idea.core_tech?.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[10px] text-neutral-500 px-1.5 py-0.5 bg-neutral-950 rounded border border-neutral-800 group-hover:border-neutral-700 transition-colors">
                                    {tag}
                                </span>
                            ))}
                            {(idea.core_tech?.length || 0) > 3 && (
                                <span className="text-[10px] text-neutral-600 px-1.5 py-0.5">
                                    +{idea.core_tech!.length - 3}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {filteredIdeas.length === 0 && (
                    <div className="col-span-full py-20 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
                        <p>По вашему запросу ничего не найдено.</p>
                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => setSelectedTags([])}
                                className="text-emerald-500 hover:underline mt-2 text-sm"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
