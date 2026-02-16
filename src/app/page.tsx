export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-4">Добро пожаловать</h1>
            <p className="text-lg text-gray-500 mb-8">Шаблон готов к работе. Начните разработку!</p>
            <div className="flex gap-4">
                <a
                    href="https://nextjs.org/docs"
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Next.js Docs
                </a>
                <a
                    href="https://supabase.com/docs"
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Supabase Docs
                </a>
            </div>
        </main>
    )
}
