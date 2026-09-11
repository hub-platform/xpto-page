import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL!

export async function sendPublisherCode(email: string, code: string, isNew: boolean) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: isNew ? 'Bem-vindo ao Page — seu código de acesso' : 'Seu código de acesso ao Page',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>${isNew ? 'Bem-vindo ao Page!' : 'Seu código de acesso'}</h2>
        <p>Use o código abaixo para ${isNew ? 'criar sua conta' : 'entrar'}:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0">${code}</div>
        <p style="color:#666;font-size:14px">Válido por 15 minutos. Não compartilhe este código.</p>
      </div>
    `,
  })
}

export async function sendViewerCode(email: string, code: string, publicationTitle: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Seu código de acesso — ${publicationTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Acesso à publicação</h2>
        <p>Use o código abaixo para acessar <strong>${publicationTitle}</strong>:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0">${code}</div>
        <p style="color:#666;font-size:14px">Válido por 15 minutos. Você não precisa criar uma conta.</p>
      </div>
    `,
  })
}
