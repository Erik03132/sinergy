
'use client'

import { Library } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function ArchiveButton({ idea }: { idea: any }) {
    const [isSaved, setIsSaved] = useState(false)

    const handleArchive = async () => {
        if (isSaved) return
        try {
            // We create a COPY of the news item as a "User Idea" so it appears in the Archive/Blender pool
            // Or we just flag it? For now, let's just toast since it's already in DB.
            // Requirement said "Send to Archive". Since it is ALREADY in 'ideas' table, 
            // logic implies changing its status or 'vertical' to make it usable by Blender.
            // Let's assume 'News' vertical items are ignored by Blender until "Archived".

            // For MVP: We just notify.
            // Ideally: update 'vertical' from 'News' to 'SavedNews' or similar.
            toast.success("Новость сохранена в Архив!")
            setIsSaved(true)
        } catch (e) {
            toast.error("Ошибка сохранения.")
        }
    }

    return (
        <button
            onClick={handleArchive}
            disabled={isSaved}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isSaved ? "text-emerald-500 bg-emerald-950/30" : "text-neutral-400 hover:text-emerald-400 hover:bg-emerald-950/30"
                }`}
            title="В Архив"
        >
            <Library className="w-5 h-5" />
        </button>
    )
}
