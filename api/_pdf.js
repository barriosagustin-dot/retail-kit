const PDFDocument = require('pdfkit');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 55;
const CW = PAGE_W - ML * 2;

const BLACK  = '#202121';
const GRAY   = '#c9c9c9';
const GRAY_M = '#888888';
const WHITE  = '#ffffff';

function footer(doc) {
  const fy = PAGE_H - 38;
  doc.moveTo(ML, fy).lineTo(PAGE_W - ML, fy).strokeColor(GRAY).lineWidth(0.5).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('Retail Kit — powered by wedo studio', ML, fy + 9, { width: CW / 2, lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, fy + 9, { width: CW, align: 'right', lineBreak: false });
}

function sectionLabel(doc, label) {
  const y = doc.y;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(GRAY).lineWidth(0.5).stroke();
  doc.y = y + 7;
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
    .text(label.toUpperCase(), ML, doc.y, { width: CW, characterSpacing: 1.5 });
  doc.moveDown(0.7);
}

function subLabel(doc, label) {
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
    .text(label.toUpperCase(), ML, doc.y, { width: CW, characterSpacing: 1 });
  doc.moveDown(0.35);
}

function para(doc, text, opts = {}) {
  doc.fontSize(9.5).font('Helvetica').fillColor(BLACK)
    .text(text, ML, doc.y, { width: CW, lineGap: 3, ...opts });
}

function buildPDF(doc, kit, meta) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps = kit.project_summary;

  // ─── PAGE 1 ───────────────────────────────────────────────────────

  // Cover header
  const hh = 148;
  doc.rect(0, 0, PAGE_W, hh).fillColor(BLACK).fill();

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('RETAIL KIT', ML, 34, { characterSpacing: 2.5, width: CW });
  doc.fontSize(28).font('Helvetica-Bold').fillColor(WHITE)
    .text(brand_name, ML, 50, { width: CW });
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text(`${category}  ·  ${surface_m2} m²  ·  ${location_type}  ·  ${country_name}`, ML, 98, { width: CW, characterSpacing: 0.3 });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('powered by wedo studio', ML, 122, { characterSpacing: 0.8, width: CW });

  doc.y = hh + 28;

  // CONCEPTO
  sectionLabel(doc, 'Concepto del proyecto');
  doc.fontSize(13).font('Helvetica').fillColor(BLACK)
    .text(ps.concept, ML, doc.y, { width: CW, lineGap: 4 });
  doc.moveDown(1.1);

  const colW = (CW - 14) / 2;
  const col2x = ML + colW + 14;
  const blockY = doc.y;
  const bPad = 10;

  // Two-column blocks
  for (const [bx, title, text] of [[ML, 'EXPERIENCIA OBJETIVO', ps.target_experience], [col2x, 'INTENCIÓN DE DISEÑO', ps.design_intent]]) {
    doc.rect(bx, blockY, colW, 14).fillColor(BLACK).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE)
      .text(title, bx + bPad, blockY + 4, { width: colW - bPad * 2, characterSpacing: 0.5 });
    doc.fontSize(9).font('Helvetica').fillColor(BLACK)
      .text(text, bx + bPad, blockY + 20, { width: colW - bPad * 2, lineGap: 3 });
  }
  const leftH  = doc.heightOfString(ps.target_experience, { width: colW - bPad * 2, lineGap: 3 });
  const rightH = doc.heightOfString(ps.design_intent, { width: colW - bPad * 2, lineGap: 3 });
  doc.y = blockY + 20 + Math.max(leftH, rightH) + 22;

  // LAYOUT
  sectionLabel(doc, 'Layout y circulación');
  doc.fontSize(8).font('Helvetica-Bold').fillColor(BLACK)
    .text(`DISTRIBUCIÓN DE ZONAS — ${surface_m2} m²`, ML, doc.y, { width: CW, characterSpacing: 0.5 });
  doc.moveDown(0.7);

  kit.layout.zones.forEach((z, i) => {
    const zy = doc.y;
    doc.fontSize(22).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.approx_percentage, ML, zy, { width: 68, lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.name, ML + 72, zy + 6, { width: CW - 72 });
    doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M)
      .text(z.description, ML + 72, doc.y, { width: CW - 72, lineGap: 2 });
    const dH = doc.heightOfString(z.description, { width: CW - 72, lineGap: 2 });
    doc.y = zy + Math.max(30, dH + 22);
    doc.moveTo(ML, doc.y - 2).lineTo(ML + CW, doc.y - 2).strokeColor(GRAY).lineWidth(0.3).stroke();
    doc.y += 6;
  });

  doc.moveDown(0.5);
  subLabel(doc, 'Flujo de clientes');
  para(doc, kit.layout.customer_flow);
  doc.moveDown(0.8);
  subLabel(doc, 'Puntos estratégicos clave');
  kit.layout.key_strategic_points.forEach((p, i) => {
    const py = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
      .text(String(i + 1).padStart(2, '0'), ML, py + 1, { width: 20, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(BLACK)
      .text(p, ML + 22, py, { width: CW - 22, lineGap: 2 });
    const pH = doc.heightOfString(p, { width: CW - 22, lineGap: 2 });
    doc.y = py + pH + 7;
  });

  footer(doc);

  // ─── PAGE 2 ───────────────────────────────────────────────────────
  doc.addPage({ margin: 0 });
  doc.y = 48;

  // Header stripe on page 2
  doc.rect(0, 0, PAGE_W, 36).fillColor(BLACK).fill();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    .text(brand_name.toUpperCase(), ML, 14, { width: CW / 2, characterSpacing: 1 });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('RETAIL KIT', ML, 14, { width: CW, align: 'right', characterSpacing: 1 });
  doc.y = 52;

  // MOBILIARIO table
  sectionLabel(doc, 'Mobiliario y equipamiento');
  const cw = [220, 42, 110, 113];
  let ty = doc.y;

  doc.rect(ML, ty, CW, 20).fillColor(BLACK).fill();
  doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
  let tx = ML + 8;
  [['ÍTEM', 'left'], ['CANT.', 'center'], ['UNIT. USD', 'right'], ['TOTAL USD', 'right']].forEach(([h, a], i) => {
    doc.text(h, tx, ty + 6, { width: cw[i] - 8, align: a, lineBreak: false, characterSpacing: 0.5 });
    tx += cw[i];
  });
  ty += 20;

  kit.furniture_and_equipment.forEach((f, i) => {
    const rh = 18;
    if (i % 2 === 0) doc.rect(ML, ty, CW, rh).fillColor('#f4f4f4').fill();
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK);
    tx = ML + 8;
    [[f.item, 'left'], [String(f.quantity), 'center'],
     [`USD ${f.estimated_unit_cost_usd}`, 'right'], [`USD ${f.total_cost_usd}`, 'right']
    ].forEach(([cell, a], j) => {
      doc.text(cell, tx, ty + 5, { width: cw[j] - 8, align: a, lineBreak: false });
      tx += cw[j];
    });
    ty += rh;
  });
  doc.rect(ML, ty, CW, 1).fillColor(GRAY).fill();
  doc.y = ty + 20;

  // INVERSIÓN
  sectionLabel(doc, 'Estimación de inversión');
  const inv = kit.investment_estimate;

  [['Construcción', inv.construction_cost_usd],
   ['Mobiliario', inv.furniture_cost_usd],
   ['Iluminación', inv.lighting_cost_usd],
   ['Cartelería', inv.signage_cost_usd],
   ['Otros', inv.other_costs_usd],
  ].forEach(([label, val]) => {
    const ry = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor(BLACK).text(label, ML, ry, { width: CW * 0.6, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(BLACK).text(`USD ${val}`, ML, ry, { width: CW, align: 'right', lineBreak: false });
    doc.y = ry + 16;
    doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.3).stroke();
    doc.y += 8;
  });

  // Total box
  doc.moveDown(0.3);
  const totY = doc.y;
  const totH = 48;
  doc.rect(ML, totY, CW, totH).fillColor(BLACK).fill();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('TOTAL ESTIMADO', ML + 16, totY + 11, { characterSpacing: 1 });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(WHITE)
    .text(`USD ${inv.total_estimated_usd}`, ML + 16, totY + 21, { lineBreak: false });
  doc.fontSize(8).font('Helvetica').fillColor(GRAY)
    .text(`USD ${inv.cost_per_m2_usd} / m²`, ML, totY + 30, { width: CW - 16, align: 'right', lineBreak: false });
  doc.y = totY + totH + 16;

  footer(doc);

  // ─── PAGE 3 ───────────────────────────────────────────────────────
  doc.addPage({ margin: 0 });
  doc.y = 48;

  // Header stripe on page 3
  doc.rect(0, 0, PAGE_W, 36).fillColor(BLACK).fill();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    .text(brand_name.toUpperCase(), ML, 14, { width: CW / 2, characterSpacing: 1 });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('RETAIL KIT', ML, 14, { width: CW, align: 'right', characterSpacing: 1 });
  doc.y = 52;

  // CRONOGRAMA
  sectionLabel(doc, 'Cronograma de ejecución');

  kit.timeline.forEach((t, i) => {
    const ty2 = doc.y;
    const cx = ML + 10;
    doc.circle(cx, ty2 + 10, 10).fillColor(BLACK).fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
      .text(String(i + 1), cx - 10, ty2 + 5, { width: 20, align: 'center', lineBreak: false });
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
      .text(`${t.duration_weeks} SEMANAS`, ML + 26, ty2 + 3, { width: CW - 26, characterSpacing: 0.5 });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(t.phase, ML + 26, ty2 + 13, { width: CW - 26 });
    const phH = doc.heightOfString(t.phase, { width: CW - 26 });
    doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
      .text(t.description, ML + 26, ty2 + 15 + phH, { width: CW - 26, lineGap: 2 });
    const dH = doc.heightOfString(t.description, { width: CW - 26, lineGap: 2 });
    const nextY = ty2 + 15 + phH + dH + 18;
    if (i < kit.timeline.length - 1) {
      doc.moveTo(cx, ty2 + 21).lineTo(cx, nextY - 6)
        .strokeColor(GRAY).lineWidth(0.7).dash(3, { space: 3 }).stroke().undash();
    }
    doc.y = nextY;
  });

  doc.moveDown(0.8);

  // RECOMENDACIONES
  sectionLabel(doc, 'Recomendaciones estratégicas');
  const rec = kit.strategic_recommendations;

  [
    ['DECISIONES CLAVE',       rec.key_decisions,    BLACK],
    ['OPTIMIZACIÓN DE COSTOS', rec.cost_optimization, GRAY_M],
    ['RIESGOS A EVITAR',       rec.risks_to_avoid,   '#8B2020'],
  ].forEach(([title, items, accent]) => {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
      .text(title, ML, doc.y, { width: CW, characterSpacing: 1 });
    doc.moveDown(0.35);
    items.forEach(item => {
      const iy = doc.y;
      const itemH = doc.heightOfString(item, { width: CW - 18, lineGap: 2 });
      doc.rect(ML, iy, 2, itemH + 6).fillColor(accent).fill();
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
        .text(item, ML + 12, iy + 3, { width: CW - 18, lineGap: 2 });
      doc.y = iy + itemH + 11;
    });
    doc.moveDown(0.8);
  });

  footer(doc);
}

function generateBuffer(kit, meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildPDF(doc, kit, meta);
    doc.end();
  });
}

module.exports = { generateBuffer };
