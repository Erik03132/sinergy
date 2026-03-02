
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SINERGY_NAV_ITEMS } from '@/lib/sinergy/nav-config'
import { cn } from '@/lib/utils'

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden lg:flex w-64 border-r border-neutral-800 bg-neutral-950 flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-neutral-800">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    SINERGY
                </div>
                <div className="text-xs text-neutral-500 mt-1">Sinergy Startup Engine</div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {SINERGY_NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                                isActive
                                    ? "bg-neutral-900 text-white border border-neutral-800/50 shadow-sm"
                                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                            )}
                        >
                            <Icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-emerald-500" : "text-neutral-500 group-hover:text-neutral-300"
                            )} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{item.name}</span>
                            </div>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-neutral-800">
                <div className="bg-neutral-900/50 rounded-lg p-3 text-xs text-neutral-500 text-center">
                    Sprint 3
                </div>
            </div>
        </aside>
    )
}
