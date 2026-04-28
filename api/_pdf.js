const PDFDocument = require('pdfkit');

const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const ML      = 44;
const CW      = PAGE_W - ML * 2;   // 507.28

const BLACK  = '#202121';
const GRAY   = '#c9c9c9';
const GRAY_M = '#888888';
const WHITE  = '#ffffff';

const FOOTER_Y = PAGE_H - 28;

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

function footer(doc) {
  doc.moveTo(ML, FOOTER_Y).lineTo(PAGE_W - ML, FOOTER_Y).strokeColor(GRAY).lineWidth(0.4).stroke();
  doc.fontSize(6.5).font('Helvetica').fillColor(GRAY)
    .text('Retail Kit — powered by wedo studio', ML, FOOTER_Y + 7, { lineBreak: false });
  doc.fontSize(6.5).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, FOOTER_Y + 7, { width: CW, align: 'right', lineBreak: false });
}

function pageStripe(doc, brandName) {
  doc.rect(0, 0, PAGE_W, 24).fillColor(BLACK).fill();
  doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE)
    .text(brandName.toUpperCase(), ML, 8, { lineBreak: false, characterSpacing: 0.4 });
  doc.fontSize(6.5).font('Helvetica').fillColor(GRAY)
    .text('RETAIL KIT · wedo studio', ML, 9, { width: CW, align: 'right', lineBreak: false });
  doc.y = 32;
}

function sec(doc, label) {
  const y = doc.y;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK)
    .text(label, ML, y, { width: CW });
  const ly = doc.y;
  doc.moveTo(ML, ly).lineTo(ML + CW, ly).strokeColor(GRAY).lineWidth(0.4).stroke();
  doc.y = ly + 6;
}

