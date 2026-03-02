import Link from 'next/link'
import { Sparkles, Newspaper, Search, Shuffle, ArrowRight } from 'lucide-react'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] -z-10" />

            <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900/50 border border-neutral-800 text-emerald-400 text-sm font-medium mb-4">
                        <Sparkles className="w-4 h-4" />
                        <span>AI-Powered Startup Platform</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
                        Sinergy <span className="text-emerald-500">App</span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Платформа для поиска, анализа и генерации стартап-идей.
                        <br />
                        Ваш второй пилот в мире венчура.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 w-full max-w-4xl mx-auto">
                    <Link href="/sinergy/feed" className="group">
                        <div className="h-full bg-neutral-900/40 border border-neutral-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all hover:bg-neutral-900/60 flex flex-col items-center text-center gap-4">
                            <div className="p-3 rounded-xl bg-neutral-800 group-hover:bg-emerald-900/30 group-hover:text-emerald-400 transition-colors">
                                <Newspaper className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Лента Идей</h3>
                                <p className="text-sm text-neutral-500">Свежие тренды и кейсы каждый день.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/sinergy/find" className="group">
                        <div className="h-full bg-neutral-900/40 border border-neutral-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:bg-neutral-900/60 flex flex-col items-center text-center gap-4">
                            <div className="p-3 rounded-xl bg-neutral-800 group-hover:bg-blue-900/30 group-hover:text-blue-400 transition-colors">
                                <Search className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Найти Идею</h3>
                                <p className="text-sm text-neutral-500">Анализ рынка и конкурентов за секунды.</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/sinergy/blender" className="group">
                        <div className="h-full bg-neutral-900/40 border border-neutral-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all hover:bg-neutral-900/60 flex flex-col items-center text-center gap-4">
                            <div className="p-3 rounded-xl bg-neutral-800 group-hover:bg-purple-900/30 group-hover:text-purple-400 transition-colors">
                                <Shuffle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Блендер</h3>
                                <p className="text-sm text-neutral-500">Генератор неожиданных комбинаций.</p>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="pt-12">
                    <Link
                        href="/sinergy/feed"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-neutral-200 rounded-full font-bold transition-all transform hover:scale-105"
                    >
                        Начать работу
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            <footer className="absolute bottom-8 text-neutral-600 text-sm">
                © 2026 Sinergy Inc. Built with Next.js & Gemini.
            </footer>
        </main>
    )
}
