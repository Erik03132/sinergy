
import { createClient } from '@/lib/supabase/server'
import { Idea } from '@/types/sinergy'
import { Archive } from 'lucide-react'

// Server Component
export default async function ArchivePage() {
    const supabase = await createClient()

    const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                    <Archive className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Архив Идей</h1>
                    <p className="text-neutral-500">Ваша коллекция инсайтов и находок.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas?.map((idea: Idea) => (
                    <div key={idea.id} className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl hover:border-emerald-500/50 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                                {idea.vertical}
                            </span>
                            <span className="text-[10px] text-neutral-600">
                                {new Date(idea.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 className="font-semibold text-neutral-200 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {idea.title}
                        </h3>
                        <p className="text-sm text-neutral-400 line-clamp-3 mb-4 h-[60px]">
                            {idea.description}
                        </p>

                        <div className="flex flex-wrap gap-1">
                            {idea.core_tech?.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[10px] text-neutral-500 px-1.5 py-0.5 bg-neutral-950 rounded border border-neutral-800">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {(!ideas || ideas.length === 0) && (
                    <div className="col-span-full py-20 text-center text-neutral-500">
                        В архиве пока пусто. Добавьте идею или загляните в Ленту!
                    </div>
                )}
            </div>
        </div>
    )
}
