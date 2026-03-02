import { createClient } from '@/lib/supabase/server'
import { Heart } from 'lucide-react'
import { FavoriteListClient } from './favorite-list-client'

export const dynamic = 'force-dynamic'

export default async function FavoritesPage() {
    const supabase = await createClient()

    const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                    <Heart className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Избранное</h1>
                    <p className="text-neutral-500 text-sm">Лучшие находки из Блендера</p>
                </div>
            </div>

            <FavoriteListClient initialIdeas={ideas as any} />
        </div>
    )
}
