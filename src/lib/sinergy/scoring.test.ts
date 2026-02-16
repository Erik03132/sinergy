
import { describe, it, expect } from 'vitest';
import { calculateSynergyScore, isTechSynergistic, isVerticalCompatible, sanityCheck } from './scoring';
import { Idea } from '@/types/sinergy';

// Helper to lessen boilerplate
const mockIdea = (overrides: Partial<Idea>): Idea => ({
    id: 'test-id',
    source: 'user',
    title: 'Test Idea',
    description: 'Test Description',
    created_at: new Date().toISOString(),
    vertical: 'Other',
    core_tech: [],
    target_audience: 'B2B',
    business_model: 'SaaS',
    pain_point: [],
    temporal_marker: 'Now',
    budget_estimate: '0-25k',
    tags: [],
    ...overrides
});

describe('Sinergy Scoring Logic', () => {

    describe('isVerticalCompatible', () => {
        it('should return true for same vertical', () => {
            const a = mockIdea({ vertical: 'HealthTech' });
            const b = mockIdea({ vertical: 'HealthTech' });
            expect(isVerticalCompatible(a, b)).toBe(true);
        });

        it('should return true for compatible verticals', () => {
            const a = mockIdea({ vertical: 'HealthTech' });
            const b = mockIdea({ vertical: 'Wearables' }); // Wearables is in HealthTech compatibility list
            // Check constants.ts: HealthTech compat includes 'Wearables'
            expect(isVerticalCompatible(a, b)).toBe(true);
        });

        it('should return false for incompatible verticals', () => {
            const a = mockIdea({ vertical: 'Metallurgy' }); // Assuming Metallurgy has empty list
            const b = mockIdea({ vertical: 'EdTech' });
            expect(isVerticalCompatible(a, b)).toBe(false);
        });
    });

    describe('isTechSynergistic', () => {
        it('should identify direct synergy pairs', () => {
            expect(isTechSynergistic(['LLM'], ['Computer Vision'])).toBe(true);
            expect(isTechSynergistic(['IoT'], ['Edge AI'])).toBe(true);
        });

        it('should identify cross-pollinated synergy', () => {
            expect(isTechSynergistic(['LLM', 'React'], ['Computer Vision', 'Node'])).toBe(true);
        });

        it('should return false for unrelated tech', () => {
            expect(isTechSynergistic(['React'], ['Vue'])).toBe(false);
        });

        it('should return false for exact duplicates (no synergy, just copy)', () => {
            expect(isTechSynergistic(['React', 'Node'], ['React', 'Node'])).toBe(false);
        });
    });

    describe('calculateSynergyScore', () => {
        it('should calculate high score for perfect synergy', () => {
            const a = mockIdea({
                vertical: 'HealthTech',
                core_tech: ['LLM'],
                target_audience: 'B2B',
                business_model: 'SaaS',
                temporal_marker: 'Now'
            });
            const b = mockIdea({
                vertical: 'Wearables',
                core_tech: ['Computer Vision'], // Synergistic with LLM
                target_audience: 'B2B', // +2
                business_model: 'API-as-a-Service', // Compatible with SaaS (+2)
                temporal_marker: 'Now' // +3
            });

            const { score, breakdown } = calculateSynergyScore(a, b);

            // Expected:
            // Tech: 3 (LLM + CV)
            // Audience: 2 (Same)
            // Business: 2 (SaaS -> API compat)
            // Temporal: 3 (Same)
            // Total: 10

            expect(breakdown.tech).toBe(3);
            expect(breakdown.audience).toBe(2);
            expect(breakdown.business).toBe(2);
            expect(breakdown.temporal).toBe(3);
            expect(score).toBe(10);
        });
    });

    describe('sanityCheck', () => {
        it('should fail if both are high budget', () => {
            const a = mockIdea({ budget_estimate: '50k-100k' });
            const b = mockIdea({ budget_estimate: '50k-100k' });
            expect(sanityCheck(a, b)).toBe(false);
        });

        it('should fail Physical + Digital without IoT', () => {
            const a = mockIdea({ vertical: 'Logistics', core_tech: ['SaaS'] }); // Physical
            const b = mockIdea({ vertical: 'FinTech', core_tech: ['SaaS'] }); // Digital
            expect(sanityCheck(a, b)).toBe(false);
        });

        it('should pass Physical + Digital WITH IoT', () => {
            const a = mockIdea({ vertical: 'Logistics', core_tech: ['IoT'] }); // Physical + IoT
            const b = mockIdea({ vertical: 'FinTech', core_tech: ['SaaS'] }); // Digital
            expect(sanityCheck(a, b)).toBe(true);
        });
    });

});
