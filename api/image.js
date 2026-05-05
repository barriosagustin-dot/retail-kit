module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { category, country, design_intent } = req.body || {};
  if (!category) { res.status(400).json({ error: 'category is required' }); return; }

  const prompt = `Photorealistic architectural interior render of a high-end ${category} in ${country}, ${design_intent}. Warm professional retail lighting, ultra-detailed materials, no people, no text overlays, no watermarks. Shot from entrance looking in, wide angle. Cinematic quality, 8K, architectural photography style.`;

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' }); return; }

  try {
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=55'
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'jpg',
          output_quality: 85,
          safety_tolerance: 2
        }
      })
    });

    const prediction = await createRes.json();
    if (prediction.error) throw new Error(prediction.error);

    if (prediction.status === 'succeeded') {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      res.status(200).json({ url });
      return;
    }

    const predId = prediction.id;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const poll = await pollRes.json();
      if (poll.status === 'succeeded') {
        const url = Array.isArray(poll.output) ? poll.output[0] : poll.output;
        res.status(200).json({ url });
        return;
      }
      if (poll.status === 'failed' || poll.status === 'canceled') {
        throw new Error(`Prediction ${poll.status}`);
      }
    }
    throw new Error('Timeout generating image');
  } catch (error) {
    res.status(500).json({ error: 'Error generating image', details: error.message });
  }
};
