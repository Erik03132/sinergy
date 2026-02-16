import { Idea, SynergyScoreBreakdown } from '@/types/sinergy'
import {
    VERTICAL_COMPATIBILITY,
    SYNERGISTIC_TECH_PAIRS,
    BUSINESS_MODEL_COMPATIBILITY,
} from './constants'

// --- HELPER FUNCTIONS ---

export function isTechSynergistic(techA: string[] = [], techB: string[] = []): boolean {
    const setA = new Set((techA || []).map((t) => String(t).toLowerCase()))
    const setB = new Set((techB || []).map((t) => String(t).toLowerCase()))

    for (const [x, y] of SYNERGISTIC_TECH_PAIRS as Array<[string, string]>) {
        const a = String(x).toLowerCase()
        const b = String(y).toLowerCase()
        if ((setA.has(a) && setB.has(b)) || (setA.has(b) && setB.has(a))) return true
    }
    return false
}

function overlapRatio(a: string[] = [], b: string[] = []): number {
    const A = new Set((a || []).map((x) => String(x).toLowerCase()))
    const B = new Set((b || []).map((x) => String(x).toLowerCase()))
    if (A.size === 0 || B.size === 0) return 0
    let inter = 0
    for (const x of A) if (B.has(x)) inter++
    return inter / Math.min(A.size, B.size)
}

function businessCompatible(modelA?: string, modelB?: string): boolean {
    const a = (modelA || '').toLowerCase().trim()
    const b = (modelB || '').toLowerCase().trim()
    if (!a || !b) return false
    if (a === b) return true
    const allowed = (BUSINESS_MODEL_COMPATIBILITY as any)?.[a] as string[] | undefined
    return Array.isArray(allowed) ? allowed.map((x) => String(x).toLowerCase()).includes(b) : false
}

function verticalSoftScore(verticalA?: string, verticalB?: string): number {
    const a = (verticalA || '').toLowerCase().trim()
    const b = (verticalB || '').toLowerCase().trim()
    if (!a || !b) return 0

    if (a === b) return 1 // same vertical = safe synergy
    const allowed = (VERTICAL_COMPATIBILITY as any)?.[a] as string[] | undefined
    if (Array.isArray(allowed) && allowed.map((x) => String(x).toLowerCase()).includes(b)) return 0.6

    // Previously this was a hard "no". Now it's “allowed but with penalty” to encourage wild cross-industry ideas.
    return -0.4
}

// --- MAIN SCORING FUNCTIONS ---

export function calculateSynergyScore(a: Idea, b: Idea): { score: number; breakdown: SynergyScoreBreakdown } {
    const techA = a.core_tech || a.technologies || []
    const techB = b.core_tech || b.technologies || []

    const audienceA = a.target_audience || a.personas || []
    const audienceB = b.target_audience || b.personas || []

    // --- Tech (0..3) ---
    const techSynergy = isTechSynergistic(techA, techB) ? 3 : overlapRatio(techA, techB) > 0.34 ? 2 : 1

    // --- Audience (0..2) ---
    // If audience is string array
    let audOverlap = 0
    if (Array.isArray(audienceA) && Array.isArray(audienceB)) {
        audOverlap = overlapRatio(audienceA, audienceB)
    }
    const audience = audOverlap > 0.5 ? 2 : audOverlap > 0.2 ? 1 : 0

    // --- Business (0..2) ---
    const business = businessCompatible(a.business_model, b.business_model) ? 2 : (a.business_model && b.business_model ? 1 : 0)

    // --- Temporal (0..3) ---
    const temporal = 1

    // --- Vertical soft influence (-0.4..1) scaled to (0..3-ish) ---
    const vSoft = verticalSoftScore(a.vertical, b.vertical)
    const vertical = Math.round((vSoft + 0.4) * 2) // approx maps -0.4..1 => 0..3

    const score = techSynergy + audience + business + temporal + vertical

    const breakdown: SynergyScoreBreakdown = {
        tech: techSynergy,
        audience,
        business,
        temporal,
    }

    return { score, breakdown }
}

/**
 * Radical Creativity Score (The "Grok" Metric)
 * Rewards contrast (friction) but anchors with some shared ground to avoid total randomness.
 */
export function calculatePairCreativityScore(a: Idea, b: Idea): number {
    const verticalA = String(a.vertical || '').toLowerCase().trim()
    const verticalB = String(b.vertical || '').toLowerCase().trim()

    const audienceA = a.target_audience || []
    const audienceB = b.target_audience || []

    const businessA = String(a.business_model || '').toLowerCase().trim()
    const businessB = String(b.business_model || '').toLowerCase().trim()

    const techA = a.core_tech || []
    const techB = b.core_tech || []

    // Contrast signals (0..1)
    const verticalContrast = verticalA && verticalB && verticalA !== verticalB ? 1 : 0
    const audienceContrast = 1 - overlapRatio(audienceA as string[], audienceB as string[])
    const businessContrast = businessA && businessB && businessA !== businessB ? 1 : 0

    // Anchor signals (0..1) prevent pure randomness
    const techAnchor = isTechSynergistic(techA, techB) ? 1 : overlapRatio(techA, techB) > 0.15 ? 0.6 : 0.2
    const audienceAnchor = overlapRatio(audienceA as string[], audienceB as string[]) > 0.15 ? 1 : 0.3

    // Creativity bonus: contrast * anchor
    // We want High Contrast but SOME Anchor (so it's not total gibberish)
    const contrast = 0.9 * verticalContrast + 0.8 * audienceContrast + 0.7 * businessContrast
    const anchor = 0.9 * techAnchor + 0.6 * audienceAnchor

    // Penalize "same-everything" pairs (these are where micro-CRM emerges)
    const samenessPenalty =
        (verticalA && verticalB && verticalA === verticalB ? 0.6 : 0) +
        (overlapRatio(audienceA as string[], audienceB as string[]) > 0.6 ? 0.6 : 0) +
        (businessA && businessB && businessA === businessB ? 0.4 : 0)

    // Formula: Contrast is good, but needs anchor. Sameness is bad.
    const raw = contrast * anchor - samenessPenalty

    // Scale to a handy range roughly (-2..+4)
    return Math.round(raw * 3)
}

export function sanityCheck(a: Idea, b: Idea): boolean {
    const ta = String(a?.title || '').toLowerCase().trim()
    const tb = String(b?.title || '').toLowerCase().trim()
    if (!ta || !tb) return true
    if (ta === tb) return false
    return true
}

export function isAntiPattern(result: any, bannedWords: string[]): boolean {
    const combinedText = `${result.synergy_title} ${result.synergy_description} ${result.logic_chain}`.toLowerCase();
    return bannedWords.some(word => combinedText.includes(word.toLowerCase()));
}
