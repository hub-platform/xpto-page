import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isReservedSlug } from '@/lib/slug'
import { getViewerSession } from '@/lib/session'
import type { Asset } from '@/lib/types'

const VIEWER_AUTH_HTML = (slug: string, publicationId: string, title: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso restrito &mdash; ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #030712; color: #f9fafb; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; width: 100%; max-width: 380px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .sub { color: #9ca3af; font-size: 14px; margin-bottom: 24px; }
    label { display: block; font-size: 14px; font-weight: 500; color: #d1d5db; margin-bottom: 6px; }
    input { width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 10px 16px; color: #fff; font-size: 14px; outline: none; margin-bottom: 16px; }
    input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
    button { width: 100%; background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .otp-grid { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
    .otp-grid input { width: 48px; height: 48px; text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 0; padding: 0; }
    .error { color: #f87171; font-size: 13px; margin-bottom: 12px; }
    .back-btn { width: 100%; background: transparent; color: #6b7280; border: none; cursor: pointer; font-size: 13px; margin-top: 12px; padding: 8px; }
    .back-btn:hover { color: #9ca3af; }
    .logo { text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Page</div>
    <div id="email-step">
      <h1>Acesso restrito</h1>
      <p class="sub">Digite seu e-mail para acessar <strong>${title}</strong></p>
      <label>E-mail</label>
      <input type="email" id="email-input" placeholder="seu@email.com" />
      <div id="email-error" class="error" style="display:none"></div>
      <button id="send-btn" onclick="sendCode()">Enviar c&oacute;digo</button>
    </div>
    <div id="otp-step" style="display:none">
      <h1>Verificar c&oacute;digo</h1>
      <p class="sub" id="otp-sub">Enviamos um c&oacute;digo para seu e-mail</p>
      <div class="otp-grid" id="otp-grid">
        <input type="text" maxlength="1" inputmode="numeric" />
        <input type="text" maxlength="1" inputmode="numeric" />
        <input type="text" maxlength="1" inputmode="numeric" />
        <input type="text" maxlength="1" inputmode="numeric" />
        <input type="text" maxlength="1" inputmode="numeric" />
        <input type="text" maxlength="1" inputmode="numeric" />
      </div>
      <div id="otp-error" class="error" style="display:none"></div>
      <button id="verify-btn" onclick="verifyCode()">Entrar</button>
      <button class="back-btn" onclick="showEmailStep()">Usar outro e-mail</button>
    </div>
  </div>
  <script>
    var pubId = '${publicationId}';
    var userEmail = '';
    var otpInputs = document.getElementById('otp-grid').querySelectorAll('input');

    otpInputs.forEach(function(inp, idx) {
      inp.addEventListener('input', function() {
        inp.value = inp.value.replace(/\\D/g, '').slice(-1);
        if (inp.value && idx < 5) otpInputs[idx + 1].focus();
      });
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !inp.value && idx > 0) otpInputs[idx - 1].focus();
      });
    });

    function showEmailStep() {
      document.getElementById('email-step').style.display = '';
      document.getElementById('otp-step').style.display = 'none';
    }

    function setError(id, msg) {
      var el = document.getElementById(id);
      el.textContent = msg;
      el.style.display = msg ? '' : 'none';
    }

    async function sendCode() {
      var email = document.getElementById('email-input').value.trim();
      if (!email) return;
      setError('email-error', '');
      var btn = document.getElementById('send-btn');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        var res = await fetch('/api/viewer/send', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({email: email, publicationId: pubId})
        });
        var data = await res.json();
        if (data.allowed === false) {
          setError('email-error', 'E-mail nao autorizado para esta publicacao.');
        } else if (data.sent) {
          userEmail = email;
          document.getElementById('otp-sub').textContent = 'Enviamos um codigo para ' + email;
          document.getElementById('email-step').style.display = 'none';
          document.getElementById('otp-step').style.display = '';
          otpInputs[0].focus();
        } else {
          setError('email-error', data.error || 'Erro ao enviar codigo');
        }
      } catch(e) {
        setError('email-error', 'Erro ao enviar codigo');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar codigo';
      }
    }

    async function verifyCode() {
      var code = Array.from(otpInputs).map(function(i) { return i.value; }).join('');
      if (code.length < 6) return;
      setError('otp-error', '');
      var btn = document.getElementById('verify-btn');
      btn.disabled = true;
      btn.textContent = 'Verificando...';
      try {
        var res = await fetch('/api/viewer/verify', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({email: userEmail, publicationId: pubId, code: code})
        });
        var data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          setError('otp-error', data.error || 'Codigo invalido');
          btn.disabled = false;
          btn.textContent = 'Entrar';
        }
      } catch(e) {
        setError('otp-error', 'Erro ao verificar codigo');
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    }
  </script>
</body>
</html>`

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  if (isReservedSlug(slug)) return NextResponse.next()

  const publication = await db.publication.findUnique({
    where: { slug },
    include: {
      currentVersion: {
        include: { assets: true }
      }
    }
  })

  if (!publication || !publication.currentVersion) {
    return new NextResponse('Publicação não encontrada', { status: 404 })
  }

  // Verify expiration
  if (publication.expiresAt && publication.expiresAt < new Date()) {
    return new NextResponse('Esta publicação expirou', { status: 410 })
  }

  // Protected access check
  if (publication.accessType === 'protected') {
    const session = await getViewerSession(publication.id)
    if (!session) {
      return new NextResponse(
        VIEWER_AUTH_HTML(slug, publication.id, publication.title),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }
  }

  // Serve entry point
  const entryPath = publication.currentVersion.entryPointPath
  const assets = publication.currentVersion.assets as Asset[]
  const asset = assets.find((a) => a.filePath === entryPath)
  if (!asset) return new NextResponse('Arquivo não encontrado', { status: 404 })

  const response = await fetch(asset.storageKey)
  let html = await response.text()

  // Inject analytics script
  const analyticsScript = `<script>
(function(){
  var s=Date.now(),pid='${publication.id}',asset='${entryPath}';
  fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'page_view',pid:pid,asset:asset})});
  window.addEventListener('beforeunload',function(){
    navigator.sendBeacon('/api/analytics/event',
      JSON.stringify({type:'duration',pid:pid,asset:asset,duration:Math.round((Date.now()-s)/1000)}));
  });
})();
</script>`

  if (html.includes('</body>')) {
    html = html.replace('</body>', analyticsScript + '</body>')
  } else {
    html = html + analyticsScript
  }

  // Branding bar
  if (publication.showBranding) {
    const brandingBar = `<div style="position:fixed;top:0;left:0;right:0;height:32px;background:#000;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:12px;font-family:sans-serif;z-index:99999">
      <span>${publication.title}</span>
      <a href="https://page.xptobeta.com" style="color:#aaa;text-decoration:none">Powered by Page</a>
    </div>
    <div style="height:32px"></div>`
    if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>' + brandingBar)
    }
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
