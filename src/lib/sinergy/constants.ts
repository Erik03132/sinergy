
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
