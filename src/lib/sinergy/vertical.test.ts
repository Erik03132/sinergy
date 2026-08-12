import { describe, expect, it } from 'vitest'
import { detectAiBusiness, normalizeVertical, resolveNewsVertical } from './vertical'

describe('vertical: detectAiBusiness', () => {
  it('detects AI-business terms in english and russian', () => {
    expect(detectAiBusiness('EU AI Act introduces new compliance rules')).toBe(true)
    expect(detectAiBusiness('Голосовой ИИ-допрос в полиции')).toBe(true)
    expect(detectAiBusiness('AI-ревью кода в CI/CD')).toBe(true)
    expect(detectAiBusiness('New LLM agent automates support')).toBe(true)
    expect(detectAiBusiness('Generative AI for marketing copy')).toBe(true)
  })

  it('does not flag non-AI business news', () => {
    expect(detectAiBusiness('Stock market hits record high')).toBe(false)
    expect(detectAiBusiness('Футбольный клуб выиграл чемпионат')).toBe(false)
  })
})

describe('vertical: normalizeVertical', () => {
  it('maps cyrillic and variants to canonical form', () => {
    expect(normalizeVertical('Новости')).toBe('News')
    expect(normalizeVertical('новости')).toBe('News')
    expect(normalizeVertical('News')).toBe('News')
    expect(normalizeVertical('News (AI)')).toBe('News (AI)')
    expect(normalizeVertical(undefined)).toBe('News')
  })
})

describe('vertical: resolveNewsVertical', () => {
  it('prioritizes AI-business news for the feed', () => {
    expect(resolveNewsVertical('EU AI Act', 'regulates artificial intelligence')).toBe('News (AI)')
    expect(resolveNewsVertical('Markets rally', 'stocks up today')).toBe('News')
  })
})
