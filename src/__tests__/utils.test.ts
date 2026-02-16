import { describe, it, expect } from 'vitest'
import { cn, formatDate } from '@/lib/utils'

describe('utils', () => {
    it('cn объединяет классы без конфликтов', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4')
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('cn обрабатывает условные классы', () => {
        expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
    })

    it('formatDate форматирует дату на русском', () => {
        const result = formatDate('2024-01-15T12:00:00Z')
        expect(result).toContain('2024')
    })
})
