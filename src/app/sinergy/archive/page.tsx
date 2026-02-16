import { createClient } from '@/lib/supabase/server'
import { Idea } from '@/types/sinergy'
import { Archive } from 'lucide-react'
import { ArchiveList } from './archive-list'

// Server Component
export default async function ArchivePage() {
    const supabase = await createClient()

    const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .neq('source', 'perplexity') // Exclude raw feed items
        .order('created_at', { ascending: false })

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                    <Archive className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Архив Идей</h1>
                    <p className="text-neutral-500">Ваша коллекция инсайтов и находок.</p>
                </div>
            </div>

            <ArchiveList initialIdeas={ideas} />
        </div>
    )
}
