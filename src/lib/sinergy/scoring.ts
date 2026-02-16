
import { Idea, SynergyScoreBreakdown } from "@/types/sinergy";
import { VERTICAL_COMPATIBILITY, SYNERGISTIC_TECH_PAIRS, BUSINESS_MODEL_COMPATIBILITY } from "./constants";

export function isTechSynergistic(techA: string[], techB: string[]): boolean {
    // Exact match is not synergy, it's duplication
    const sortedA = [...techA].sort().join(',');
    const sortedB = [...techB].sort().join(',');
    if (sortedA === sortedB && start_check(techA, techB)) return false;

    // Check against predefined pairs
    for (const pair of SYNERGISTIC_TECH_PAIRS) {
        const [t1, t2] = pair;
        const hasT1 = techA.includes(t1) || techB.includes(t1);
        const hasT2 = techA.includes(t2) || techB.includes(t2);

        // Ensure they come from different sides or at least exist cross-pollinated
        // Logic: if (A has T1 AND B has T2) OR (A has T2 AND B has T1)
        if ((techA.includes(t1) && techB.includes(t2)) || (techA.includes(t2) && techB.includes(t1))) {
            return true;
        }
    }
    return false;
}

// Helper to avoid exact dupes validation being too strict if arrays empty
function start_check(a: string[], b: string[]) {
    return a.length > 0 && b.length > 0;
}

export function calculateSynergyScore(a: Idea, b: Idea): { score: number; breakdown: SynergyScoreBreakdown } {
    let tech = 0;
    let audience = 0;
    let business = 0;
    let temporal = 0;

    // 1. Tech Synergy
    if (isTechSynergistic(a.core_tech, b.core_tech)) {
        tech = 3;
    }

    // 2. Audience Compatibility
    if (a.target_audience === b.target_audience) {
        audience = 2;
    } else if (
        (a.target_audience === 'B2B' && b.target_audience === 'B2B2C') ||
        (a.target_audience === 'B2B2C' && b.target_audience === 'B2B')
    ) {
        audience = 1;
    }

    // 3. Business Model Compatibility
    if (a.business_model === b.business_model) {
        business = 1; // Same model is okay-ish
    } else {
        const compatibleB = BUSINESS_MODEL_COMPATIBILITY[a.business_model] || [];
        if (compatibleB.includes(b.business_model)) {
            business = 2;
        }
        // Bidirectional check
        const compatibleA = BUSINESS_MODEL_COMPATIBILITY[b.business_model] || [];
        if (compatibleA.includes(a.business_model)) {
            business = 2;
        }
    }

    // 4. Temporal Alignment
    if (a.temporal_marker === b.temporal_marker) {
        temporal = 3;
    } else {
        // "Now" + "2024-Q1" is roughly compatible
        if (a.temporal_marker === 'Now' || b.temporal_marker === 'Now') {
            temporal = 1;
        }
    }

    return {
        score: tech + audience + business + temporal,
        breakdown: { tech, audience, business, temporal }
    };
}

export function isVerticalCompatible(a: Idea, b: Idea): boolean {
    if (a.vertical === b.vertical) return true;

    const allowedForA = VERTICAL_COMPATIBILITY[a.vertical as string] || [];
    if (allowedForA.includes(b.vertical as string)) return true;

    const allowedForB = VERTICAL_COMPATIBILITY[b.vertical as string] || [];
    if (allowedForB.includes(a.vertical as string)) return true;

    return false;
}

export function sanityCheck(a: Idea, b: Idea): boolean {
    // 1. Budget check (very rough string parsing or just assumption)
    // If both are '50k-100k', risks being too expensive > 100k
    if (a.budget_estimate === '50k-100k' && b.budget_estimate === '50k-100k') return false;

    // 2. Physical + Digital without IoT
    // Heuristic: If one is likely physical (Logistics, Manufacturing) and other is Digital, need IoT
    const physicalVerticals = ['Logistics', 'Manufacturing', 'Hardware', 'CleanTech'];
    const isAPhysical = physicalVerticals.includes(a.vertical as string);
    const isBPhysical = physicalVerticals.includes(b.vertical as string);

    if ((isAPhysical && !isBPhysical) || (!isAPhysical && isBPhysical)) {
        const hasIoT = [...a.core_tech, ...b.core_tech].some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('hardware'));
        if (!hasIoT) return false;
    }

    return true;
}
