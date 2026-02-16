'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Idea } from '@/types/sinergy'
import { Search, Tag, X, Filter, ArrowUpRight, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ArchiveListProps {
    initialIdeas: Idea[] | null
}

export function ArchiveList({ initialIdeas }: ArchiveListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [ideas, setIdeas] = useState<Idea[]>(initialIdeas || [])

    // Extract unique tags and count them (optional usage now since filtered removed, but keeping logic if needed later or cleaning up)
    // Actually, user asked to remove Filter, so we can probably remove `allTags` calculation if unused.
    // Simplifying for now.

    const filteredIdeas = useMemo(() => {
        return ideas.filter(idea => {
            // Search text
            const searchContent = `${idea.title} ${idea.description} ${idea.vertical} ${idea.business_model || ''}`.toLowerCase()
            return searchContent.includes(searchQuery.toLowerCase())
        })
    }, [ideas, searchQuery])

    const handleCardClick = (id: string) => {
        router.push(`/sinergy/analysis/${id}`)
    }

    const handleFavorite = async (e: React.MouseEvent, idea: Idea) => {
        e.stopPropagation()
        const newStatus = !idea.is_favorite

        // Optimistic update
        setIdeas(prev => prev.map(item =>
            item.id === idea.id ? { ...item, is_favorite: newStatus } : item
        ))

        try {
            await fetch('/api/sinergy/ideas/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idea.id, is_favorite: newStatus })
            })
        } catch (error) {
            console.error('Failed to toggle favorite', error)
            // Revert
            setIdeas(prev => prev.map(item =>
                item.id === idea.id ? { ...item, is_favorite: !newStatus } : item
            ))
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Вы уверены, что хотите удалить эту идею навсегда?')) return

        // Optimistic remove
        setIdeas(prev => prev.filter(item => item.id !== id))

        try {
            const res = await fetch('/api/sinergy/ideas/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete')
            }

            router.refresh()
        } catch (error: any) {
            console.error('Failed to delete', error)
            toast.error(`Ошибка при удалении: ${error.message}`)
            // Force refresh to restore state if deletion failed
            router.refresh()
        }
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
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIdeas.map((idea) => (
                    <div
                        key={idea.id}
                        onClick={() => handleCardClick(idea.id)}
                        className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl hover:border-emerald-500/50 hover:bg-neutral-900 transition-all group cursor-pointer relative flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-900 group-hover:border-emerald-500/30 group-hover:text-emerald-500/70 transition-colors">
                                {idea.vertical}
                            </span>
                            <span className="text-[10px] text-neutral-600">
                                {new Date(idea.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <h3 className="font-semibold text-neutral-200 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {idea.title}
                        </h3>

                        <p className="text-[13px] text-neutral-400 line-clamp-4 mb-4 flex-1 leading-relaxed text-justify opacity-80">
                            {idea.description}
                        </p>

                        <div className="flex items-center gap-2 pt-4 border-t border-neutral-800/50 mt-auto">
                            {idea.original_url && idea.original_url !== 'N/A' && (
                                <a
                                    href={idea.original_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 text-sky-500 bg-sky-950/10 hover:bg-sky-950/30 rounded-lg transition-all border border-sky-500/20 hover:border-sky-500/50"
                                    title="Источник"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                </a>
                            )}

                            <button
                                onClick={(e) => handleFavorite(e, idea)}
                                className={cn(
                                    "p-2 rounded-lg transition-all border ml-auto",
                                    idea.is_favorite
                                        ? "text-red-400 bg-red-950/10 border-red-500/20 hover:border-red-500/50 hover:bg-red-950/30"
                                        : "text-neutral-500 bg-neutral-900 border-neutral-800 hover:text-red-400 hover:border-red-500/30"
                                )}
                                title={idea.is_favorite ? "Убрать из избранного" : "В избранное"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill={idea.is_favorite ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4"
                                >
                                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                </svg>
                            </button>

                            <button
                                onClick={(e) => handleDelete(e, idea.id)}
                                className="p-2 text-neutral-500 bg-neutral-900 border border-neutral-800 hover:text-red-400 hover:border-red-500/30 rounded-lg transition-all hover:bg-red-950/10"
                                title="Удалить"
                            >
                                <Archive className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredIdeas.length === 0 && (
                    <div className="col-span-full py-20 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
                        <p>По вашему запросу ничего не найдено.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
