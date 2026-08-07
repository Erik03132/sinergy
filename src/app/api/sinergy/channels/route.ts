import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processManualUrl, registerChannel } from "@/lib/sinergy/source-processor";

export async function GET() {
    const supabase = await createClient();
    const { data } = await supabase.from('channels').select('*').order('last_scanned_at', { ascending: false });
    return NextResponse.json(data || []);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { url, action } = body;

        if (action === 'init') {
            const defaults = [
                { title: "Bug Feature", url: "https://t.me/bugfeature", sourceType: "telegram" },
                { title: "Neuro Channel", url: "https://t.me/neuro_channel", sourceType: "telegram" },
                { title: "TechSparks", url: "https://t.me/tech_sparks", sourceType: "telegram" },
                { title: "Denis SEO/IT", url: "https://t.me/denissexyit", sourceType: "telegram" }
            ];

            for (const ch of defaults) {
                await registerChannel(ch as any);
            }
            return NextResponse.json({ success: true, count: defaults.length });
        }

        if (!url) return NextResponse.json({ error: "Требуется URL" }, { status: 400 });

        await processManualUrl(url);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Требуется ID" }, { status: 400 });

    const supabase = await createClient();
    await supabase.from('channels').delete().eq('id', id);
    return NextResponse.json({ success: true });
}
