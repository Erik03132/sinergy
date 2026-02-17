
import { Newspaper, PlusCircle, Shuffle, Heart, Library } from 'lucide-react'

export const SINERGY_NAV_ITEMS = [
    {
        name: 'Лента',
        href: '/sinergy/feed',
        icon: Newspaper,
        description: 'Новости стартапов'
    },
    {
        name: 'Новая Идея',
        href: '/sinergy/add',
        icon: PlusCircle,
        description: 'Записать мысль'
    },
    {
        name: 'Блендер',
        href: '/sinergy/blender',
        icon: Shuffle,
        description: 'Генератор Синергий'
    },
    {
        name: 'Избранное',
        href: '/sinergy/favorites',
        icon: Heart,
        description: 'Лучшие идеи'
    },
    {
        name: 'Архив',
        href: '/sinergy/archive',
        icon: Library,
        description: 'Вся коллекция'
    }
]
