const { generateBuffer } = require('./_pdf');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { kit, brand_name, category, surface_m2, location_type, country_name } = req.body;

  try {
    const buffer = await generateBuffer(kit, { brand_name, category, surface_m2, location_type, country_name });
    const filename = `retail-kit-${brand_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error generando PDF' });
  }
};
