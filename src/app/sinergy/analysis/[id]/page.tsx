'use client'

import React, { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Idea, DetailedAnalysis } from '@/types/sinergy'
import { Loader2, ArrowLeft, Target, TrendingUp, ShieldAlert, Map, Swords, BarChart3, Receipt, Archive, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AnalysisPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const [idea, setIdea] = useState<Idea | null>(null)
    const [analysis, setAnalysis] = useState<DetailedAnalysis | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        const fetchIdea = async () => {
            if (!id) return

            const supabase = createClient()
            const { data, error } = await supabase
                .from('ideas')
                .select('*')
                .eq('id', id)
                .single()

            if (error || !data) {
                toast.error('Идея не найдена')
                router.push('/sinergy/find')
                return
            }

            setIdea(data)

            // Check if analysis already exists in metadata
            if (data.metadata?.analysis) {
                setAnalysis(data.metadata.analysis)
                setIsLoading(false)
            } else {
                // If not, trigger analysis automatically
                setIsLoading(false)
                triggerAnalysis(data)
            }
        }

        fetchIdea()
    }, [id, router])

    const triggerAnalysis = async (ideaData: Idea) => {
        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/sinergy/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ideaId: ideaData.id,
                    title: ideaData.title,
                    description: ideaData.description
                })
            })

            if (!res.ok) throw new Error('Analysis failed')

            const data: DetailedAnalysis = await res.json()
            setAnalysis(data)
            toast.success('Анализ завершен!')
        } catch (error) {
            console.error(error)
            toast.error('Не удалось сгенерировать анализ. Попробуйте позже.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    if (isLoading || !idea) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    // Is analyzing state
    if (isAnalyzing || !analysis) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 pt-20">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <p className="text-neutral-400 animate-pulse">Генерация стратегии...</p>
                <p className="text-xs text-neutral-600">Опрашиваем ИИ-экспертов (Gemini, DeepSeek)...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-neutral-800 bg-black/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-neutral-800 rounded-full transition-colors flex items-center gap-2 text-neutral-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-medium hidden md:inline">Назад</span>
                    </button>
                    <h1 className="font-semibold text-lg truncate flex-1">{idea.title}</h1>

                    <div className="flex items-center gap-2">
                        {/* Save to Archive Button - Only for Feed items */}
                        {idea.source === 'perplexity' && (
                            <button
                                onClick={async () => {
                                    try {
                                        toast.info("Сохраняем в Архив...")
                                        const res = await fetch('/api/sinergy/ideas/save', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ idea })
                                        })

                                        if (!res.ok) throw new Error('Failed to save')

                                        const result = await res.json()
                                        if (result.status === 'already_saved') {
                                            toast.warning("Эта идея уже есть в Архиве")
                                        } else {
                                            toast.success("Сохранено в Архив!")
                                            // Optionally redirect to the new archived version or just stay
                                        }
                                    } catch (e: any) {
                                        toast.error(`Ошибка: ${e.message}`)
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50 transition-all text-xs font-medium cursor-pointer"
                            >
                                <Archive className="w-3.5 h-3.5" />
                                В Архив
                            </button>
                        )}

                        <button
                            onClick={async () => {
                                const newStatus = !idea.is_favorite
                                setIdea({ ...idea, is_favorite: newStatus })
                                try {
                                    await fetch('/api/sinergy/ideas/favorite', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: idea.id, is_favorite: newStatus })
                                    })
                                    toast.success(newStatus ? 'Добавлено в избранное' : 'Убрано из избранного')
                                } catch (e) {
                                    setIdea({ ...idea, is_favorite: !newStatus })
                                    toast.error('Ошибка обновления')
                                }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium cursor-pointer",
                                idea.is_favorite
                                    ? "bg-red-950/30 border-red-500/30 text-red-400 hover:bg-red-950/50"
                                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/30"
                            )}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill={idea.is_favorite ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-3.5 h-3.5"
                            >
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                            {idea.is_favorite ? 'В избранном' : 'В избранное'}
                        </button>

                        <button
                            onClick={async () => {
                                if (!confirm('Удалить эту идею? Это действие нельзя отменить.')) return
                                try {
                                    await fetch('/api/sinergy/ideas/delete', {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: idea.id })
                                    })
                                    toast.success('Идея удалена')
                                    router.push('/sinergy/archive')
                                } catch (e) {
                                    toast.error('Не удалось удалить')
                                }
                            }}
                            className="p-1.5 text-neutral-500 hover:text-red-500 transition-colors"
                            title="Удалить навсегда"
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-900/20 transition-colors">
                                <Archive className="w-4 h-4" /> {/* Visual trash icon usage */}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

                {/* Hero Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Глубокий Анализ R1
                        </span>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-medium uppercase tracking-wider">
                            <Target className="w-3 h-3" />
                            {idea.vertical}
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold leading-tight text-white">{idea.title}</h2>
                    <div className="space-y-4 max-w-3xl">
                        {idea.description.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                            <p key={i} className="text-sm md:text-base text-neutral-400 leading-relaxed text-justify opacity-90">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </section>

                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 delay-150">

                    {/* Market Analysis Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            label="TAM (Общий рынок)"
                            value={analysis.market.tam}
                            sub="Total Addressable Market"
                            icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
                        />
                        <StatCard
                            label="SAM (Доступный)"
                            value={analysis.market.sam}
                            sub="Serviceable Available Market"
                            icon={<Target className="w-4 h-4 text-purple-400" />}
                        />
                        <StatCard
                            label="SOM (Реальный)"
                            value={analysis.market.som}
                            sub="Serviceable Obtainable Market"
                            icon={<Receipt className="w-4 h-4 text-emerald-400" />}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column (2 cols wide) */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Market Dynamics */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-blue-500/20 transition-colors">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-neutral-200">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                    Динамика Рынка
                                </h3>
                                <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                                    {analysis.market.description}
                                </p>
                            </div>

                            {/* Roadmap */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-cyan-500/20 transition-colors">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-neutral-200">
                                    <Map className="w-5 h-5 text-cyan-500" />
                                    План Запуска (Roadmap)
                                </h3>
                                <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
                                    {analysis.roadmap.map((phase, idx) => (
                                        <div key={idx} className="relative pl-8">
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-500 z-10 transition-colors hover:border-cyan-500 hover:text-cyan-500 cursor-default">
                                                {idx + 1}
                                            </div>
                                            <div className="mb-2">
                                                <h4 className="text-white font-bold text-lg">{phase.phase}</h4>
                                                <span className="text-xs font-mono text-cyan-400 mt-1 block">
                                                    {phase.duration}
                                                </span>
                                            </div>
                                            <ul className="space-y-2">
                                                {phase.steps.map((step, sIdx) => (
                                                    <li key={sIdx} className="text-neutral-400 text-sm flex items-start gap-3 group">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-700 mt-1.5 shrink-0 group-hover:bg-cyan-500 transition-colors" />
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Right Column (1 col wide) */}
                        <div className="space-y-6">

                            {/* SWOT */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-orange-500/20 transition-colors">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-neutral-200">
                                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                                    SWOT Анализ
                                </h3>
                                <div className="space-y-6">
                                    <SwotSection title="Сильные стороны" items={analysis.swot.strengths} color="text-green-400" bgColor="bg-green-400" />
                                    <SwotSection title="Слабые стороны" items={analysis.swot.weaknesses} color="text-red-400" bgColor="bg-red-400" />
                                    <SwotSection title="Возможности" items={analysis.swot.opportunities} color="text-blue-400" bgColor="bg-blue-400" />
                                    <SwotSection title="Угрозы" items={analysis.swot.threats} color="text-orange-400" bgColor="bg-orange-400" />
                                </div>
                            </div>

                            {/* Competitors */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-red-500/20 transition-colors">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-neutral-200">
                                    <Swords className="w-5 h-5 text-red-500" />
                                    Конкуренты
                                </h3>
                                <div className="space-y-4">
                                    {analysis.competitors.length > 0 ? (
                                        analysis.competitors.map((comp, idx) => (
                                            <div key={idx} className="p-4 bg-neutral-950/50 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <span className="font-bold text-neutral-200 leading-tight">{comp.name}</span>
                                                    {comp.url && comp.url !== 'N/A' && (
                                                        <a
                                                            href={comp.url.startsWith('http') ? comp.url : `https://${comp.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 shrink-0"
                                                        >
                                                            <Globe className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="text-xs leading-relaxed flex gap-2">
                                                        <span className="text-green-500 font-bold shrink-0">+</span>
                                                        <span className="text-neutral-400">{comp.strength}</span>
                                                    </div>
                                                    <div className="text-xs leading-relaxed flex gap-2">
                                                        <span className="text-red-500 font-bold shrink-0">-</span>
                                                        <span className="text-neutral-400">{comp.weakness}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-neutral-500 italic">Конкуренты не найдены.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}

function StatCard({ label, value, sub, icon }: { label: string, value: string, sub?: string, icon: React.ReactNode }) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-col gap-3 hover:border-neutral-700 transition-colors group">
            <div className="flex items-center justify-between">
                <div className="text-neutral-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 group-hover:text-neutral-300 transition-colors">
                    {icon} {label}
                </div>
            </div>
            {/* Removed truncate to allow full text display as requested, applied smaller font for harmony */}
            <div className="text-sm text-neutral-300 leading-relaxed font-normal break-words">
                {value}
            </div>
            {sub && <div className="text-[10px] text-neutral-600">{sub}</div>}
        </div>
    )
}

function SwotSection({ title, items, color, bgColor }: { title: string, items: string[], color: string, bgColor: string }) {
    if (!items || items.length === 0) return null

    return (
        <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-widest ${color} opacity-90 border-b border-neutral-800 pb-2`}>
                {title}
            </h4>
            <ul className="space-y-2">
                {items.map((item, idx) => (
                    <li key={idx} className="text-sm text-neutral-300 flex items-start gap-2.5 leading-relaxed">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${bgColor}`} />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
}
