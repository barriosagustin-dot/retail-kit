const PDFDocument = require('pdfkit');

const PAGE_W = 595;
const PAGE_H = 842;
const ML     = 40;
const CW     = PAGE_W - ML * 2; // 515

const BLACK  = '#202121';
const GRAY   = '#c9c9c9';
const GRAY_M = '#888888';
const WHITE  = '#ffffff';
const RED    = '#8B2020';

const FOOTER_Y    = PAGE_H - 38;
const BODY_BOTTOM = FOOTER_Y - 8;

const PAGE_SIZE = [595, 842];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

function footer(doc) {
  doc.moveTo(ML, FOOTER_Y).lineTo(PAGE_W - ML, FOOTER_Y)
    .strokeColor(GRAY).lineWidth(0.4).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('Retail Kit — powered by wedo studio', ML, FOOTER_Y + 8, { lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, FOOTER_Y + 8, { width: CW, align: 'right', lineBreak: false });
}

function pageHeader(doc, brandName, sectionLabel) {
  doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
    .text(brandName.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
  if (sectionLabel) {
    doc.fontSize(7).font('Helvetica').fillColor(GRAY)
      .text(sectionLabel, ML, 10, { width: CW, align: 'right', lineBreak: false });
  }
  doc.y = ML; // 40px top margin
}

function secLabel(doc, label) {
  const y = doc.y;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY_M)
    .text(label.toUpperCase(), ML, y, { width: CW, characterSpacing: 1.3 });
  const ly = doc.y;
  doc.moveTo(ML, ly).lineTo(ML + CW, ly).strokeColor(GRAY).lineWidth(0.5).stroke();
  doc.y = ly + 9;
}

// Guard: flush current page and open a fresh one if content exceeded BODY_BOTTOM
function guard(doc, brandName, sectionLabel) {
  if (doc.y > BODY_BOTTOM) {
    footer(doc);
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brandName, sectionLabel);
  }
}

function checkPageBreak(doc, neededHeight, brandName, sectionLabel) {
  if (doc.y + neededHeight > BODY_BOTTOM) {
    footer(doc);
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brandName, sectionLabel);
  }
}

