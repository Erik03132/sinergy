
import { Vertical } from "@/types/sinergy";

export const VERTICAL_COMPATIBILITY: Record<string, string[]> = {
    HealthTech: ['FitnessWellness', 'ProductivityTools', 'EdTech', 'Wearables', 'AI-infrastructure'],
    'AI-infrastructure': ['HealthTech', 'EdTech', 'FinTech', 'ProductivityTools', 'Logistics', 'Entertainment', 'CleanTech'],
    EdTech: ['HealthTech', 'ProductivityTools', 'AI-infrastructure', 'Entertainment'],
    FinTech: ['AI-infrastructure', 'Logistics', 'ProductivityTools'],
    ProductivityTools: ['HealthTech', 'EdTech', 'FinTech', 'AI-infrastructure', 'Logistics'],
    CleanTech: ['Logistics', 'AI-infrastructure', 'Manufacturing'],
    Logistics: ['FinTech', 'ProductivityTools', 'AI-infrastructure', 'CleanTech', 'Manufacturing'],
    Entertainment: ['EdTech', 'AI-infrastructure', 'ProductivityTools'],
    Other: []
};

export const SYNERGISTIC_TECH_PAIRS = [
    ['LLM', 'Computer Vision'],
    ['IoT', 'Edge AI'],
    ['Wearables', 'LLM'],
    ['Blockchain', 'Supply Chain'],
    ['AR/VR', 'EdTech'], // Implicitly tech related
    ['No-code', 'SaaS']
];

export const BUSINESS_MODEL_COMPATIBILITY: Record<string, string[]> = {
    SaaS: ['API-as-a-Service', 'Freemium+Premium', 'Marketplace', 'Subscription'],
    Marketplace: ['API-as-a-Service', 'SaaS', 'Commission'],
    Subscription: ['SaaS', 'Content', 'Community'],
    Advertising: ['Marketplace', 'Social', 'Content']
};
export const BANNED_KEYWORDS = [
    'вебинар', 'webinar', 'конференция', 'conference', 'стрим', 'stream', 'интенсив', 'воркшоп', 'workshop',
    'малый бизнес', 'мсп', 'налоги', 'законодательство', 'ук рф', 'упк рф', 'коап',
    'меры поддержки', 'мишустин', 'минфин', 'налоговые изменения', 'ндс', 'усн', 'псн',
    'господдержка', 'субсидии', 'гранты', 'льготы', 'бизнес-завтрак', 'нетворкинг',
    'поддержка бизнеса', 'центр "мой бизнес"', 'мой бизнес', 'мойбизнес',
    'региональные центры', 'бесплатные вебинары', 'бизнес-вебинары', 'анонс', 'приглашаем',
    'изменения в законе', 'маркировка', 'честный знак', 'малого и среднего бизнеса',
    'курс', 'курсы', 'бесплатный курс', 'платный курс', 'марафон', 'обучение', 'обучаем', 'заработок на',
    'veo 3', 'sora', 'обзор нейросети', 'midjourney', 'chatgpt', 'openai', 'runway'
];

export const SYNERGY_BANNED_PATTERNS = [
    'all-in-one', 'aggregator', 'dashboard', 'platform', 'portal', 'витрина', 'каталог',
    'micro-crm', 'мини-crm', 'crm-система', 'маркетплейс',
    'saas для', 'универсальный', 'сервис учета', 'система управления',
    'онлайн-конструктор', 'интеграция', 'автоматизация процессов',
    'обзор новостей', 'дайджест новостей', ...BANNED_KEYWORDS
];
