import { Idea, SynergyScoreBreakdown } from '@/types/sinergy'

// ===== МАТРИЦА СОВМЕСТИМОСТИ ТЕХНОЛОГИЙ =====
const TECH_COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
    'AI': { 'Cloud': 0.95, 'API': 0.9, 'Mobile': 0.85, 'Blockchain': 0.4, 'IoT': 0.7, 'AR/VR': 0.8, 'LLM': 0.98, 'RAG': 0.98 },
    'Cloud': { 'AI': 0.95, 'API': 0.95, 'Mobile': 0.9, 'Blockchain': 0.7, 'IoT': 0.85, 'Database': 0.95 },
    'Blockchain': { 'AI': 0.4, 'Cloud': 0.7, 'FinTech': 0.95, 'Supply Chain': 0.9, 'Healthcare': 0.6 },
    'IoT': { 'AI': 0.7, 'Cloud': 0.85, 'Mobile': 0.8, 'Analytics': 0.9, 'Edge Computing': 0.95 },
    'API': { 'Cloud': 0.95, 'AI': 0.9, 'Mobile': 0.9, 'SaaS': 0.95, 'Integration': 0.95 },
    'Mobile': { 'Cloud': 0.9, 'AI': 0.85, 'API': 0.9, 'AR/VR': 0.85, 'Payment': 0.9 },
    'AR/VR': { 'AI': 0.8, 'Mobile': 0.85, '3D': 0.95, 'Gaming': 0.9, 'Education': 0.75 }
}

// ===== МАТРИЦА СОВМЕСТИМОСТИ ВЕРТИКАЛЕЙ =====
const VERTICAL_SYNERGY_MATRIX: Record<string, Record<string, number>> = {
    'HealthTech': { 'AI': 0.9, 'EdTech': 0.6, 'FinTech': 0.5, 'Wearables': 0.95, 'Telemedicine': 0.95 },
    'EdTech': { 'AI': 0.85, 'HealthTech': 0.6, 'HR': 0.7, 'Gaming': 0.65, 'Content': 0.8 },
    'FinTech': { 'AI': 0.9, 'Blockchain': 0.85, 'HealthTech': 0.5, 'E-commerce': 0.8, 'Insurance': 0.9 },
    'E-commerce': { 'AI': 0.85, 'FinTech': 0.8, 'Logistics': 0.9, 'Marketing': 0.85, 'Social': 0.7 },
    'LegalTech': { 'AI': 0.9, 'Blockchain': 0.75, 'Document Management': 0.95, 'FinTech': 0.6 },
    'AI-infrastructure': { 'SaaS': 0.9, 'FinTech': 0.85, 'Analytics': 0.95 }
}

// --- HELPER FUNCTIONS ---

function overlapRatio(a: string | string[] = [], b: string | string[] = []): number {
    const listA = Array.isArray(a) ? a : (a || '').toLowerCase().split(/\s+/)
    const listB = Array.isArray(b) ? b : (b || '').toLowerCase().split(/\s+/)

    const setA = new Set(listA.map(x => String(x).toLowerCase().trim()).filter(Boolean))
    const setB = new Set(listB.map(x => String(x).toLowerCase().trim()).filter(Boolean))

    if (setA.size === 0 || setB.size === 0) return 0
    let inter = 0
    for (const x of setA) if (setB.has(x)) inter++
    return inter / Math.min(setA.size, setB.size)
}

function calculateVerticalDistance(vA: string = '', vB: string = ''): number {
    return 1 - overlapRatio(vA, vB)
}

function isTechSynergistic(techA: string[] = [], techB: string[] = [], threshold = 0.6): boolean {
    let maxCompat = 0
    techA.forEach(tA => {
        techB.forEach(tB => {
            const compat = TECH_COMPATIBILITY_MATRIX[tA]?.[tB] || 0.2
            maxCompat = Math.max(maxCompat, compat)
        })
    })
    return maxCompat >= threshold
}

// ===== МОДЕЛЬ 1: BLISS INDEPENDENCE =====
function calculateBlissScore(a: Idea, b: Idea): number {
    const techA = a.core_tech || []
    const techB = (b as any).core_tech || (b as any).technologies || []

    let maxCompatibility = 0
    techA.forEach((tA: string) => {
        techB.forEach((tB: string) => {
            const compat = TECH_COMPATIBILITY_MATRIX[tA]?.[tB] || 0.3
            maxCompatibility = Math.max(maxCompatibility, compat)
        })
    })

    return maxCompatibility * 10
}

// ===== МОДЕЛЬ 2: LOEWE ADDITIVITY =====
function calculateLoeweScore(a: Idea, b: Idea): number {
    const verticalA = a.vertical || ''
    const verticalB = b.vertical || ''

    const verticalSynergy = VERTICAL_SYNERGY_MATRIX[verticalA]?.[verticalB] || 0.4
    const audOverlap = overlapRatio(a.target_audience || '', b.target_audience || '')
    const bizModelSynergy = a.business_model === b.business_model ? 0.8 : 0.5

    return (verticalSynergy * 4 + audOverlap * 3 + bizModelSynergy * 3)
}

