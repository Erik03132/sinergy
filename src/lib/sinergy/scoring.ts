import { Idea, SynergyScoreBreakdown } from "@/types/sinergy";
import {
    VERTICAL_COMPATIBILITY,
    SYNERGISTIC_TECH_PAIRS,
    BUSINESS_MODEL_COMPATIBILITY
} from "./constants";

// Kimi's Contrast Verticals
const CONTRAST_VERTICAL_PAIRS: Record<string, string[]> = {
    'fintech': ['agriculture', 'art', 'gaming', 'mental_health', 'education'],
    'healthcare': ['gaming', 'fashion', 'food', 'entertainment', 'real_estate'],
    'education': ['fitness', 'fashion', 'food', 'travel', 'hrtech'],
    'gaming': ['fintech', 'healthcare', 'productivity', 'education', 'ecommerce'],
    'productivity': ['gaming', 'dating', 'pets', 'art', 'meditation'],
    'ecommerce': ['mental_health', 'education', 'gaming', 'fitness', 'art'],
    'sustainability': ['fashion', 'blockchain', 'food', 'travel', 'energy'],
    'ai_ml': ['meditation', 'cooking', 'dating', 'art', 'music'],
    'social': ['productivity', 'fintech', 'healthcare', 'education', 'enterprise'],
    'enterprise': ['gaming', 'social', 'dating', 'pets', 'hobby'],
    'food': ['blockchain', 'gaming', 'fintech', 'education', 'mental_health'],
    'travel': ['productivity', 'fintech', 'education', 'healthcare', 'real_estate'],
    'real_estate': ['gaming', 'blockchain', 'fintech', 'dating', 'social'],
    'dating': ['productivity', 'enterprise', 'fintech', 'education', 'gaming'],
    'fitness': ['fintech', 'gaming', 'food', 'mental_health', 'dating'],
    'mental_health': ['fintech', 'gaming', 'ecommerce', 'food', 'productivity'],
    'blockchain': ['food', 'fashion', 'art', 'sustainability', 'education'],
    'fashion': ['fintech', 'blockchain', 'gaming', 'education', 'sustainability'],
    'art': ['fintech', 'blockchain', 'productivity', 'enterprise', 'healthcare'],
    'music': ['fintech', 'blockchain', 'healthcare', 'education', 'productivity'],
    'legal': ['gaming', 'social', 'dating', 'entertainment', 'hobby'],
    'hrtech': ['dating', 'gaming', 'mental_health', 'art', 'social'],
    'pets': ['fintech', 'productivity', 'enterprise', 'education', 'blockchain'],
    'hobby': ['fintech', 'enterprise', 'productivity', 'legal', 'hrtech'],
    'energy': ['gaming', 'social', 'dating', 'entertainment', 'hobby'],
    'meditation': ['ai_ml', 'gaming', 'fintech', 'enterprise', 'productivity'],
    'agriculture': ['fintech', 'blockchain', 'gaming', 'fashion', 'social']
};

// Kimi's Contrast Models
const CONTRAST_MODEL_PAIRS: Record<string, string[]> = {
    'b2b': ['b2c', 'd2c', 'community', 'freemium'],
    'b2c': ['b2b', 'enterprise', 'b2g'],
    'saas': ['marketplace', 'hardware', 'onetime', 'affiliate'],
    'marketplace': ['saas', 'subscription', 'hardware'],
    'subscription': ['onetime', 'freemium', 'marketplace'],
    'freemium': ['enterprise', 'subscription', 'b2b'],
    'enterprise': ['freemium', 'b2c', 'community'],
    'hardware': ['saas', 'marketplace', 'platform'],
    'platform': ['saas', 'd2c', 'onetime'],
    'community': ['enterprise', 'b2b', 'saas'],
    'onetime': ['subscription', 'saas', 'platform']
};

// ===== ORIGINAL FUNCTIONS (KEEP AS IS, REQUESTED BY CLAUDE VAR) =====

export function isTechSynergistic(techA: string[], techB: string[]): boolean {
    for (const a of techA) {
        for (const b of techB) {
            const pair = [a, b].sort().join('-')
            if (SYNERGISTIC_TECH_PAIRS.has(pair)) return true
        }
    }
    return false
}

export function calculateSynergyScore(a: Idea, b: Idea): { score: number; breakdown: SynergyScoreBreakdown } {
    const breakdown: SynergyScoreBreakdown = {
        tech: 0,
        audience: 0,
        business: 0,
        temporal: 0
    }

    // Tech synergy
    if (isTechSynergistic(a.core_tech || [], b.core_tech || [])) {
        breakdown.tech = 3
    }

    // Audience overlap (simplified check)
    // Assuming target_audience is string for simplicity, or modify logic if array
    if (a.target_audience === b.target_audience) breakdown.audience = 2

    // Business model compatibility
    if (a.business_model && b.business_model) {
        const modelPair = [a.business_model, b.business_model].sort().join('-')
        if (BUSINESS_MODEL_COMPATIBILITY[a.business_model]?.includes(b.business_model)) {
            breakdown.business = 2
        }
    }

    // Temporal synergy (both trending - placeholder logic)
    // Preserving logic structure broadly
    breakdown.temporal = 1;

    const score = breakdown.tech + breakdown.audience + breakdown.business + breakdown.temporal
    return { score, breakdown }
}

