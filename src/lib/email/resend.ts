/**
 * Email через Resend
 * Документация: https://resend.com/docs
 */

interface SendEmailOptions {
    to: string
    subject: string
    html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.error('RESEND_API_KEY не задан — email не отправлен')
        return
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'noreply@yourdomain.com',
            to,
            subject,
            html,
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Email send failed: ${error}`)
    }
}
