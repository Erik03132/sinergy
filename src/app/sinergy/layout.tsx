
import { Sidebar } from '@/components/layout/Sidebar'

export default function SinergyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {children}
            </main>
        </div>
    )
}
