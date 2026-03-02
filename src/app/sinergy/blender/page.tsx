'use client'

import React, { useState } from 'react'
import { SynergyResult } from '@/types/sinergy'
import { Shuffle, Sparkles, ArrowRight, Loader2, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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
            const valid = data.filter(d => d.synergy_status === 'synergy_found' && d.components)
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
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Shuffle className="w-6 h-6 text-purple-500" />
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
    const router = useRouter()
    const [isSaved, setIsSaved] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const handleSaveIdea = async (silent = false) => {
        if (isSaved) return null
        setIsSaving(true)
        try {
            const res = await fetch('/api/sinergy/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: result.synergy_title || `Синергия: ${result.components?.[0].title} + ${result.components?.[1].title}`,
                    description: result.synergy_description || result.hypothesis || "",
                    is_favorite: true,
                    source: 'synergy',
                    ...result.classification
                }),
            })
            if (!res.ok) throw new Error('Ошибка при сохранении')
            const data = await res.json()
            setIsSaved(true)
            if (!silent) toast.success("Сохранено в Избранное!")
            return data.id as string
        } catch (e) {
            if (!silent) toast.error("Не удалось сохранить.")
            return null
        } finally {
            setIsSaving(false)
        }
    }

    const handleDetails = async () => {
        toast.info("Подготавливаем детальный анализ...")
        const id = await handleSaveIdea(true)
        if (id) {
            router.push(`/sinergy/analysis/${id}`)
        }
    }

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full hover:border-purple-500/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards group relative overflow-hidden" style={{ animationDelay: `${index * 150}ms` }}>

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

            {/* Mode Badge */}
            <div className="absolute top-4 right-4 z-20">
                <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter",
                    result.mode === "Strategic Evolution"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                )}>
                    {result.mode === "Strategic Evolution" ? "Эволюция" : "Синтез"}
                </span>
            </div>

            <div className="flex gap-2 mb-4 relative z-10 flex-wrap pr-16">
                {result.components?.map(c => (
                    <span key={c.id} className="text-[10px] bg-neutral-950 border border-neutral-800 text-neutral-500 px-2 py-1 rounded max-w-[120px] truncate">
                        {String(c.id).startsWith('catalyst-') ? `⚡️ ${c.title}` : c.title}
                    </span>
                ))}
            </div>

            <h2 className="text-xl font-extrabold text-neutral-100 mb-2 leading-tight tracking-tight relative z-10 text-left px-4">
                {result.synergy_title || "Новая Возможность"}
            </h2>

            <p className="text-sm text-neutral-400 mb-6 leading-relaxed relative z-10 text-left opacity-80 px-2 italic">
                {result.synergy_description || result.hypothesis}
            </p>

            <div className="flex-1 relative z-10 space-y-4">
                {/* Logic Chain */}
                <div className="text-left mb-6 bg-neutral-950/30 p-3 rounded-xl border border-neutral-800/30">
                    <h3 className="text-[10px] uppercase font-black text-neutral-600 mb-1 tracking-widest">Стратегическая логика</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed italic">
                        {result.logic_chain}
                    </p>
                </div>

                {/* MVP & Defensibility */}
                {result.mvp_scenario && (
                    <div className="space-y-3">
                        <div className="bg-purple-500/5 p-3 rounded-xl border border-purple-500/10">
                            <h3 className="text-[9px] uppercase font-black text-purple-400 mb-1 tracking-widest">MVP Сценарий</h3>
                            <p className="text-[11px] text-neutral-400 leading-tight">{result.mvp_scenario}</p>
                        </div>

                        {result.defensibility && (
                            <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                                <h3 className="text-[9px] uppercase font-black text-blue-400 mb-1 tracking-widest">Защита бизнеса</h3>
                                <p className="text-[11px] text-neutral-400 leading-tight mb-1">
                                    <span className="text-blue-300/50">Moat:</span> {result.defensibility.competitive_moat}
                                </p>
                                <p className="text-[11px] text-neutral-400 leading-tight">
                                    <span className="text-blue-300/50">Adv:</span> {result.defensibility.unfair_advantage}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Thinking Models - Mini Display Expanded */}
                {result.thinking_models && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/50">
                            <span className="text-[8px] text-neutral-600 block mb-1 uppercase font-bold">ERRC (Blue Ocean)</span>
                            <span className="text-[9px] text-neutral-400 block leading-tight truncate" title={result.thinking_models.blue_ocean_errc}>
                                {result.thinking_models.blue_ocean_errc || result.thinking_models.scamper}
                            </span>
                        </div>
                        <div className="bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/50">
                            <span className="text-[8px] text-neutral-600 block mb-1 uppercase font-bold">JTBD (Target Task)</span>
                            <span className="text-[9px] text-neutral-400 block leading-tight truncate" title={result.thinking_models.jobs_to_be_done}>
                                {result.thinking_models.jobs_to_be_done || result.thinking_models.analogy_bridge}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between items-end relative z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Synergy Score</span>
                        <span className="text-lg font-black text-purple-400">
                            {result.scores?.total || result.synergy_score}/10
                        </span>
                    </div>
                    {result.scores && (
                        <div className="flex gap-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-neutral-600 uppercase font-bold">Blue Ocean</span>
                                <span className="text-[11px] font-bold text-blue-400">{result.scores.blue_ocean}/10</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-neutral-600 uppercase font-bold">Knowledge</span>
                                <span className="text-[11px] font-bold text-amber-400">{result.scores.knowledge_transfer}/10</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleSaveIdea()}
                        disabled={isSaved || isSaving}
                        className={cn(
                            "p-3 rounded-full transition-colors flex items-center justify-center",
                            isSaved ? "bg-red-500/20 text-red-500 cursor-default" : "bg-neutral-800 hover:bg-red-500/20 hover:text-red-500 text-neutral-400",
                            isSaving && "opacity-50 cursor-wait"
                        )}
                        title="В Избранное"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />}
                    </button>

                    <button
                        onClick={handleDetails}
                        className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                        title="Подробнее"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
