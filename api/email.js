const { generateBuffer } = require('./_pdf');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email, kit, brand_name, category, surface_m2, location_type, country_name } = req.body;
  if (!email || !kit) { res.status(400).json({ error: 'Faltan datos' }); return; }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'RESEND_API_KEY no configurada' }); return; }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Retail Kit <onboarding@resend.dev>';

  try {
    const buffer = await generateBuffer(kit, { brand_name, category, surface_m2, location_type, country_name });
    const pdfBase64 = buffer.toString('base64');
    const filename = `retail-kit-${brand_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

    const send = (to, subject, html, attachments) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to, subject, html, attachments }),
      });

    await send(
      email,
      `Tu Retail Kit — ${brand_name}`,
      `<p>Hola,</p><p>Adjuntamos tu <strong>Retail Kit</strong> para <strong>${brand_name}</strong>.</p><p>Concepto, layout, inversión y estrategia — todo en un documento.</p><br><p style="color:#777;font-size:12px">Retail Kit — powered by wedo studio</p>`,
      [{ filename, content: pdfBase64 }]
    );

    await send(
      'barrios.agustin@gmail.com',
      `Nuevo lead Retail Kit: ${brand_name}`,
      `<p><strong>Email:</strong> ${email}<br><strong>Marca:</strong> ${brand_name}<br><strong>Categoría:</strong> ${category}<br><strong>Superficie:</strong> ${surface_m2}m²<br><strong>Ubicación:</strong> ${location_type}<br><strong>País:</strong> ${country_name}</p>`
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error enviando email' });
  }
};
