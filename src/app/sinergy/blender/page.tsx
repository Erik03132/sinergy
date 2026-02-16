
'use client'

import React, { useState } from 'react'
import { SynergyResult } from '@/types/sinergy'
import { Shuffle, Sparkles, ArrowRight, Loader2, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function BlenderPage() {
    const [results, setResults] = useState<SynergyResult[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const runBlender = async () => {
        setIsLoading(true)
        setResults([])
        try {
            const promises = [1, 2, 3].map(() =>
                fetch('/api/sinergy/find-next', { method: 'POST' }).then(r => r.json())
            )
            const data = await Promise.all(promises)
            const valid = data.filter(d => d.status === 'synergy_found' && d.components)
            setResults(valid)

            if (valid.length === 0) {
                toast("Синергии не найдены. Попробуйте добавить больше идей.")
            }
        } catch (error) {
            console.error(error)
            toast.error('Ошибка Блендера. Попробуйте позже.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-8 pb-4 flex justify-between items-end border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-20">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Shuffle className="w-8 h-8 text-purple-500" />
                        Блендер Идей
                    </h1>
                    <p className="text-neutral-500 mt-1">Генератор гипотез на базе ИИ</p>
                </div>

                <button
                    onClick={runBlender}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-950 rounded-full font-bold transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5" />
                    )}
                    {results.length > 0 ? 'Смешать снова' : 'Запустить Блендер'}
                </button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                {results.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4 opacity-50">
                        <Shuffle className="w-24 h-24 stroke-1" />
                        <p>Нажмите кнопку, чтобы найти скрытые связи.</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 h-full pb-20">
                        {results.map((res, idx) => (
                            <BlenderCard key={idx} result={res} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function BlenderCard({ result, index }: { result: SynergyResult, index: number }) {
    const [isSaved, setIsSaved] = useState(false)

    const handleSave = async () => {
        if (isSaved) return
        try {
            const res = await fetch('/api/sinergy/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: result.synergy_title || `Синергия: ${result.components?.[0].title} + ${result.components?.[1].title}`,
                    description: result.synergy_description || result.hypothesis || "",
                    is_favorite: true
                }),
            })
            if (!res.ok) throw new Error('Ошибка')
            setIsSaved(true)
            toast.success("Сохранено в Избранное!")
        } catch (e) {
            toast.error("Не удалось сохранить.")
        }
    }

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full hover:border-purple-500/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards group relative overflow-hidden" style={{ animationDelay: `${index * 150}ms` }}>

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

            <div className="flex gap-2 mb-4 relative z-10 flex-wrap">
                {result.components?.map(c => (
                    <span key={c.id} className="text-[10px] bg-neutral-950 border border-neutral-800 text-neutral-500 px-2 py-1 rounded max-w-[120px] truncate">
                        {c.title}
                    </span>
                ))}
            </div>

            <h2 className="text-xl font-bold text-neutral-100 mb-2 leading-tight relative z-10">
                {result.synergy_title || "Новая Возможность"}
            </h2>

            <p className="text-sm text-neutral-300 mb-4 leading-relaxed relative z-10">
                {result.synergy_description || result.hypothesis}
            </p>

            <div className="flex-1 relative z-10 space-y-4">
                <div>
                    <h3 className="text-xs uppercase font-bold text-neutral-600 mb-1">Логическая цепочка</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                        {result.logic_chain}
                    </p>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between items-center relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500 uppercase">Оценка Синергии</span>
                    <span className="text-2xl font-bold text-neutral-300">
                        {result.synergy_score}/10
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaved}
                        className={cn(
                            "p-3 rounded-full transition-colors flex items-center justify-center",
                            isSaved ? "bg-red-500/20 text-red-500 cursor-default" : "bg-neutral-800 hover:bg-red-500/20 hover:text-red-500 text-neutral-400"
                        )}
                        title="В Избранное"
                    >
                        <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
                    </button>
                    {/* Placeholder for Details View */}
                    <button className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors" title="Подробнее">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