// ===== МОДЕЛЬ 3: HSA (Highest Single Agent) =====
function calculateHSAScore(a: Idea, b: Idea): number {
    const techCountA = (a.core_tech || []).length
    const techCountB = ((b as any).core_tech || []).length

    const maxTechDiversity = Math.max(techCountA, techCountB)
    const maturityA = (a as any).maturity_score || 5
    const maturityB = (b as any).maturity_score || 5

    return Math.max(maturityA, maturityB) * 0.7 + maxTechDiversity * 0.5
}

// ===== КОНСЕНСУСНАЯ ОЦЕНКА (аналог SynergyFinder 3.0) =====
export function calculateConsensusSynergyScore(a: Idea, b: Idea): number {
    const blissScore = calculateBlissScore(a, b)
    const loeweScore = calculateLoeweScore(a, b)
    const hsaScore = calculateHSAScore(a, b)

    const scores = [blissScore, loeweScore, hsaScore].sort((x, y) => x - y)
    const consensusScore = scores[1] // median

    const mean = (blissScore + loeweScore + hsaScore) / 3
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / 3
    const confidenceBonus = variance < 2 ? 1.5 : 0

    return Math.min(consensusScore + confidenceBonus, 10)
}

// ===== КРЕАТИВНОСТЬ С УЧЕТОМ "МЕДИЧИ-ЭФФЕКТА" =====
export function calculatePairCreativityScore(a: Idea, b: Idea): number {
    const verticalContrast = a.vertical !== b.vertical ? 2 : 0
    const businessContrast = a.business_model !== b.business_model ? 1.5 : 0

    const verticalDistance = calculateVerticalDistance(a.vertical, b.vertical)
    const mediciBonus = verticalDistance > 0.7 ? 2 : 0

    const techA = a.core_tech || []
    const techB = (b as any).core_tech || []
    const techAnchor = isTechSynergistic(techA, techB) ? 1 : 0.3

    const raw = (verticalContrast + businessContrast + mediciBonus) * techAnchor
    return Math.min(raw, 10)
}

// ===== BLUE OCEAN ПОТЕНЦИАЛ =====
export function calculateBlueOceanPotential(a: Idea, b: Idea): number {
    let score = 0

    const hasCostAdvantage = (a.business_model?.includes('Freemium') || b.business_model?.includes('Freemium'))
    const hasDifferentiation = a.vertical !== b.vertical
    if (hasCostAdvantage && hasDifferentiation) score += 3

    const audienceSpecificity = (a.target_audience && !['users', 'businesses'].includes(a.target_audience.toLowerCase()) ? 0.5 : 0) +
        (b.target_audience && !['users', 'businesses'].includes(b.target_audience.toLowerCase()) ? 0.5 : 0)
    score += audienceSpecificity * 2

    const simplificationKeywords = ['automated', 'no-code', 'self-service', 'one-click', 'instant']
    const hasSimplification = simplificationKeywords.some(kw =>
        (a.description || '').toLowerCase().includes(kw) ||
        (b.description || '').toLowerCase().includes(kw)
    )
    if (hasSimplification) score += 2

    const rareCombos = [
        { v1: 'Healthcare', v2: 'Gaming' },
        { v1: 'Legal', v2: 'Social Media' },
        { v1: 'Education', v2: 'Blockchain' }
    ]
    const isRare = rareCombos.some(combo =>
        (a.vertical === combo.v1 && b.vertical === combo.v2) ||
        (a.vertical === combo.v2 && b.vertical === combo.v1)
    )
    score += isRare ? 3 : 1

    return Math.min(score, 10)
}

// ===== KNOWLEDGE TRANSFER SCORE =====
export function calculateKnowledgeTransferScore(a: Idea, b: Idea): number {
    let score = 0

    const setA = new Set(a.core_tech || [])
    const setB = new Set((b as any).core_tech || [])
    const intersection = [...setA].filter(t => setB.has(t)).length
    const union = new Set([...(a.core_tech || []), ...((b as any).core_tech || [])]).size
    const techOverlap = union > 0 ? intersection / union : 0
    score += techOverlap * 3

    const domainTransfer = VERTICAL_SYNERGY_MATRIX[a.vertical || '']?.[b.vertical || ''] || 0.3
    score += domainTransfer * 4

    const bizModelCompatibility = a.business_model === b.business_model ? 1 : 0.4
    score += bizModelCompatibility * 3

    return Math.min(score, 10)
}

// --- LEGACY/COMPATIBILITY FUNCTIONS ---

export function calculateSynergyScore(a: Idea, b: Idea): { score: number; breakdown: SynergyScoreBreakdown } {
    const score = calculateConsensusSynergyScore(a, b)
    return {
        score,
        breakdown: {
            tech: Math.round(score * 0.4),
            audience: Math.round(score * 0.3),
            business: Math.round(score * 0.2),
            temporal: 1
        }
    }
}

export function sanityCheck(a: Idea, b: Idea): boolean {
    if (a.id === b.id) return false

    const BANNED = ['платформа', 'агрегатор', 'дашборд', 'универсальный']
    if (BANNED.some(bnd => a.title?.toLowerCase().includes(bnd))) return false
    if (BANNED.some(bnd => b.title?.toLowerCase().includes(bnd))) return false

    return true
}

export function isAntiPattern(result: any, bannedWords: string[]): boolean {
    const combinedText = `${result.synergy_title} ${result.synergy_description} ${result.logic_chain}`.toLowerCase();
    return bannedWords.some(word => combinedText.includes(word.toLowerCase()));
}
