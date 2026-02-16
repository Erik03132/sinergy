
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function MyIdeasPage() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !description.trim()) return

        setIsLoading(true)
        try {
            const res = await fetch('/api/sinergy/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            })

            if (!res.ok) throw new Error('Failed to save idea')

            toast.success('Idea added successfully!')
            setTitle('')
            setDescription('')
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-neutral-100">My Startup Ideas</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 backdrop-blur-sm">
                <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium text-neutral-300">
                        Title
                    </label>
                    <input
                        id="title"
                        type="text"
                        placeholder="e.g. AI-powered Dog Walker"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-neutral-800 border-neutral-700 text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all p-3"
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium text-neutral-300">
                        Description
                    </label>
                    <textarea
                        id="description"
                        rows={5}
                        placeholder="Describe your idea in detail..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-neutral-800 border-neutral-700 text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all p-3 resize-none"
                        disabled={isLoading}
                    />
                    <p className="text-xs text-neutral-500">
                        We'll automatically classify this idea using Gemini.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !title || !description}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing with Gemini...
                        </>
                    ) : (
                        'Save Idea'
                    )}
                </button>
            </form>
        </div>
    )
}
