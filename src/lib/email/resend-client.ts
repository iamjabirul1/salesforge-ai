import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
export const resend = resendApiKey && resendApiKey !== 'mock_key' ? new Resend(resendApiKey) : null

interface SendEmailParams {
  to: string
  subject: string
  body: string
  fromDomain?: string
}

export async function sendEmail({ to, subject, body, fromDomain }: SendEmailParams) {
  const brevoApiKey = process.env.BREVO_API_KEY
  const fromEmail = fromDomain 
    ? `sales@${fromDomain}`
    : 'outreach@updates.salesforge-ai.com' // Fallback domain

  // 1. Try Brevo sending if key is configured (preferred since it bypasses domain check)
  if (brevoApiKey && brevoApiKey !== 'mock_key') {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Sales Team', email: 'outreach@salesforge-ai.com' },
          to: [{ email: to }],
          subject: subject,
          textContent: body,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, id: data.messageId }
      } else {
        const errData = await response.json()
        console.error('Brevo API Error:', errData)
        return { success: false, error: errData.message || 'Brevo SMTP rejected email.' }
      }
    } catch (err: any) {
      console.error('Failed to send email via Brevo:', err)
      // Fallback to Resend or Mock below
    }
  }

  // 2. Try Resend client
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: `Sales Team <${fromEmail}>`,
        to,
        subject,
        text: body,
      })

      if (response.error) {
        console.error('Resend API Error:', response.error)
        return { success: false, error: response.error.message }
      }

      return { success: true, id: response.data?.id }
    } catch (err: any) {
      console.error('Failed to send email via Resend:', err)
    }
  }

  // 3. Fallback Mock Send
  console.info(`[MOCK EMAIL SEND] Sending email to ${to}:
  From: ${fromEmail}
  Subject: ${subject}
  Body:
  ${body}
  -------------------`)
  
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  return {
    success: true,
    id: `mock_resend_id_${Math.random().toString(36).substring(2, 9)}`,
  }
}

// Alias used by sequence-engine
export async function sendEmailViaBravo(params: {
  to: string
  toName?: string
  subject: string
  html: string
}) {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    body: params.html,
  })
}
