
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SINERGY_NAV_ITEMS } from '@/lib/sinergy/nav-config'
import { cn } from '@/lib/utils'

export function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-lg border-t border-neutral-800 px-2 py-1 safe-area-pb">
            <div className="flex justify-around items-center max-w-md mx-auto h-16">
                {SINERGY_NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all",
                                isActive
                                    ? "text-emerald-400"
                                    : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-colors",
                                isActive ? "bg-emerald-500/10" : ""
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
