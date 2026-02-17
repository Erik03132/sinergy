'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Idea } from '@/types/sinergy'
import { Heart, Trash2, Library, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FavoriteListProps {
    initialIdeas: Idea[] | null
}

export function FavoriteList({ initialIdeas }: FavoriteListProps) {
    const router = useRouter()
    const [ideas, setIdeas] = useState<Idea[]>(initialIdeas || [])

    useEffect(() => {
        console.log('FavoriteList mounted with ideas:', initialIdeas?.length)
    }, [initialIdeas])

    const handleCardClick = (id: string) => {
        console.log('Navigating to analysis:', id)
        router.push(`/sinergy/analysis/${id}`)
    }

    const handleToggleFavorite = async (e: React.MouseEvent, idea: Idea) => {
        e.stopPropagation()
        console.log('Removing from favorites:', idea.id)

        const newStatus = false

        // Optimistic update
        setIdeas(prev => prev.filter(item => item.id !== idea.id))

        try {
            const res = await fetch('/api/sinergy/ideas/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idea.id, is_favorite: newStatus })
            })

            if (!res.ok) throw new Error('Failed to update')
            toast.success('Удалено из избранного')
        } catch (error) {
            console.error('Failed to toggle favorite', error)
            toast.error('Не удалось обновить')
            // Revert
            setIdeas(prev => [...prev, idea].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ))
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
                <div
                    key={idea.id}
                    onClick={() => handleCardClick(idea.id)}
                    className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl hover:border-red-500/30 transition-all group cursor-pointer relative flex flex-col h-full min-h-[220px]"
                >
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            {idea.vertical}
                        </span>

                        <button
                            onClick={(e) => handleToggleFavorite(e, idea)}
                            className="p-2 rounded-lg transition-all text-red-400 bg-red-950/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-950/30 ml-auto z-10"
                            title="Удалить из избранного"
                        >
                            <Heart className="w-4 h-4 fill-current" />
                        </button>
                    </div>

                    <h3 className="text-lg font-bold text-neutral-200 mb-2 group-hover:text-red-400 transition-colors line-clamp-2 text-justify">
                        {idea.title}
                    </h3>

                    <p className="text-sm text-neutral-400 leading-relaxed text-justify opacity-80 break-words mb-4 line-clamp-4 flex-1">
                        {idea.description}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-neutral-600 mt-auto pt-4 border-t border-neutral-800/50">
                        <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                    </div>
                </div>
            ))}

            {ideas.length === 0 && (
                <div className="col-span-full py-20 text-center text-neutral-500 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                    Нет избранных. Перейдите в Блендер и найдите синергии!
                </div>
            )}
        </div>
    )
}