function buildPDF(doc, kit, meta, imgBuf) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps = kit.project_summary;

  // ─── PAGE 1 ────────────────────────────────────────────────────────

  // Main header — black bar
  const hh = 88;
  doc.rect(0, 0, PAGE_W, hh).fillColor(BLACK).fill();

  // WEDO logo (left)
  doc.fontSize(21).font('Helvetica').fillColor(WHITE)
    .text('wedo', ML, 18, { lineBreak: false });
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('STUDIO', ML, 46, { characterSpacing: 3.5, lineBreak: false });

  // Separator
  doc.moveTo(ML + 72, 14).lineTo(ML + 72, hh - 14).strokeColor('#3a3a3a').lineWidth(0.5).stroke();

  // Brand info (right of separator)
  const bx = ML + 86;
  const bw = PAGE_W - bx - ML;
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('RETAIL KIT', bx, 17, { width: bw, characterSpacing: 1.5, lineBreak: false });
  doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
    .text(brand_name, bx, 28, { width: bw, lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
    .text(`${category}  ·  ${surface_m2}m²  ·  ${location_type}  ·  ${country_name}`, bx, 60, { width: bw, lineBreak: false });

  doc.y = hh + 14;

  // ── CONCEPTO ─────────────────────────────────────────────────────
  sec(doc, 'Concepto del proyecto');
  doc.fontSize(11).font('Helvetica').fillColor(BLACK)
    .text(ps.concept, ML, doc.y, { width: CW, lineGap: 2 });
  doc.y += 10;

  const colW  = (CW - 10) / 2;
  const col2x = ML + colW + 10;
  const bY    = doc.y;
  const bPad  = 8;

  for (const [bx2, lbl, txt] of [
    [ML,    'EXPERIENCIA OBJETIVO', ps.target_experience],
    [col2x, 'INTENCIÓN DE DISEÑO',  ps.design_intent],
  ]) {
    doc.rect(bx2, bY, colW, 13).fillColor(BLACK).fill();
    doc.fontSize(6).font('Helvetica-Bold').fillColor(WHITE)
      .text(lbl, bx2 + bPad, bY + 3.5, { width: colW - bPad * 2, characterSpacing: 0.5, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(txt, bx2 + bPad, bY + 17, { width: colW - bPad * 2, lineGap: 2 });
  }
  const lH = doc.heightOfString(ps.target_experience, { width: colW - bPad * 2, lineGap: 2 });
  const rH = doc.heightOfString(ps.design_intent,     { width: colW - bPad * 2, lineGap: 2 });
  doc.y = bY + 17 + Math.max(lH, rH) + 14;

  // ── LAYOUT ───────────────────────────────────────────────────────
  sec(doc, 'Layout y circulación');

  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY)
    .text(`DISTRIBUCIÓN DE ZONAS — ${surface_m2}m²`, ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
  doc.y += 11;

  kit.layout.zones.forEach((z, i) => {
    const zy = doc.y;
    doc.fontSize(14).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.approx_percentage, ML, zy, { width: 52, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.name, ML + 56, zy + 3, { width: 140, lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(GRAY_M)
      .text(z.description, ML + 200, zy + 3, { width: CW - 200, lineGap: 1.5 });
    const dH = doc.heightOfString(z.description, { width: CW - 200, lineGap: 1.5 });
    doc.y = zy + Math.max(20, dH + 8);
    if (i < kit.layout.zones.length - 1) {
      doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.3).stroke();
      doc.y += 3;
    }
  });
  doc.y += 10;

  // Flow + Points — two columns
  const flowW = CW * 0.46;
  const ptsX  = ML + flowW + 12;
  const ptsW  = CW - flowW - 12;
  const twoY  = doc.y;

  doc.fontSize(6).font('Helvetica-Bold').fillColor(GRAY)
    .text('FLUJO DE CLIENTES', ML, twoY, { characterSpacing: 0.8, lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
    .text(kit.layout.customer_flow, ML, twoY + 10, { width: flowW, lineGap: 2 });
  const flowH = doc.heightOfString(kit.layout.customer_flow, { width: flowW, lineGap: 2 });

  doc.fontSize(6).font('Helvetica-Bold').fillColor(GRAY)
    .text('PUNTOS ESTRATÉGICOS', ptsX, twoY, { width: ptsW, characterSpacing: 0.8, lineBreak: false });
  let ptsEndY = twoY + 10;
  kit.layout.key_strategic_points.forEach((p, i) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY)
      .text(String(i + 1).padStart(2, '0'), ptsX, ptsEndY, { width: 14, lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(BLACK)
      .text(p, ptsX + 16, ptsEndY, { width: ptsW - 16, lineGap: 1.5 });
    ptsEndY += doc.heightOfString(p, { width: ptsW - 16, lineGap: 1.5 }) + 7;
  });

  doc.y = twoY + 10 + Math.max(flowH, ptsEndY - twoY - 10) + 14;

  // ── RENDER IMAGE (page 1, if it fits) ────────────────────────────
  let imgPlaced = false;
  if (imgBuf) {
    const space = FOOTER_Y - doc.y - 18;
    if (space >= 120) {
      sec(doc, 'Render del local');
      const imgH = Math.min(Math.round(CW * 9 / 16), Math.floor(space));
      try {
        const startY = doc.y;
        doc.image(imgBuf, ML, startY, { width: CW, height: imgH });
        doc.y = startY + imgH;
        imgPlaced = true;
      } catch { /* unsupported format — skip */ }
    }
  }

  footer(doc);

  // ─── PAGE 2 ────────────────────────────────────────────────────────
  doc.addPage({ margin: 0 });
  pageStripe(doc, brand_name);

  // ── MOBILIARIO ───────────────────────────────────────────────────
  sec(doc, 'Mobiliario y equipamiento');
  const cw4 = [Math.round(CW - 140), 30, 56, 54];
  let ty = doc.y;

  doc.rect(ML, ty, CW, 15).fillColor(BLACK).fill();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(WHITE);
  let tx = ML + 6;
  [['ÍTEM', 'left'], ['CANT.', 'center'], ['UNIT. USD', 'right'], ['TOTAL USD', 'right']].forEach(([h, a], i) => {
    doc.text(h, tx, ty + 4, { width: cw4[i] - 6, align: a, lineBreak: false, characterSpacing: 0.4 });
    tx += cw4[i];
  });
  ty += 15;

  kit.furniture_and_equipment.forEach((f, i) => {
    const rh = 13;
    if (i % 2 === 0) doc.rect(ML, ty, CW, rh).fillColor('#f5f5f5').fill();
    doc.fontSize(8).font('Helvetica').fillColor(BLACK);
    tx = ML + 6;
    [[f.item, 'left'], [String(f.quantity), 'center'],
     [String(f.estimated_unit_cost_usd), 'right'], [String(f.total_cost_usd), 'right'],
    ].forEach(([cell, a], j) => {
      doc.text(cell, tx, ty + 3, { width: cw4[j] - 6, align: a, lineBreak: false });
      tx += cw4[j];
    });
    ty += rh;
  });
  doc.rect(ML, ty, CW, 0.5).fillColor(GRAY).fill();
  doc.y = ty + 12;

  // ── INVERSIÓN ────────────────────────────────────────────────────
  sec(doc, 'Estimación de inversión');
  const inv = kit.investment_estimate;

  [['Construcción', inv.construction_cost_usd],
   ['Mobiliario',   inv.furniture_cost_usd],
   ['Iluminación',  inv.lighting_cost_usd],
   ['Cartelería',   inv.signage_cost_usd],
   ['Otros',        inv.other_costs_usd],
  ].forEach(([lbl, val]) => {
    const ry = doc.y;
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(lbl, ML, ry, { width: CW * 0.6, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(`USD ${val}`, ML, ry, { width: CW, align: 'right', lineBreak: false });
    doc.y = ry + 12;
    doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.3).stroke();
    doc.y += 4;
  });

  const totY = doc.y + 4;
  doc.rect(ML, totY, CW, 36).fillColor(BLACK).fill();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('TOTAL ESTIMADO', ML + 12, totY + 7, { characterSpacing: 1.2, lineBreak: false });
  doc.fontSize(18).font('Helvetica-Bold').fillColor(WHITE)
    .text(`USD ${inv.total_estimated_usd}`, ML + 12, totY + 17, { lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text(`USD ${inv.cost_per_m2_usd} / m²`, ML, totY + 22, { width: CW - 12, align: 'right', lineBreak: false });
  doc.y = totY + 36 + 12;

  // ── CRONOGRAMA ───────────────────────────────────────────────────
  sec(doc, 'Cronograma de ejecución');

  kit.timeline.forEach((t, i) => {
    const ty2 = doc.y;
    const cx  = ML + 7;
    doc.circle(cx, ty2 + 7, 7).fillColor(BLACK).fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
      .text(String(i + 1), cx - 7, ty2 + 3, { width: 14, align: 'center', lineBreak: false });
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY)
      .text(`${t.duration_weeks}w`, ML + 20, ty2 + 1, { lineBreak: false, characterSpacing: 0.3 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK)
      .text(t.phase, ML + 38, ty2, { width: CW - 38, lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(GRAY_M)
      .text(t.description, ML + 20, ty2 + 13, { width: CW - 20, lineGap: 1.5 });
    const dH = doc.heightOfString(t.description, { width: CW - 20, lineGap: 1.5 });
    const nextY = ty2 + 13 + dH + 10;
    if (i < kit.timeline.length - 1) {
      doc.moveTo(cx, ty2 + 15).lineTo(cx, nextY - 4)
        .strokeColor(GRAY).lineWidth(0.6).dash(2, { space: 2 }).stroke().undash();
    }
    doc.y = nextY;
  });
  doc.y += 4;

  // ── RECOMENDACIONES ──────────────────────────────────────────────
  sec(doc, 'Recomendaciones estratégicas');
  const rec = kit.strategic_recommendations;

  [['DECISIONES CLAVE',       rec.key_decisions,    BLACK],
   ['OPTIMIZACIÓN DE COSTOS', rec.cost_optimization, GRAY_M],
   ['RIESGOS A EVITAR',       rec.risks_to_avoid,   '#8B2020'],
  ].forEach(([title, items, accent]) => {
    doc.fontSize(6).font('Helvetica-Bold').fillColor(GRAY)
      .text(title, ML, doc.y, { width: CW, characterSpacing: 1, lineBreak: false });
    doc.y += 9;
    items.forEach(item => {
      const iy = doc.y;
      const ih = doc.heightOfString(item, { width: CW - 14, lineGap: 1.5 });
      doc.rect(ML, iy, 2, ih + 4).fillColor(accent).fill();
      doc.fontSize(8).font('Helvetica').fillColor(BLACK)
        .text(item, ML + 10, iy + 2, { width: CW - 14, lineGap: 1.5 });
      doc.y = iy + ih + 9;
    });
    doc.y += 4;
  });

  // ── RENDER IMAGE (page 2, if not yet placed and space available) ──
  if (imgBuf && !imgPlaced) {
    const space2 = FOOTER_Y - doc.y - 18;
    if (space2 >= 100) {
      sec(doc, 'Render del local');
      const imgH2 = Math.min(Math.round(CW * 9 / 16), Math.floor(space2));
      try {
        const startY2 = doc.y;
        doc.image(imgBuf, ML, startY2, { width: CW, height: imgH2 });
        doc.y = startY2 + imgH2;
      } catch { /* skip */ }
    }
  }

  footer(doc);
}

async function generateBuffer(kit, meta) {
  const imgBuf = await fetchImage(kit.render_url || null);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildPDF(doc, kit, meta, imgBuf);
    doc.end();
  });
}

module.exports = { generateBuffer };
