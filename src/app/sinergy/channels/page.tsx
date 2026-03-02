
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Globe, Send, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Channel {
    id: string;
    title: string;
    url: string;
    source_type: 'youtube' | 'telegram' | 'web';
    last_scanned_at: string;
}


export default function ChannelsPage() {
    const [channels, setChannels] = useState<Channel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [newUrl, setNewUrl] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const fetchChannels = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/sinergy/channels')
            const data = await res.json()
            setChannels(data)
        } catch (e) {
            toast.error("Ошибка при загрузке каналов")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchChannels()
    }, [])

    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUrl) return
        setIsAdding(true)
        try {
            const res = await fetch('/api/sinergy/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newUrl })
            })
            if (!res.ok) throw new Error("Не удалось добавить")
            toast.success("Канал добавлен и сканируется")
            setNewUrl('')
            fetchChannels()
        } catch (e) {
            toast.error("Ошибка при добавлении")
        } finally {
            setIsAdding(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/sinergy/channels?id=${id}`, { method: 'DELETE' })
            setChannels(channels.filter(c => c.id !== id))
            toast.success("Удалено")
        } catch (e) {
            toast.error("Ошибка удаления")
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Источники</h1>
                    <p className="text-neutral-500">Управляйте каналами для авто-поиска идей</p>
                </div>
                <button onClick={fetchChannels} className="p-2 text-neutral-400 hover:text-white transition-colors">
                    <RefreshCw className={isLoading ? "animate-spin" : ""} size={20} />
                </button>
            </div>

            <form onSubmit={handleAddChannel} className="mb-10 flex gap-2">
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="URL (Telegram t.me/... или любой HTTPS сайт)"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />

                <button
                    disabled={isAdding}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3 flex items-center gap-2 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                    {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    <span className="hidden sm:inline">Добавить</span>
                </button>
            </form>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            ) : (
                <div className="grid gap-3">
                    {channels.map((ch) => (
                        <div key={ch.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-neutral-800 rounded-lg">
                                    {ch.source_type === 'telegram' && <Send size={20} className="text-sky-500" />}
                                    {ch.source_type === 'web' && <Globe size={20} className="text-emerald-500" />}
                                </div>


                                <div>
                                    <h3 className="font-bold text-neutral-100">{ch.title}</h3>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <a href={ch.url} target="_blank" className="text-xs text-neutral-500 hover:text-emerald-400 flex items-center gap-1">
                                            {ch.url} <Globe size={10} />
                                        </a>
                                        <span className="text-[10px] text-neutral-700">
                                            Скан: {ch.last_scanned_at ? new Date(ch.last_scanned_at).toLocaleDateString() : 'никогда'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(ch.id)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {channels.length === 0 && <div className="text-center py-20 text-neutral-600 border border-dashed border-neutral-800 rounded-3xl">Вы пока не добавили ни одного канала.</div>}
                </div>
            )}
        </div>
    )
}
