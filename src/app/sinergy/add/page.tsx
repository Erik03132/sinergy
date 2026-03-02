
'use client'

import React, { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function AddIdeaPage() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !description) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/sinergy/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            })

            if (!res.ok) throw new Error('Ошибка')

            toast.success("Идея добавлена и отправлена в Архив!")
            setTitle('')
            setDescription('')
            router.push('/sinergy/archive')
        } catch (error) {
            console.error(error)
            toast.error("Не удалось сохранить идею.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <h1 className="text-2xl font-bold mb-8 text-neutral-200">Добавить Идею</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Название Идеи</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Например: Uber для выгула собак"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Описание Идеи</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Опишите проблему, решение и целевую аудиторию..."
                        className="w-full h-40 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all resize-none"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Анализ и Сохранение...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Сохранить в Архив
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
