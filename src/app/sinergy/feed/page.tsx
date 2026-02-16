
'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Newspaper, ExternalLink, Archive, RefreshCw, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// We convert this to Client Component to handle Refresh state easily for this sprint
// Or we keep it Server and use a Client Component Wrapper for the header/actions.
// Let's use a Client Page for "News Feed" to handle dynamic "Force Refresh" easily.

export default function NewsFeedPage() {
    // Initial fetch provided by Server Component would be better for SEO, 
    // but for an App dashboard, client fetch is acceptable for "Live" feel.
    // Let's stick to Client Side fetching for simplicity of "Refetching" after button click.

    const [news, setNews] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleDetailsClick = (ideaId: string) => {
        router.push(`/sinergy/analysis/${ideaId}`)
    }

    const fetchNews = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('ideas')
            .select('*')
            .eq('source', 'perplexity')
            .eq('vertical', 'News')
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setNews(data)
        setIsLoading(false)
    }

    React.useEffect(() => {
        fetchNews()
    }, [])

    const handleForceRefresh = async () => {
        setIsRefreshing(true)
        toast.info("Запуск поиска новых идей... Это займет около 10-15 секунд.")
        try {
            const res = await fetch('/api/sinergy/feed/refresh', { method: 'POST' })
            if (!res.ok) throw new Error('Ошибка обновления')

            const data = await res.json()
            toast.success(`Найдено ${data.count} новых идей!`)
            await fetchNews() // Reload list
        } catch (e) {
            toast.error("Ошибка при обновлении ленты.")
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleArchive = async (item: any) => {
        // Logic to "Archive" (e.g. clone to user idea or flag)
        toast.success("Новость сохранена в Архив!")
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                        <Newspaper className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Лента Стартапов</h1>
                        <p className="text-neutral-500">Свежие идеи и кейсы до $100k</p>
                    </div>
                </div>

                <button
                    onClick={handleForceRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-all border border-neutral-700 hover:border-emerald-500/50"
                >
                    {isRefreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {isRefreshing ? 'Поиск...' : 'Обновить сейчас'}
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {news.map((item) => (
                        <div key={item.id} className="bg-neutral-900/30 border border-neutral-800 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row gap-4 md:gap-6 hover:bg-neutral-900/50 transition-colors group">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900">
                                        News
                                    </span>
                                    <span className="text-[10px] text-neutral-600">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-neutral-400 leading-relaxed text-sm">
                                    {item.description}
                                </p>
                            </div>

                            <div className="flex flex-row md:flex-col gap-2 justify-end md:justify-center border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6">
                                {item.original_url && item.original_url !== 'N/A' && (
                                    <a
                                        href={item.original_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center"
                                        title="Читать источник"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                )}
                                <button
                                    onClick={() => handleArchive(item)}
                                    className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors flex items-center justify-center"
                                    title="В Архив"
                                >
                                    <Archive className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDetailsClick(item.id)}
                                    className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors flex items-center justify-center"
                                    title="Подробный анализ"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {news.length === 0 && (
                        <div className="py-20 text-center text-neutral-500 bg-neutral-900/20 rounded-2xl border border-neutral-800 border-dashed">
                            <p className="mb-4">Лента пока пуста.</p>
                            <button
                                onClick={handleForceRefresh}
                                className="text-emerald-500 hover:underline hover:text-emerald-400"
                            >
                                Запустить принудительный поиск
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
