const { Resend } = require('resend');
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

  const resend = new Resend(apiKey);
  const filename = `retail-kit-${brand_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  try {
    const buffer = await generateBuffer(kit, { brand_name, category, surface_m2, location_type, country_name });

    const { error: err1 } = await resend.emails.send({
      from: 'Retail Kit <onboarding@resend.dev>',
      to: [email],
      subject: `Tu Retail Kit — ${brand_name}`,
      html: `<div style="font-family:sans-serif;max-width:520px;color:#202121">
        <p style="margin:0 0 16px">Hola,</p>
        <p style="margin:0 0 16px">Adjuntamos tu <strong>Retail Kit</strong> para <strong>${brand_name}</strong>.</p>
        <p style="margin:0 0 24px">Concepto, layout, inversión y estrategia — todo en un documento.</p>
        <p style="margin:0;font-size:12px;color:#888">Retail Kit — powered by <strong>wedo studio</strong></p>
      </div>`,
      attachments: [{ filename, content: buffer }],
    });

    if (err1) throw new Error(err1.message);

    await resend.emails.send({
      from: 'Retail Kit <onboarding@resend.dev>',
      to: ['barrios.agustin@gmail.com'],
      subject: `Nuevo lead Retail Kit: ${brand_name}`,
      html: `<div style="font-family:sans-serif;color:#202121">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Marca:</strong> ${brand_name}</p>
        <p><strong>Categoría:</strong> ${category}</p>
        <p><strong>Superficie:</strong> ${surface_m2} m²</p>
        <p><strong>Ubicación:</strong> ${location_type}</p>
        <p><strong>País:</strong> ${country_name}</p>
      </div>`,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Error enviando email' });
  }
};
