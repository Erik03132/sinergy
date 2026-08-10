
'use client'

import React, { useState } from 'react'
import { Loader2, Save, MessageSquareText, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { InterviewAnswers, InterviewQuestion } from '@/types/sinergy'

type Step = 'form' | 'interview'

export default function AddIdeaPage() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [step, setStep] = useState<Step>('form')
    const [questions, setQuestions] = useState<InterviewQuestion[]>([])
    const [answers, setAnswers] = useState<InterviewAnswers>({})
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const loadInterview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !description) return

        setIsLoading(true)
        try {
            const res = await fetch('/api/sinergy/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Не удалось сгенерировать вопросы')

            const qs: InterviewQuestion[] = Array.isArray(data.questions) ? data.questions : []
            if (qs.length === 0) throw new Error('Вопросы не получены')

            setQuestions(qs)
            setAnswers(Object.fromEntries(qs.map(q => [q.id, ''])))
            setStep('interview')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Не удалось сгенерировать вопросы.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !description) return

        const answered = Object.values(answers).some(v => v.trim().length > 0)
        if (!answered) {
            toast.error('Ответьте хотя бы на один вопрос')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/sinergy/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, interview_answers: answers }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                const errorMessage = err.details ? `${err.error}: ${err.details}` : (err.error || 'Ошибка при сохранении')
                throw new Error(errorMessage)
            }

            toast.success("Идея добавлена и отправлена в Архив!")
            router.push('/sinergy/archive')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Не удалось сохранить идею.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const backToForm = () => {
        setStep('form')
        setQuestions([])
        setAnswers({})
    }

    if (step === 'interview') {
        return (
            <div className="container mx-auto max-w-2xl py-12 px-4">
                <button
                    type="button"
                    onClick={backToForm}
                    className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Изменить идею
                </button>

                <h1 className="text-2xl font-bold mb-2 text-neutral-200">Уточняющие вопросы</h1>
                <p className="text-sm text-neutral-400 mb-8">
                    Ответы помогут точнее классифицировать идею и вердикт будет качественнее.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {questions.map(q => (
                        <div key={q.id} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                {q.prompt}
                                {q.rationale && (
                                    <span className="block text-xs text-neutral-500 mt-1">{q.rationale}</span>
                                )}
                            </label>
                            <textarea
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Ваш ответ..."
                                className="w-full h-20 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all resize-none"
                            />
                        </div>
                    ))}

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

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <h1 className="text-2xl font-bold mb-8 text-neutral-200">Добавить Идею</h1>

            <form onSubmit={loadInterview} className="space-y-6">
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
                    disabled={isLoading}
                    className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Генерация вопросов...
                        </>
                    ) : (
                        <>
                            <MessageSquareText className="w-5 h-5" />
                            Далее: уточняющие вопросы
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
