const Anthropic = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { brand_name, category, surface_m2, location_type, brand_positioning, budget_level, opening_deadline_days, main_objective, country_name } = req.body;

  const prompt = `Actuá como un consultor senior en arquitectura comercial y expansión de retail en LATAM.

Generá un Retail Kit completo para este proyecto:
- Marca: ${brand_name}
- Categoría: ${category}
- Superficie: ${surface_m2}m²
- Ubicación: ${location_type}
- País: ${country_name}
- Posicionamiento: ${brand_positioning}
- Presupuesto: ${budget_level}
- Días hasta apertura: ${opening_deadline_days}
- Objetivo: ${main_objective}

Respondé ÚNICAMENTE en JSON válido con esta estructura exacta, sin texto fuera del JSON:
{
  "project_summary": {
    "concept": "",
    "target_experience": "",
    "design_intent": ""
  },
  "layout": {
    "zones": [{"name":"","description":"","approx_percentage":""}],
    "customer_flow": "",
    "key_strategic_points": []
  },
  "furniture_and_equipment": [{"item":"","quantity":"","estimated_unit_cost_usd":"","total_cost_usd":""}],
  "investment_estimate": {
    "construction_cost_usd": "",
    "furniture_cost_usd": "",
    "lighting_cost_usd": "",
    "signage_cost_usd": "",
    "other_costs_usd": "",
    "total_estimated_usd": "",
    "cost_per_m2_usd": ""
  },
  "timeline": [{"phase":"","duration_weeks":"","description":""}],
  "strategic_recommendations": {
    "key_decisions": [],
    "cost_optimization": [],
    "risks_to_avoid": []
  },
  "image_generation_prompts": {
    "interior_render": "",
    "layout_top_view": ""
  }
}

Reglas:
- Todos los costos en USD coherentes con mercado de ${country_name}
- Contenido específico para ${category}, no genérico
- Nivel de inversión acorde a: ${brand_positioning}
- Cronograma realista para ${opening_deadline_days} días`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const kit = JSON.parse(clean);
    res.status(200).json(kit);
  } catch (error) {
    console.error('Error completo:', JSON.stringify(error));
    res.status(500).json({ 
      error: 'Error generando el kit', 
      details: error.message,
      type: error.constructor.name,
      status: error.status || 'unknown'
    });
  } 