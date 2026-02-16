
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SynergyResult } from '@/types/sinergy'
import { Loader2, Sparkles, ArrowRight, ThumbsUp, RefreshCw, X, CheckCircle2, AlertTriangle, TrendingUp, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ValidationResult {
    status: string;
    competition: { level: string; examples: { name: string, url: string }[] };
    budget: { range: string; comment: string };
    mvp_timeline: { months: number; comment: string };
    trend: { direction: string; comment: string };
    legal: { risk: string; comment: string };
}

export default function FindSynergyPage() {
    const [result, setResult] = useState<SynergyResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Validation State
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [showValidation, setShowValidation] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()

    const findNextSynergy = async () => {
        setIsLoading(true)
        setResult(null)
        setValidationResult(null)
        setShowValidation(false)
        try {
            const res = await fetch('/api/sinergy/find-next', {
                method: 'POST',
            })

            if (!res.ok) throw new Error('Failed to fetch synergy')

            const data: SynergyResult = await res.json()
            setResult(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to find synergy. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDetailsClick = async () => {
        if (!result || !result.components || !result.hypothesis) return

        setIsSaving(true)
        try {
            // 1. Save Synergy as New Idea
            const res = await fetch('/api/sinergy/classify', { // Reusing classify for saving as it saves idea
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newIdea: {
                        title: `Synergy: ${result.components[0].title} + ${result.components[1].title}`,
                        description: `Hypothesis: ${result.hypothesis}\n\nLogic Chain: ${result.logic_chain}`,
                        source: 'synergy',
                        vertical: result.components[0].vertical, // Inherit from parent
                        core_tech: [...result.components[0].core_tech, ...result.components[1].core_tech],
                        target_audience: 'Combined Audience',
                        business_model: 'Hybrid',
                        pain_point: ['Unmet Synergy'],
                        temporal_marker: 'Now',
                        is_synergy: true,
                        metadata: {
                            parents: [result.components[0], result.components[1]],
                            synergy_score: result.synergy_score
                        }
                    }
                })
            })

            if (!res.ok) throw new Error('Failed to save synergy')

            const savedIdea = await res.json()

            // 2. Redirect to Analysis Page
            router.push(`/sinergy/analysis/${savedIdea.id}`)

        } catch (error) {
            console.error('Failed to save details:', error)
            toast.error('Failed to save. Try again.')
            setIsSaving(false)
        }
    }


    return (
        <div className="container mx-auto max-w-4xl py-12 px-4 flex flex-col items-center min-h-[80vh] justify-center relative">

            {/* Main Search UI */}
            {!result && !isLoading && (
                <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Discover Startup Synergies
                    </h1>
                    <p className="text-neutral-400 max-w-lg mx-auto text-lg">
                        Our AI engine analyzes your idea archive to find hidden combinations with high market potential.
                    </p>
                    <button
                        onClick={findNextSynergy}
                        className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-neutral-950 px-8 font-medium text-neutral-200 transition-all duration-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 hover:border-emerald-500/50"
                    >
                        <span className="mr-2">Find Synergy</span>
                        <Sparkles className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-neutral-400 font-medium">Analyzing vertical compatibility...</p>
                </div>
            )}

            {result && result.status === 'no_more_synergy' && (
                <div className="text-center space-y-4">
                    <div className="text-2xl font-semibold text-neutral-300">No more synergies found</div>
                    <p className="text-neutral-500">Try adding more ideas to the archive.</p>
                    <button
                        onClick={findNextSynergy}
                        className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-4 h-4" /> Try again
                    </button>
                </div>
            )}

            {result && result.status === 'synergy_found' && result.components && (
                <div className="w-full max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Components Header */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                        <IdeaCard idea={result.components[0]} />
                        <div className="flex justify-center text-neutral-500">
                            <span className="bg-neutral-900 p-2 rounded-full border border-neutral-800">+</span>
                        </div>
                        <IdeaCard idea={result.components[1]} />
                    </div>

                    {/* Synthesis Result */}
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Sparkles className="w-32 h-32" />
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">
                                    Logic Chain
                                </h3>
                                <p className="text-neutral-300 leading-relaxed">
                                    {result.logic_chain}
                                </p>
                            </div>

                            <div className="w-full h-px bg-neutral-800" />

                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-500 mb-2">
                                    Product Hypothesis
                                </h3>
                                <p className="text-xl font-medium text-neutral-100 leading-relaxed">
                                    {result.hypothesis}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="text-4xl font-bold text-white">
                                        {result.synergy_score}
                                    </div>
                                    <div className="text-xs text-neutral-500 flex flex-col">
                                        <span>SYNERGY</span>
                                        <span>SCORE</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDetailsClick}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileText className="w-4 h-4" />
                                        )}
                                        Details
                                    </button>
                                    <button
                                        onClick={findNextSynergy}
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Modal Overlay */}
            {showValidation && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <button
                            onClick={() => setShowValidation(false)}
                            className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="p-8 space-y-8">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                                Idea Validation
                            </h2>

                            {isValidating ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                                    <p className="text-neutral-400 animate-pulse">Researching market with Perplexity...</p>
                                </div>
                            ) : validationResult ? (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                            <div className="text-xs text-neutral-500 uppercase mb-1">Budget Estimate</div>
                                            <div className="text-lg font-semibold text-neutral-200">
                                                {validationResult.budget.range}
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1">
                                                {validationResult.budget.comment}
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                            <div className="text-xs text-neutral-500 uppercase mb-1">MVP Timeline</div>
                                            <div className="text-lg font-semibold text-neutral-200">
                                                {validationResult.mvp_timeline.months} Months
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1">
                                                {validationResult.mvp_timeline.comment}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicators */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                                Competition ({validationResult.competition.level})
                                            </div>
                                            <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                                                {validationResult.competition.examples.map((ex, i) => (
                                                    <li key={i}>
                                                        {ex.name} {ex.url !== 'N/A' && <span className="opacity-50 text-xs">({ex.url})</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-1">
                                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                                    Trend
                                                </div>
                                                <div className="text-sm text-neutral-400 capitalize">
                                                    {validationResult.trend.direction} - {validationResult.trend.comment}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-1">
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    Legal Risk
                                                </div>
                                                <div className="text-sm text-neutral-400 capitalize">
                                                    {validationResult.legal.risk} - {validationResult.legal.comment}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="text-red-400 text-center">Validation failed.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function IdeaCard({ idea }: { idea: any }) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-3 h-full flex flex-col">
            <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-neutral-500 px-2 py-1 bg-neutral-800 rounded">
                    {idea.vertical}
                </span>
            </div>
            <h3 className="font-semibold text-neutral-200">{idea.title}</h3>
            <p className="text-sm text-neutral-400 line-clamp-3 flex-grow">
                {idea.description}
            </p>
            <div className="flex flex-wrap gap-1 pt-2">
                {idea.core_tech.slice(0, 3).map((t: string) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 border border-neutral-700 rounded text-neutral-400">
                        {t}
                    </span>
                ))}
            </div>
        </div>
    )
}