function renderInvestment(doc, inv, brandName) {
  guard(doc, brandName, 'MOBILIARIO E INVERSIÓN');
  secLabel(doc, 'Estimación de inversión');

  const rows = [
    ['Construcción', inv.construction_cost_usd],
    ['Mobiliario',   inv.furniture_cost_usd],
    ['Iluminación',  inv.lighting_cost_usd],
    ['Cartelería',   inv.signage_cost_usd],
    ['Otros',        inv.other_costs_usd],
  ];

  const colW2 = (CW - 14) / 2;
  const col2X = ML + colW2 + 14;
  let col0Y   = doc.y;
  let col1Y   = doc.y;

  rows.forEach(([lbl, val], i) => {
    const col = i % 2;
    const bx  = col === 0 ? ML : col2X;
    const iy  = col === 0 ? col0Y : col1Y;

    doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
      .text(lbl, bx, iy, { width: colW2 * 0.5, lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK)
      .text(`USD ${val}`, bx, iy, { width: colW2, align: 'right', lineBreak: false });

    const nextY = iy + 15;
    doc.moveTo(bx, nextY).lineTo(bx + colW2, nextY).strokeColor(GRAY).lineWidth(0.3).stroke();

    if (col === 0) col0Y = nextY + 5;
    else           col1Y = nextY + 5;
  });

  doc.y = Math.max(col0Y, col1Y) + 8;

  const totY = doc.y;
  doc.rect(ML, totY, CW, 42).fillColor(BLACK).fill();
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
    .text('TOTAL ESTIMADO', ML + 14, totY + 9, { characterSpacing: 1.5, lineBreak: false });
  doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
    .text(`USD ${inv.total_estimated_usd}`, ML + 14, totY + 19, { lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
    .text(`USD ${inv.cost_per_m2_usd} / m²`, ML, totY + 27, { width: CW - 14, align: 'right', lineBreak: false });
  doc.y = totY + 42;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

function buildPDF(doc, kit, meta, imgBuf) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps  = kit.project_summary;
  const inv = kit.investment_estimate;
  const rec = kit.strategic_recommendations;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header + Concepto + Layout
  // ════════════════════════════════════════════════════════════════════════════

  const hh = 102;
  doc.rect(0, 0, PAGE_W, hh).fillColor(BLACK).fill();

  // WEDO logo
  doc.fontSize(26).font('Helvetica').fillColor(WHITE)
    .text('wedo', ML, 22, { characterSpacing: -0.5, lineBreak: false });
  doc.fontSize(6).font('Helvetica-Bold').fillColor(GRAY)
    .text('STUDIO', ML, 60, { characterSpacing: 4.5, lineBreak: false });

  doc.moveTo(ML + 90, 16).lineTo(ML + 90, hh - 16)
    .strokeColor('#3d3d3d').lineWidth(0.6).stroke();

  const bx = ML + 106;
  const bw = PAGE_W - bx - ML;
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
    .text('RETAIL KIT', bx, 22, { width: bw, characterSpacing: 2, lineBreak: false });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(WHITE)
    .text(brand_name, bx, 35, { width: bw, lineBreak: false });
  doc.fontSize(8).font('Helvetica').fillColor(GRAY)
    .text(`${category}  ·  ${surface_m2} m²  ·  ${location_type}  ·  ${country_name}`,
      bx, 68, { width: bw, lineBreak: false });

  doc.y = hh + 18;

  // ── CONCEPTO ──────────────────────────────────────────────────────────────
  secLabel(doc, 'Concepto del proyecto');

  doc.fontSize(12).font('Helvetica').fillColor(BLACK)
    .text(ps.concept, ML, doc.y, { width: CW, lineGap: 3 });
  doc.y += 16;

  // Two-column blocks
  const colW   = (CW - 12) / 2;
  const col2x  = ML + colW + 12;
  const bPad   = 10;
  const blockY = doc.y;

  for (const [bx2, lbl, txt] of [
    [ML,    'EXPERIENCIA OBJETIVO', ps.target_experience],
    [col2x, 'INTENCIÓN DE DISEÑO',  ps.design_intent],
  ]) {
    doc.rect(bx2, blockY, colW, 14).fillColor(BLACK).fill();
    doc.fontSize(6).font('Helvetica-Bold').fillColor(WHITE)
      .text(lbl, bx2 + bPad, blockY + 4, { width: colW - bPad * 2, characterSpacing: 0.6, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(txt, bx2 + bPad, blockY + 20, { width: colW - bPad * 2, lineGap: 2.5 });
  }
  doc.fontSize(8.5).font('Helvetica');
  const lH = doc.heightOfString(ps.target_experience, { width: colW - bPad * 2, lineGap: 2.5 });
  const rH = doc.heightOfString(ps.design_intent,     { width: colW - bPad * 2, lineGap: 2.5 });
  doc.y = blockY + 20 + Math.max(lH, rH) + 20;

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  guard(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
  secLabel(doc, 'Layout y circulación');

  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
    .text(`DISTRIBUCIÓN DE ZONAS — ${surface_m2} m²`, ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
  doc.y += 13;

  const pctW  = 65;
  const nameW = 160;
  const descW = CW - pctW - nameW;

  kit.layout.zones.forEach((z, i) => {
    guard(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
    const zy = doc.y;
    doc.fontSize(17).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.approx_percentage, ML, zy, { width: pctW, lineBreak: false });
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(z.name, ML + pctW, zy + 4, { width: nameW, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M)
      .text(z.description, ML + pctW + nameW, zy + 4, { width: descW, lineGap: 2 });
    doc.fontSize(8.5).font('Helvetica');
    const dH = doc.heightOfString(z.description, { width: descW, lineGap: 2 });
    doc.y = zy + Math.max(24, dH + 10);
    if (i < kit.layout.zones.length - 1) {
      doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.3).stroke();
      doc.y += 5;
    }
  });
  doc.y += 16;

  guard(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
    .text('FLUJO DE CLIENTES', ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
  doc.y += 10;
  doc.fontSize(9).font('Helvetica').fillColor(BLACK)
    .text(kit.layout.customer_flow, ML, doc.y, { width: CW, lineGap: 2.5 });
  doc.y += 16;

  guard(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
    .text('PUNTOS ESTRATÉGICOS CLAVE', ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
  doc.y += 11;

  kit.layout.key_strategic_points.forEach((p, i) => {
    guard(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
    const py = doc.y;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY)
      .text(String(i + 1).padStart(2, '0'), ML, py, { width: 22, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(BLACK)
      .text(p, ML + 24, py, { width: CW - 24, lineGap: 2 });
    doc.fontSize(9).font('Helvetica');
    const pH = doc.heightOfString(p, { width: CW - 24, lineGap: 2 });
    doc.y = py + pH + 9;
  });

  footer(doc);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Render Image + Mobiliario + Inversión
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage({ margin: 0, size: PAGE_SIZE });
  pageHeader(doc, brand_name, 'MOBILIARIO E INVERSIÓN');

  if (imgBuf) {
    const imgH = Math.round(CW * 9 / 16);
    try {
      doc.image(imgBuf, ML, doc.y, { width: CW, height: imgH });
      doc.y += imgH + 20;
    } catch { /* skip if format unsupported */ }
  } else {
    doc.y += 8;
  }

  // ── MOBILIARIO ────────────────────────────────────────────────────────────
  guard(doc, brand_name, 'MOBILIARIO E INVERSIÓN');
  secLabel(doc, 'Mobiliario y equipamiento');

  const itemW  = CW - 44 - 104 - 104; // 263
  const qtyW   = 44;
  const unitW  = 104;
  const totalW = 104;
  const cw4    = [itemW, qtyW, unitW, totalW];
  const tPad   = 7;

  let ty = doc.y;

  doc.rect(ML, ty, CW, 20).fillColor(BLACK).fill();
  doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
  let colX = ML;
  [['ÍTEM', 'left'], ['CANT.', 'center'], ['UNIT. USD', 'right'], ['TOTAL USD', 'right']].forEach(([h, a], i) => {
    doc.text(h, colX + tPad, ty + 6, { width: cw4[i] - tPad * 2, align: a, lineBreak: false, characterSpacing: 0.5 });
    colX += cw4[i];
  });
  ty += 20;

  doc.fontSize(8.5).font('Helvetica');
  kit.furniture_and_equipment.forEach((f, i) => {
    // Guard: if this row won't fit, flush and open new page
    if (ty > BODY_BOTTOM) {
      doc.rect(ML, ty, CW, 0.5).fillColor(GRAY).fill();
      footer(doc);
      doc.addPage({ margin: 0, size: PAGE_SIZE });
      pageHeader(doc, brand_name, 'MOBILIARIO E INVERSIÓN');
      ty = doc.y;
      // Reprint table header
      doc.rect(ML, ty, CW, 20).fillColor(BLACK).fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
      colX = ML;
      [['ÍTEM', 'left'], ['CANT.', 'center'], ['UNIT. USD', 'right'], ['TOTAL USD', 'right']].forEach(([h, a], j) => {
        doc.text(h, colX + tPad, ty + 6, { width: cw4[j] - tPad * 2, align: a, lineBreak: false, characterSpacing: 0.5 });
        colX += cw4[j];
      });
      ty += 20;
    }

    doc.fontSize(8.5).font('Helvetica');
    const itemH = doc.heightOfString(String(f.item), { width: itemW - tPad * 2, lineGap: 2 });
    const rowH  = Math.max(itemH + tPad * 2, 22);

    if (i % 2 === 0) doc.rect(ML, ty, CW, rowH).fillColor('#f5f5f5').fill();

    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(String(f.item), ML + tPad, ty + tPad, { width: itemW - tPad * 2, lineGap: 2 });
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(String(f.quantity), ML + itemW + tPad, ty + tPad, { width: qtyW - tPad * 2, align: 'center', lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
      .text(`USD ${f.estimated_unit_cost_usd}`, ML + itemW + qtyW + tPad, ty + tPad, { width: unitW - tPad * 2, align: 'right', lineBreak: false });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(`USD ${f.total_cost_usd}`, ML + itemW + qtyW + unitW + tPad, ty + tPad, { width: totalW - tPad * 2, align: 'right', lineBreak: false });

    ty += rowH;
  });

  doc.rect(ML, ty, CW, 0.5).fillColor(GRAY).fill();
  doc.y = ty + 16;

  const invFits = doc.y + 130 < BODY_BOTTOM;
  if (invFits) renderInvestment(doc, inv, brand_name);

  footer(doc);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Cronograma
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage({ margin: 0, size: PAGE_SIZE });
  pageHeader(doc, brand_name, 'CRONOGRAMA');

  if (!invFits) {
    renderInvestment(doc, inv, brand_name);
    doc.y += 20;
  }

  secLabel(doc, 'Cronograma de ejecución');

  kit.timeline.forEach((t, i) => {
    doc.fontSize(9).font('Helvetica');
    const dH   = doc.heightOfString(t.description, { width: CW - 30, lineGap: 3 });
    checkPageBreak(doc, 32 + dH + 22, brand_name, 'CRONOGRAMA');
    const ty2  = doc.y;
    const cx   = ML + 11;
    const r    = 11;

    doc.circle(cx, ty2 + r, r).fillColor(BLACK).fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
      .text(String(i + 1), cx - r, ty2 + r - 6, { width: r * 2, align: 'center', lineBreak: false });

    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
      .text(`${t.duration_weeks} SEMANAS`, ML + 30, ty2 + 2, { characterSpacing: 0.5, lineBreak: false });

    doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK)
      .text(t.phase, ML + 30, ty2 + 14, { width: CW - 30, lineBreak: false });

    doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
      .text(t.description, ML + 30, ty2 + 32, { width: CW - 30, lineGap: 3 });
    const nextY = ty2 + 32 + dH + 22;

    if (i < kit.timeline.length - 1) {
      doc.moveTo(cx, ty2 + r * 2 + 2).lineTo(cx, nextY - 4)
        .strokeColor(GRAY).lineWidth(0.8).dash(3, { space: 3 }).stroke().undash();
    }

    doc.y = nextY;
  });

  footer(doc);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4 — Recomendaciones estratégicas
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage({ margin: 0, size: PAGE_SIZE });
  pageHeader(doc, brand_name, 'RECOMENDACIONES');

  secLabel(doc, 'Recomendaciones estratégicas');

  const recGroups = [
    { title: 'Decisiones clave',       items: rec.key_decisions,    accent: BLACK,  bg: '#f0f0f0' },
    { title: 'Optimización de costos', items: rec.cost_optimization, accent: GRAY_M, bg: '#f7f7f7' },
    { title: 'Riesgos a evitar',       items: rec.risks_to_avoid,   accent: RED,    bg: '#fdf5f5' },
  ];

  recGroups.forEach(({ title, items, accent, bg }, gi) => {
    guard(doc, brand_name, 'RECOMENDACIONES');

    const gty = doc.y;
    doc.rect(ML, gty, CW, 22).fillColor(accent).fill();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
      .text(title.toUpperCase(), ML + 14, gty + 7, { width: CW - 28, characterSpacing: 0.8, lineBreak: false });
    doc.y = gty + 22;

    items.forEach((item, i) => {
      doc.fontSize(8.5).font('Helvetica');
      const ih  = doc.heightOfString(item, { width: CW - 42, lineGap: 2.5 });
      const rh  = Math.max(ih + 14, 26);
      checkPageBreak(doc, rh, brand_name, 'RECOMENDACIONES');
      const iy = doc.y;

      if (i % 2 === 0) doc.rect(ML, iy, CW, rh).fillColor(bg).fill();
      doc.rect(ML, iy, 3, rh).fillColor(accent).fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(accent)
        .text(String(i + 1).padStart(2, '0'), ML + 10, iy + (rh - 9) / 2, { lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
        .text(item, ML + 28, iy + 7, { width: CW - 42, lineGap: 2.5 });
      doc.y = iy + rh;
    });

    if (gi < recGroups.length - 1) doc.y += 14;
  });

  footer(doc);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 5 — Branding / Cierre
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage({ margin: 0, size: PAGE_SIZE });

  doc.rect(0, 0, PAGE_W, 5).fillColor(BLACK).fill();

  const logoY = 190;
  doc.fontSize(70).font('Helvetica').fillColor(BLACK)
    .text('wedo', ML, logoY, { width: CW, align: 'center', characterSpacing: -0.5, lineBreak: false });
  doc.fontSize(10).font('Helvetica-Bold').fillColor(GRAY_M)
    .text('STUDIO', ML, logoY + 82, { width: CW, align: 'center', characterSpacing: 10, lineBreak: false });

  const sepW = CW * 0.35;
  const sepX = ML + (CW - sepW) / 2;
  doc.moveTo(sepX, logoY + 106).lineTo(sepX + sepW, logoY + 106)
    .strokeColor(GRAY).lineWidth(0.6).stroke();

  doc.fontSize(11).font('Helvetica').fillColor(GRAY_M)
    .text('Retail Kit', ML, logoY + 120, { width: CW, align: 'center', lineBreak: false });
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text('Análisis profesional para locales comerciales', ML, logoY + 138, { width: CW, align: 'center', lineBreak: false });

  doc.fontSize(11).font('Helvetica-Bold').fillColor(BLACK)
    .text(brand_name, ML, logoY + 166, { width: CW, align: 'center', lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M)
    .text(`${category}  ·  ${country_name}`, ML, logoY + 183, { width: CW, align: 'center', lineBreak: false });

  const stripY = PAGE_H - 70;
  doc.rect(0, stripY, PAGE_W, 70).fillColor(BLACK).fill();
  doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
    .text('wedo-studio.com', ML, stripY + 20, { width: CW, align: 'center', lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
    .text('Diseño comercial  ·  Expansión de retail  ·  Análisis de locales', ML, stripY + 38, { width: CW, align: 'center', lineBreak: false });

  // Footer on page 5 (above the black strip)
  doc.moveTo(ML, FOOTER_Y).lineTo(PAGE_W - ML, FOOTER_Y)
    .strokeColor('#3a3a3a').lineWidth(0.4).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('Retail Kit — powered by wedo studio', ML, FOOTER_Y + 8, { lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, FOOTER_Y + 8, { width: CW, align: 'right', lineBreak: false });
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function generateBuffer(kit, meta) {
  const imgBuf = await fetchImage(kit.render_url || null);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: PAGE_SIZE,
      autoFirstPage: true,
      bufferPages: true,
    });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildPDF(doc, kit, meta, imgBuf);
    doc.end();
  });
}

module.exports = { generateBuffer };
