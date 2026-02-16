import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединение Tailwind классов без конфликтов */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Форматирование даты на русском */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}