export function isVerticalCompatible(a: Idea, b: Idea): boolean {
    if (!a.vertical || !b.vertical) return true
    if (a.vertical === b.vertical) return true

    // Original map based logic
    const compatible = VERTICAL_COMPATIBILITY[a.vertical] || []
    return compatible.includes(b.vertical)
}

export function sanityCheck(a: Idea, b: Idea): boolean {
    // Don't combine identical titles
    if (a.title.toLowerCase() === b.title.toLowerCase()) return false

    // Don't combine if descriptions are too similar
    const wordsA = new Set(a.description.toLowerCase().split(/\s+/))
    const wordsB = new Set(b.description.toLowerCase().split(/\s+/))
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length
    const union = new Set([...wordsA, ...wordsB]).size
    const similarity = intersection / union

    if (similarity > 0.7) return false

    return true
}

// ===== KIMI + CLAUDE NEW LOGIC =====

export function hasCreativeFriction(a: Idea, b: Idea): {
    hasFriction: boolean;
    frictionType: string;
    frictionScore: number;
} {
    let frictionScore = 0;
    let frictionType = 'none';

    // 1. Vertical Contrast
    const vertA = a.vertical?.toLowerCase() || '';
    const vertB = b.vertical?.toLowerCase() || '';

    if (vertA && vertB && vertA !== vertB) {
        const contrastsA = CONTRAST_VERTICAL_PAIRS[vertA] || [];
        const contrastsB = CONTRAST_VERTICAL_PAIRS[vertB] || [];

        if (contrastsA.includes(vertB) || contrastsB.includes(vertA)) {
            frictionScore += 5;
            frictionType = 'cross_industry_clash';
            return { hasFriction: true, frictionType, frictionScore };
        }
    }

    // 2. Model Contrast
    const modelA = a.business_model?.toLowerCase() || '';
    const modelB = b.business_model?.toLowerCase() || '';

    if (modelA && modelB && modelA !== modelB) {
        const modelContrastsA = CONTRAST_MODEL_PAIRS[modelA] || [];
        if (modelContrastsA.includes(modelB)) {
            frictionScore += 3;
            frictionType = 'business_model_pivot';
            return { hasFriction: true, frictionType, frictionScore };
        }
    }

    // 3. Random Chance
    if (vertA !== vertB && Math.random() > 0.7) {
        frictionScore += 1;
        frictionType = 'random_collision';
        return { hasFriction: true, frictionType, frictionScore };
    }

    return { hasFriction: false, frictionType: 'none', frictionScore: 0 };
}

export function isParadoxicalPair(a: Idea, b: Idea): boolean {
    const PARADOX_PATTERNS = [
        // B2B vs B2C
        {
            set1: ['enterprise', 'b2b', 'business', 'corporate'],
            set2: ['consumer', 'b2c', 'personal', 'individual']
        },
        // Privacy vs Social
        {
            set1: ['privacy', 'anonymous', 'secure', 'encrypted'],
            set2: ['social', 'sharing', 'public', 'community']
        },
        // Local vs Global
        {
            set1: ['local', 'neighborhood', 'community', 'nearby'],
            set2: ['global', 'worldwide', 'international', 'remote']
        },
    ]

    const textA = `${a.title} ${a.description} ${a.target_audience}`.toLowerCase()
    const textB = `${b.title} ${b.description} ${b.target_audience}`.toLowerCase()

    for (const pattern of PARADOX_PATTERNS) {
        const hasSet1A = pattern.set1.some(word => textA.includes(word))
        const hasSet2A = pattern.set2.some(word => textA.includes(word))
        const hasSet1B = pattern.set1.some(word => textB.includes(word))
        const hasSet2B = pattern.set2.some(word => textB.includes(word))

        if ((hasSet1A && hasSet2B) || (hasSet2A && hasSet1B)) {
            return true
        }
    }
    return false
}

export function calculateContrastScore(a: Idea, b: Idea): number {
    let score = 0
    // Business model clash
    if (a.business_model !== b.business_model) score += 2
    // Audience mismatch
    if (a.target_audience !== b.target_audience) score += 3
    return score
}

export function calculateSurpriseFactor(a: Idea, b: Idea): number {
    // 0 to 1 score
    const sourceDiff = a.source !== b.source ? 0.2 : 0;
    const lengthDiff = Math.abs(a.description.length - b.description.length) > 100 ? 0.1 : 0;
    const serendipity = Math.random() * 0.5;
    return Math.min(1, 0.1 + sourceDiff + lengthDiff + serendipity);
}

export function calculateCreativeTensionScore(a: Idea, b: Idea): number {
    // 1-10 Score
    let score = 0;
    const friction = hasCreativeFriction(a, b);
    score += friction.frictionScore;

    // Tech bonus
    if (a.core_tech && b.core_tech) {
        // Simplified intersection check
        const overlap = a.core_tech.some(t => b.core_tech.includes(t))
        if (!overlap) score += 2
    }

    score += calculateSurpriseFactor(a, b) * 3;
    return Math.min(10, Math.round(score));
}

export function isAntiPattern(result: any, bannedWords: string[]): boolean {
    const combinedText = `${result.synergy_title} ${result.synergy_description} ${result.logic_chain}`.toLowerCase();
    return bannedWords.some(word => combinedText.includes(word.toLowerCase()));
}
