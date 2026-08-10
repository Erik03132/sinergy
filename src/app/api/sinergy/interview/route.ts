import { askGemini } from '@/lib/ai/gemini'
import { InterviewQuestion } from '@/types/sinergy'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type InterviewResponse = {
    questions: InterviewQuestion[]
}

const INTERVIEW_PROMPT = (title: string, description: string) => `
You are a startup co-founder doing pre-verdict discovery. Before a verdict, you must ask clarifying questions.

Idea:
Title: "${title}"
Description: "${description}"

Generate 3-5 clarifying questions covering, in order of priority:
1. audience  — who is the exact target customer (niche, not "everyone")
2. geo       — geography / market region
3. monetization — how will it make money (business model)
4. competitors — who else solves this / how are they different
5. (optional, if useful) traction / timeline / distribution channel

Return STRICTLY valid JSON, no markdown:
{
  "questions": [
    { "id": "q1", "prompt": "Вопрос на русском", "rationale": "Короткое обоснование", "field": "audience" },
    { "id": "q2", "prompt": "...", "rationale": "...", "field": "geo" }
  ]
}

Rules:
- Language: RUSSIAN for prompts.
- Questions must be concrete, not "общие". No more than 5. Minimum 3.
- Each question has a unique id q1..q5.
`

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { title, description } = body

        if (!title || !description) {
            return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 })
        }

        const prompt = INTERVIEW_PROMPT(title, description)
        const responseRaw = await askGemini(prompt)
        const cleanJson = responseRaw.replace(/```json/g, '').replace(/```/g, '').trim()

        let parsed: InterviewResponse
        try {
            parsed = JSON.parse(cleanJson)
        } catch (e) {
            console.error('Failed to parse interview JSON:', cleanJson)
            return NextResponse.json(
                { error: 'Не удалось сгенерировать вопросы', questions: FALLBACK_QUESTIONS(title) },
                { status: 200 }
            )
        }

        const questions = Array.isArray(parsed.questions) && parsed.questions.length > 0
            ? parsed.questions.slice(0, 5)
            : FALLBACK_QUESTIONS(title)

        return NextResponse.json({ questions })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Interview API Error:', message)
        return NextResponse.json({ error: 'AI временно недоступен' }, { status: 500 })
    }
}

const FALLBACK_QUESTIONS = (title: string): InterviewQuestion[] => [
    {
        id: 'q1',
        prompt: 'Кто ваш целевой клиент? (не «все», а конкретная ниша)',
        rationale: 'Уточнение аудитории',
        field: 'audience'
    },
    {
        id: 'q2',
        prompt: 'Для какого региона/географии продукт?',
        rationale: 'Рынок',
        field: 'geo'
    },
    {
        id: 'q3',
        prompt: 'Как планируете зарабатывать?',
        rationale: 'Монетизация',
        field: 'monetization'
    },
    {
        id: 'q4',
        prompt: 'Кто уже решает эту проблему, и чем вы отличаетесь?',
        rationale: 'Конкуренты',
        field: 'competitors'
    }
]