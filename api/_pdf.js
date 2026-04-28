const PDFDocument = require('pdfkit');

const M = 50;
const W = 495;
const INK = '#1a1a1a';
const INK2 = '#444444';
const INK3 = '#777777';
const BG = '#f5f5f3';
const BORDER = '#d8d8d4';

function section(doc, label) {
  doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3).text(label);
  doc.moveDown(0.3);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function rowLine(doc, left, right, bold) {
  const y = doc.y;
  doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? INK : INK2)
    .text(left, M, y, { width: 300 });
  doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(INK)
    .text(right, M + 300, y, { width: W - 300, align: 'right' });
  doc.moveDown(0.45);
}

function buildPDF(doc, kit, meta) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps = kit.project_summary;

  // HEADER
  doc.fontSize(8).font('Helvetica').fillColor(INK3).text('RETAIL KIT');
  doc.fontSize(22).font('Helvetica-Bold').fillColor(INK).text(brand_name);
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor(INK3)
    .text(`${category} · ${surface_m2}m² · ${location_type} · ${country_name}`);
  doc.moveDown(0.8);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(INK).lineWidth(1).stroke();
  doc.moveDown(1);

  // CONCEPTO
  section(doc, 'CONCEPTO DEL PROYECTO');
  doc.fontSize(12).font('Helvetica').fillColor(INK).text(ps.concept, { lineGap: 3 });
  doc.moveDown(0.7);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3).text('EXPERIENCIA OBJETIVO');
  doc.moveDown(0.2);
  doc.fontSize(9).font('Helvetica').fillColor(INK2).text(ps.target_experience, { lineGap: 2 });
  doc.moveDown(0.6);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3).text('INTENCIÓN DE DISEÑO');
  doc.moveDown(0.2);
  doc.fontSize(9).font('Helvetica').fillColor(INK2).text(ps.design_intent, { lineGap: 2 });
  doc.moveDown(0.8);

  // LAYOUT
  section(doc, 'LAYOUT Y CIRCULACIÓN');
  doc.fontSize(8).font('Helvetica-Bold').fillColor(INK).text(`Distribución de zonas — ${surface_m2}m²`);
  doc.moveDown(0.5);
  kit.layout.zones.forEach(z => {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK)
      .text(`${z.approx_percentage}  ${z.name}`);
    doc.fontSize(8).font('Helvetica').fillColor(INK2)
      .text(z.description, { lineGap: 2 });
    doc.moveDown(0.3);
  });
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor(INK2).text(kit.layout.customer_flow, { lineGap: 3 });
  doc.moveDown(0.5);
  kit.layout.key_strategic_points.forEach((p, i) => {
    doc.fontSize(9).font('Helvetica').fillColor(INK2)
      .text(`${String(i + 1).padStart(2, '0')}  ${p}`, { lineGap: 2 });
    doc.moveDown(0.2);
  });

  // PAGE 2
  doc.addPage();

  // MOBILIARIO (tabla con coordenadas absolutas)
  section(doc, 'MOBILIARIO Y EQUIPAMIENTO');
  const cw = [210, 45, 115, 115];
  let ty = doc.y;
  doc.rect(M, ty, W, 18).fillColor(BG).fill();
  doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3);
  let tx = M + 6;
  [['ÍTEM', 'left'], ['CANT.', 'left'], ['UNIT. USD', 'right'], ['TOTAL USD', 'right']].forEach(([h, a], i) => {
    doc.text(h, tx, ty + 5, { width: cw[i] - 6, align: a });
    tx += cw[i];
  });
  ty += 20;
  kit.furniture_and_equipment.forEach((f, i) => {
    if (i % 2 === 0) doc.rect(M, ty, W, 17).fillColor('#f8f8f6').fill();
    doc.fontSize(8).font('Helvetica').fillColor(INK2);
    tx = M + 6;
    [
      [f.item, 'left'], [String(f.quantity), 'left'],
      [`USD ${f.estimated_unit_cost_usd}`, 'right'], [`USD ${f.total_cost_usd}`, 'right'],
    ].forEach(([cell, a], j) => {
      doc.text(cell, tx, ty + 4, { width: cw[j] - 6, align: a });
      tx += cw[j];
    });
    ty += 17;
  });
  doc.y = ty + 15;

  // INVERSIÓN
  section(doc, 'ESTIMACIÓN DE INVERSIÓN');
  const inv = kit.investment_estimate;
  [
    ['Construcción', `USD ${inv.construction_cost_usd}`],
    ['Mobiliario', `USD ${inv.furniture_cost_usd}`],
    ['Iluminación', `USD ${inv.lighting_cost_usd}`],
    ['Cartelería', `USD ${inv.signage_cost_usd}`],
    ['Otros', `USD ${inv.other_costs_usd}`],
  ].forEach(([l, v]) => rowLine(doc, l, v, false));
  doc.moveDown(0.2);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  rowLine(doc, 'Total estimado', `USD ${inv.total_estimated_usd}`, true);
  doc.fontSize(8).font('Helvetica').fillColor(INK3)
    .text(`Costo por m²: USD ${inv.cost_per_m2_usd}`, { align: 'right' });
  doc.moveDown(0.8);

  // CRONOGRAMA
  section(doc, 'CRONOGRAMA DE EJECUCIÓN');
  kit.timeline.forEach(t => {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3)
      .text(`${t.duration_weeks} SEMANAS`, { continued: true });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text(`  ${t.phase}`);
    doc.fontSize(8).font('Helvetica').fillColor(INK2).text(t.description, { lineGap: 2, indent: 10 });
    doc.moveDown(0.5);
  });
  doc.moveDown(0.3);

  // RECOMENDACIONES
  section(doc, 'RECOMENDACIONES ESTRATÉGICAS');
  const rec = kit.strategic_recommendations;
  [
    ['DECISIONES CLAVE', rec.key_decisions],
    ['OPTIMIZACIÓN DE COSTOS', rec.cost_optimization],
    ['RIESGOS A EVITAR', rec.risks_to_avoid],
  ].forEach(([title, items]) => {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(INK3).text(title);
    doc.moveDown(0.3);
    items.forEach(item => {
      doc.fontSize(8).font('Helvetica').fillColor(INK2)
        .text(`•  ${item}`, { lineGap: 2, indent: 10 });
      doc.moveDown(0.2);
    });
    doc.moveDown(0.5);
  });

  // FOOTER
  doc.moveDown(0.5);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor(INK3)
    .text('Retail Kit — powered by wedo studio · wedo-studio.com', { align: 'center' });
}

function generateBuffer(kit, meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: M, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildPDF(doc, kit, meta);
    doc.end();
  });
}

module.exports = { generateBuffer };
