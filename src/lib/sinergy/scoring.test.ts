import { describe, it, expect } from 'vitest'
import {
  calculateSynergyScore,
  calculateConsensusSynergyScore,
  calculatePairCreativityScore,
  isTechSynergistic,
  isVerticalCompatible,
  sanityCheck,
} from './scoring'
import { Idea } from '@/types/sinergy'

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
  ...overrides,
})

describe('Sinergy Scoring Logic', () => {
  describe('isVerticalCompatible', () => {
    it('should return true for same vertical', () => {
      const a = mockIdea({ vertical: 'HealthTech' })
      const b = mockIdea({ vertical: 'HealthTech' })
      expect(isVerticalCompatible(a, b)).toBe(true)
    })

    it('should return true for compatible verticals', () => {
      const a = mockIdea({ vertical: 'HealthTech' })
      const b = mockIdea({ vertical: 'Wearables' })
      expect(isVerticalCompatible(a, b)).toBe(true)
    })

    it('should return false for incompatible verticals', () => {
      const a = mockIdea({ vertical: 'Metallurgy' })
      const b = mockIdea({ vertical: 'EdTech' })
      expect(isVerticalCompatible(a, b)).toBe(false)
    })
  })

  describe('isTechSynergistic', () => {
    it('should identify direct synergy pairs', () => {
      expect(isTechSynergistic(['LLM'], ['Computer Vision'])).toBe(true)
      expect(isTechSynergistic(['IoT'], ['Edge AI'])).toBe(true)
    })

    it('should identify cross-pollinated synergy', () => {
      expect(isTechSynergistic(['LLM', 'React'], ['Computer Vision', 'Node'])).toBe(true)
    })

    it('should return false for unrelated tech', () => {
      expect(isTechSynergistic(['React'], ['Vue'])).toBe(false)
    })

    it('should return false for exact duplicates (no synergy, just copy)', () => {
      expect(isTechSynergistic(['React', 'Node'], ['React', 'Node'])).toBe(false)
    })

    it('should return false when one side has no tech', () => {
      expect(isTechSynergistic([], ['LLM'])).toBe(false)
      expect(isTechSynergistic(['LLM'], [])).toBe(false)
    })
  })

  describe('calculateConsensusSynergyScore (prod: orchestrator/builder)', () => {
    it('should give high score for matrix-synergistic tech', () => {
      const a = mockIdea({ vertical: 'HealthTech', core_tech: ['AI'] })
      const b = mockIdea({ vertical: 'Wearables', core_tech: ['Cloud'] })
      const score = calculateConsensusSynergyScore(a, b)
      expect(score).toBeGreaterThan(7)
      expect(score).toBeLessThanOrEqual(10)
    })

    it('should stay within 0..10 for unrelated ideas', () => {
      const a = mockIdea({ vertical: 'Other', core_tech: ['React'] })
      const b = mockIdea({ vertical: 'Other', core_tech: ['Vue'] })
      const score = calculateConsensusSynergyScore(a, b)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(10)
    })
  })

  describe('calculatePairCreativityScore (prod: orchestrator/optimist)', () => {
    it('should reward contrast (different verticals/models)', () => {
      const a = mockIdea({ vertical: 'HealthTech', core_tech: ['LLM'], business_model: 'SaaS' })
      const b = mockIdea({ vertical: 'Wearables', core_tech: ['Computer Vision'], business_model: 'API-as-a-Service' })
      const contrast = calculatePairCreativityScore(a, b)
      const same = calculatePairCreativityScore(
        mockIdea({ vertical: 'HealthTech', core_tech: ['LLM'], business_model: 'SaaS' }),
        mockIdea({ vertical: 'HealthTech', core_tech: ['LLM'], business_model: 'SaaS' })
      )
      expect(contrast).toBeGreaterThan(same)
      expect(contrast).toBeLessThanOrEqual(10)
    })

    it('should boost techAnchor when tech is synergistic', () => {
      const withSynergy = calculatePairCreativityScore(
        mockIdea({ vertical: 'HealthTech', core_tech: ['LLM'] }),
        mockIdea({ vertical: 'Wearables', core_tech: ['Computer Vision'] })
      )
      const without = calculatePairCreativityScore(
        mockIdea({ vertical: 'HealthTech', core_tech: ['React'] }),
        mockIdea({ vertical: 'Wearables', core_tech: ['Vue'] })
      )
      expect(withSynergy).toBeGreaterThan(without)
    })
  })

  describe('calculateSynergyScore (legacy compat)', () => {
    it('should return score 0..10 and breakdown keys', () => {
      const a = mockIdea({
        vertical: 'HealthTech',
        core_tech: ['LLM'],
        target_audience: 'B2B',
        business_model: 'SaaS',
        temporal_marker: 'Now',
      })
      const b = mockIdea({
        vertical: 'Wearables',
        core_tech: ['Computer Vision'],
        target_audience: 'B2B',
        business_model: 'API-as-a-Service',
        temporal_marker: 'Now',
      })

      const { score, breakdown } = calculateSynergyScore(a, b)

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(10)
      expect(breakdown).toHaveProperty('tech')
      expect(breakdown).toHaveProperty('audience')
      expect(breakdown).toHaveProperty('business')
      expect(breakdown).toHaveProperty('temporal')
      // LLM + Computer Vision — synergistic pair => tech score positive
      expect(breakdown.tech).toBeGreaterThan(0)
    })
  })

  describe('sanityCheck', () => {
    it('should fail if both are the same idea (same id)', () => {
      const a = mockIdea({ id: 'same' })
      const b = mockIdea({ id: 'same' })
      expect(sanityCheck(a, b)).toBe(false)
    })

    it('should fail if title contains banned word', () => {
      const a = mockIdea({ id: 'a', title: 'Универсальная платформа для всего' })
      const b = mockIdea({ id: 'b' })
      expect(sanityCheck(a, b)).toBe(false)
    })

    it('should pass distinct valid ideas', () => {
      const a = mockIdea({ id: 'a', vertical: 'Logistics', core_tech: ['SaaS'] })
      const b = mockIdea({ id: 'b', vertical: 'FinTech', core_tech: ['IoT'] })
      expect(sanityCheck(a, b)).toBe(true)
    })
  })
})
