import { Idea } from "@/types/sinergy";

// Контрастные вертикали, которые создают интересное трение
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

// Контрастные бизнес-модели
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

// Технологические контрасты (ножницы между старыми и новыми технологиями)
const TECH_CONTRASTS = [
    ['ai', 'handmade'],
    ['blockchain', 'physical'],
    ['vr', 'tactile'],
    ['automation', 'human_guided'],
    ['mobile', 'offline_physical'],
    ['web3', 'traditional_banking'],
    ['iot', 'analog_craft'],
    ['quantum', 'classical_art'],
    ['robotics', 'organic_manual']
];

/**
 * Проверяет есть ли "творческое трение" между идеями
 * Возвращает объект с информацией о типе трения
 */
export function hasCreativeFriction(a: Idea, b: Idea): {
    hasFriction: boolean;
    frictionType: string;
    frictionScore: number;
} {
    let frictionScore = 0;
    let frictionType = 'none';

    // 1. Вертикальный контраст (разные индустрии = свежие идеи)
    const vertA = a.vertical?.toLowerCase() || '';
    const vertB = b.vertical?.toLowerCase() || '';

    // Check if verticals are different enough
    if (vertA && vertB && vertA !== vertB) {
        const contrastsA = CONTRAST_VERTICAL_PAIRS[vertA] || [];
        const contrastsB = CONTRAST_VERTICAL_PAIRS[vertB] || [];

        if (contrastsA.includes(vertB) || contrastsB.includes(vertA)) {
            frictionScore += 5;
            frictionType = 'cross_industry_clash';
            return { hasFriction: true, frictionType, frictionScore };
        }
    }

    // 2. Бизнес-модель контраст (разные способы заработка)
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

    // 3. Если просто разные вертикали, но нет в списке явных контрастов - тоже даем шанс (рандом)
    if (vertA !== vertB && Math.random() > 0.7) {
        frictionScore += 1;
        frictionType = 'random_collision';
        return { hasFriction: true, frictionType, frictionScore };
    }

    return { hasFriction: false, frictionType: 'none', frictionScore: 0 };
}

export function calculateSurpriseFactor(a: Idea, b: Idea): number {
    // 0 to 1 score representing how "surprising" the combination is
    // Distance in embedding space ideally, but heuristics for now

    // Different source helps (User idea + News feed)
    const sourceDiff = a.source !== b.source ? 0.2 : 0;

    // Different lengths of description usually implies different detail levels/domains
    const lengthDiff = Math.abs(a.description.length - b.description.length) > 100 ? 0.1 : 0;

    // Different creation dates (Old idea + New trend)
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    const timeDiff = Math.abs(dateA - dateB) > (1000 * 60 * 60 * 24 * 30) ? 0.2 : 0; // > 30 days difference

    // Base randomness for serendipity
    const serendipity = Math.random() * 0.5;

    return Math.min(1, 0.1 + sourceDiff + lengthDiff + timeDiff + serendipity);
}

export function calculateCreativeTensionScore(a: Idea, b: Idea): number {
    // 1-10 Score
    let score = 0;

    const friction = hasCreativeFriction(a, b);
    score += friction.frictionScore; // 0, 3, or 5

    // Tech stack diversity bonus
    const techA = a.core_tech || [];
    const techB = b.core_tech || [];

    const intersection = techA.filter(t => techB.includes(t));
    if (intersection.length === 0 && techA.length > 0 && techB.length > 0) {
        score += 2; // Different tech stacks
    }

    // Add surprise factor
    score += calculateSurpriseFactor(a, b) * 3;

    return Math.min(10, Math.round(score));
}

export function isAntiPattern(result: any, bannedWords: string[]): boolean {
    const combinedText = `${result.synergy_title} ${result.synergy_description} ${result.logic_chain}`.toLowerCase();

    return bannedWords.some(word => combinedText.includes(word.toLowerCase()));
}
