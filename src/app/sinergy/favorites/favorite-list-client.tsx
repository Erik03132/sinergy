'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Idea } from '@/types/sinergy'
import { Heart, ArrowUpRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function FavoriteListClient({ initialIdeas }: { initialIdeas: Idea[] | null }) {
    const router = useRouter()
    const [ideas, setIdeas] = useState<Idea[]>(initialIdeas || [])

    const handleCardClick = (id: string) => {
        router.push(`/sinergy/analysis/${id}`)
    }

    const handleToggleFavorite = async (e: React.MouseEvent, idea: Idea) => {
        e.stopPropagation()

        // Optimistically update UI
        setIdeas(prev => prev.filter(item => item.id !== idea.id))

        try {
            const res = await fetch('/api/sinergy/ideas/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idea.id, is_favorite: false })
            })
            if (!res.ok) throw new Error()
            toast.success('Удалено из избранного')
        } catch (error) {
            toast.error('Ошибка обновления')
            // Rollback
            setIdeas(prev => [...prev, idea].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ))
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Удалить эту идею навсегда?')) return

        const ideaToRemove = ideas.find(i => i.id === id)
        setIdeas(prev => prev.filter(item => item.id !== id))

        try {
            const res = await fetch('/api/sinergy/ideas/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (!res.ok) throw new Error('Delete failed')
            toast.success('Идея удалена')
        } catch (error) {
            toast.error('Не удалось удалить')
            if (ideaToRemove) {
                setIdeas(prev => [...prev, ideaToRemove].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ))
            }
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => (
                <div
                    key={idea.id}
                    onClick={() => handleCardClick(idea.id)}
                    className="bg-neutral-950/40 border-2 border-neutral-800/50 p-6 rounded-2xl hover:border-red-500/40 transition-all group cursor-pointer relative flex flex-col h-full shadow-lg hover:shadow-red-900/10"
                >
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500 bg-neutral-900/80 px-2 py-1 rounded-md border border-neutral-800">
                            {idea.vertical || 'IDEA'}
                        </span>

                        <div className="flex gap-2 ml-auto z-10">
                            <button
                                onClick={(e) => handleToggleFavorite(e, idea)}
                                className="p-2 rounded-xl transition-all text-red-500 bg-red-500/5 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 shadow-sm"
                                title="Удалить из избранного"
                            >
                                <Heart className="w-4 h-4 fill-red-500" />
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, idea.id)}
                                className="p-2 rounded-xl transition-all text-neutral-500 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 shadow-sm"
                                title="Удалить навсегда"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-neutral-100 mb-3 group-hover:text-red-400 transition-colors leading-tight tracking-tight text-left">
                        {idea.title}
                    </h3>

                    <p className="text-sm text-neutral-400 leading-relaxed text-left opacity-80 break-words mb-4 line-clamp-6 px-2">
                        {idea.description}
                    </p>

                    <div className="px-2 mb-6 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Аудитория:</span>
                            <span className="text-[11px] text-neutral-300 font-medium">{idea.target_audience || 'Не указана'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Модель:</span>
                            <span className="text-[11px] text-neutral-300 font-medium">{idea.business_model || 'Не указана'}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-neutral-800/50">
                        <span className="text-[10px] font-medium text-neutral-600">
                            {new Date(idea.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1 text-red-500/60 font-bold text-[10px] uppercase tracking-wider group-hover:text-red-400 transition-colors">
                            <span>АНАЛИЗ</span>
                            <ArrowUpRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            ))}

            {ideas.length === 0 && (
                <div className="col-span-full py-32 text-center text-neutral-500 bg-neutral-950/20 rounded-3xl border-2 border-neutral-900 border-dashed">
                    <p className="text-lg font-medium mb-2 opacity-50">Ваш список избранного пуст</p>
                    <p className="text-sm opacity-30">Добавляйте идеи из блендера, чтобы они появились здесь</p>
                </div>
            )}
        </div>
    )
}
