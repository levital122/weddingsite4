export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RSVP_TO_EMAIL;

  if (!apiKey || !toEmail) {
    return res.status(500).json({ error: 'Server env is not configured' });
  }

  try {
    const {
      slug = 'default',
      invitationTitle = '',
      coupleNames = '',
      greeting = '',
      attendance = '',
      wish = ''
    } = req.body || {};

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const sourcePath = slug === 'default' ? '/' : `/${slug}`;
    const sourceUrl = host ? `${protocol}://${host}${sourcePath}` : sourcePath;

    if (!attendance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const html = `
      <h2>Новый RSVP-ответ</h2>
      <p><b>Slug:</b> ${escapeHtml(slug)}</p>
      <p><b>Ссылка гостя:</b> ${escapeHtml(sourceUrl)}</p>
      <p><b>Страница:</b> ${escapeHtml(invitationTitle)}</p>
      <p><b>Пара:</b> ${escapeHtml(coupleNames)}</p>
      <p><b>Приветствие:</b> ${escapeHtml(greeting)}</p>
      <hr />
      <p><b>Присутствие:</b> ${escapeHtml(attendance)}</p>
      <p><b>Пожелание:</b><br/>${escapeHtml(wish || '—')}</p>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Wedding RSVP <onboarding@resend.dev>',
        to: [toEmail],
        subject: `RSVP: ${greeting || coupleNames || slug}`,
        html
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(502).json({ error: resendData?.message || 'Resend request failed' });
    }

    return res.status(200).json({ ok: true, id: resendData?.id || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
