import { createClient } from '@/lib/supabase/server'
import { Heart } from 'lucide-react'

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
                    <h1 className="text-3xl font-bold text-white">Избранное</h1>
                    <p className="text-neutral-500">Лучшие находки из Блендера</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas?.map((idea: any) => (
                    <div key={idea.id} className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl hover:border-red-500/30 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                                {idea.vertical}
                            </span>
                        </div>
                        <h3 className="font-semibold text-neutral-200 mb-2 group-hover:text-red-400 transition-colors line-clamp-1">
                            {idea.title}
                        </h3>
                        <p className="text-sm text-neutral-400 line-clamp-3 mb-4 h-[60px]">
                            {idea.description}
                        </p>
                    </div>
                ))}

                {(!ideas || ideas.length === 0) && (
                    <div className="col-span-full py-20 text-center text-neutral-500 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                        Нет избранных. Перейдите в Блендер и найдите синергии!
                    </div>
                )}
            </div>
        </div>
    )
}
