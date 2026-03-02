import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function SinergyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-20 lg:pb-0">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
                {children}
            </main>
            <MobileNav />
        </div>
    )
}
