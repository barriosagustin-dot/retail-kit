const token = () => process.env.REPLICATE_API_TOKEN;

const CORS = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
  CORS(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const tok = token();
  if (!tok) { res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' }); return; }

  // GET /api/image?id=xxx — poll prediction status
  if (req.method === 'GET') {
    const id = req.query?.id;
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }
    try {
      const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Bearer ${tok}` }
      });
      const p = await r.json();
      if (p.status === 'succeeded') {
        const url = Array.isArray(p.output) ? p.output[0] : p.output;
        return res.status(200).json({ status: 'succeeded', url });
      }
      if (p.status === 'failed' || p.status === 'canceled') {
        return res.status(200).json({ status: p.status, url: null, error: p.error });
      }
      return res.status(200).json({ status: p.status, url: null });
    } catch (e) {
      return res.status(200).json({ status: 'error', url: null, error: e.message });
    }
  }

  // POST /api/image — create prediction, return ID immediately
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { category, country, design_intent } = req.body || {};
  if (!category) { res.status(400).json({ error: 'category is required' }); return; }

  const prompt = `Photorealistic architectural interior render of a high-end ${category} in ${country}, ${design_intent}. Warm professional retail lighting, ultra-detailed materials, no people, no text overlays, no watermarks. Shot from entrance looking in, wide angle. Cinematic quality, 8K, architectural photography style.`;

  try {
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tok}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'jpeg',
          output_quality: 85,
          safety_tolerance: 2
        }
      })
    });
    const prediction = await createRes.json();
    if (prediction.error) throw new Error(prediction.error);
    res.status(200).json({ id: prediction.id, status: prediction.status });
  } catch (e) {
    console.error('[image] create error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
