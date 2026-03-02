
import { Newspaper, PlusCircle, Shuffle, Heart, Library } from 'lucide-react'

export const SINERGY_NAV_ITEMS = [
    {
        name: 'Лента',
        href: '/sinergy/feed',
        icon: Newspaper,
        description: 'Новости стартапов'
    },
    {
        name: 'Источники',
        href: '/sinergy/channels',
        icon: Library,
        description: 'Управление поиском'
    },
    {
        name: 'Блендер',
        href: '/sinergy/blender',
        icon: Shuffle,
        description: 'Генератор Синергий'
    },
    {
        name: 'Архив',
        href: '/sinergy/archive',
        icon: Library,
        description: 'Вся коллекция'
    },
    {
        name: 'Избранное',
        href: '/sinergy/favorites',
        icon: Heart,
        description: 'Лучшие идеи'
    },
    {
        name: 'Новая Идея',
        href: '/sinergy/add',
        icon: PlusCircle,
        description: 'Записать мысль'
    }

]
