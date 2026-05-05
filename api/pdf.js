const PDFDocument = require('pdfkit');
const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');

const PAGE_W = 595, PAGE_H = 842, ML = 40, CW = 515;
const BLACK  = '#202121', GRAY = '#c9c9c9', GRAY_M = '#888888';
const WHITE  = '#ffffff', ACCENT = '#3d6b8e', RED = '#8B2020';
const BODY_BOTTOM = PAGE_H - 50;
const PAGE_SIZE   = [PAGE_W, PAGE_H];

function fetchImage(url) {
  return new Promise((resolve) => {
    if (!url) { console.log('[pdf] fetchImage: no url'); return resolve(null); }
    console.log('[pdf] fetchImage url:', url);
    try {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { timeout: 20000 }, (res) => {
        console.log('[pdf] fetchImage status:', res.statusCode);
        if (res.statusCode !== 200) return resolve(null);
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end',  () => resolve(Buffer.concat(chunks)));
        res.on('error', (e) => { console.error('[pdf] fetchImage read error:', e.message); resolve(null); });
      });
      req.on('error',   (e) => { console.error('[pdf] fetchImage req error:', e.message); resolve(null); });
      req.on('timeout', () => { console.error('[pdf] fetchImage timeout'); req.destroy(); resolve(null); });
    } catch (e) { console.error('[pdf] fetchImage exception:', e.message); resolve(null); }
  });
}

function footer(doc) {
  doc.fontSize(6.5).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, PAGE_H - 16, { width: CW, align: 'right', lineBreak: false });
}

function pageHeader(doc, brandName, section) {
  doc.rect(0, 0, PAGE_W, 34).fillColor(BLACK).fill();
  doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
    .text(brandName.toUpperCase(), 15, 15, { lineBreak: false });
  if (section) {
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
      .text(section, 15, 15, { width: PAGE_W - 30, align: 'right', lineBreak: false });
  }
  doc.y = 42;
}

function newPage(doc, brandName, section) {
  footer(doc);
  doc.addPage({ margin: 0, size: PAGE_SIZE });
  pageHeader(doc, brandName, section);
}

function secLabel(doc, label) {
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
    .text(label.toUpperCase(), ML, doc.y, { characterSpacing: 1.2, lineBreak: false });
  doc.y += 3;
  doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.4).stroke();
  doc.y += 9;
}

async function generateBuffer(kit, meta) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps  = kit.project_summary;
  const inv = kit.investment_estimate;
  const rec = kit.strategic_recommendations;

  const imgBuf = await fetchImage(kit.render_url || null);

  // FIX 3: logo blanco para portada
  const whiteLogoPath  = path.join(__dirname, '../public/Logo.png');
  const whiteLogoExists = fs.existsSync(whiteLogoPath);

  // Logo negro para cierre
  const blackLogoPath  = path.join(__dirname, '../public/Logo-Black.png');
  const blackLogoExists = fs.existsSync(blackLogoPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: PAGE_SIZE, autoFirstPage: true, bufferPages: true });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ═══════════════════ PAGE 1 — COVER ═══════════════════
    doc.rect(0, 0, PAGE_W, 75).fillColor(BLACK).fill();

    // FIX 3: logo blanco o tipográfico
    if (whiteLogoExists) {
      doc.image(whiteLogoPath, 40, 12, { width: 80 });
      doc.moveTo(128, 12).lineTo(128, 63).strokeColor('#3d3d3d').lineWidth(0.5).stroke();
      const bx = 140, bw = PAGE_W - 155;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('RETAIL KIT', bx, 18, { width: bw, characterSpacing: 1.5, lineBreak: false });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(WHITE).text(brand_name, bx, 30, { width: bw, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
        .text(`${category}  ·  ${surface_m2} m²  ·  ${location_type}  ·  ${country_name}`, bx, 56, { width: bw, lineBreak: false });
    } else {
      doc.fontSize(28).font('Helvetica').fillColor(WHITE).text('wedo', 15, 18, { lineBreak: false });
      doc.fontSize(5).font('Helvetica-Bold').fillColor(GRAY).text('STUDIO', 15, 50, { characterSpacing: 3.5, lineBreak: false });
      doc.moveTo(86, 12).lineTo(86, 63).strokeColor('#3d3d3d').lineWidth(0.5).stroke();
      const bx = 98, bw = PAGE_W - 113;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('RETAIL KIT', bx, 18, { width: bw, characterSpacing: 1.5, lineBreak: false });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(WHITE).text(brand_name, bx, 30, { width: bw, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
        .text(`${category}  ·  ${surface_m2} m²  ·  ${location_type}  ·  ${country_name}`, bx, 56, { width: bw, lineBreak: false });
    }

    // Zone B: render image
    if (imgBuf) {
      try { doc.image(imgBuf, 0, 75, { width: PAGE_W, height: 245 }); }
      catch (e) {
        console.error('[pdf] image embed error:', e.message);
        doc.rect(0, 75, PAGE_W, 245).fillColor('#1a1a1a').fill();
        doc.fontSize(8).font('Helvetica').fillColor('#444444')
          .text('render_url: ' + (kit.render_url || 'no definida'), 10, 185, { width: PAGE_W - 20 });
      }
    } else {
      doc.rect(0, 75, PAGE_W, 245).fillColor('#1a1a1a').fill();
      doc.fontSize(8).font('Helvetica').fillColor('#444444')
        .text('render_url: ' + (kit.render_url || 'no definida'), 10, 185, { width: PAGE_W - 20 });
    }

    // Zone C: content from y=322
    doc.y = 322;
    secLabel(doc, 'Concepto del proyecto');
    doc.fontSize(10).font('Helvetica').fillColor(BLACK).text(ps.concept, ML, doc.y, { width: CW, lineGap: 2.5 });
    doc.y += 14;

    const colW = (CW - 12) / 2, col2x = ML + colW + 12;
    const blockY = doc.y;
    const expH = doc.fontSize(8).font('Helvetica').heightOfString(ps.target_experience, { width: colW - 18, lineGap: 2 });
    const desH = doc.fontSize(8).font('Helvetica').heightOfString(ps.design_intent,     { width: colW - 18, lineGap: 2 });
    const blockH = Math.max(expH, desH) + 18 + 10;

    for (const [bx, lbl, txt] of [
      [ML,    'EXPERIENCIA OBJETIVO', ps.target_experience],
      [col2x, 'INTENCIÓN DE DISEÑO',  ps.design_intent],
    ]) {
      doc.rect(bx, blockY, colW, 16).fillColor(BLACK).fill();
      doc.fontSize(5.5).font('Helvetica-Bold').fillColor(WHITE)
        .text(lbl, bx + 8, blockY + 5, { width: colW - 16, characterSpacing: 0.5, lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor(BLACK)
        .text(txt, bx + 8, blockY + 22, { width: colW - 16, lineGap: 2 });
    }
    doc.y = blockY + blockH;
    footer(doc);

    // ═══════════════════ PAGE 2 — LAYOUT ═══════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');

    secLabel(doc, 'Distribución de zonas');
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY_M)
      .text(`${surface_m2} m² distribución interna`, ML, doc.y, { lineBreak: false });
    doc.y += 12;

    kit.layout.zones.forEach((z, i) => {
      const pctNum  = parseFloat(String(z.approx_percentage)) || 0;
      const barFill = Math.round(CW * pctNum / 100);
      const dH  = doc.fontSize(8).font('Helvetica').heightOfString(z.description, { width: CW, lineGap: 2 });
      const rowH = dH + 34;
      if (doc.y + rowH > BODY_BOTTOM) newPage(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');

      const zy = doc.y;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(BLACK).text(z.approx_percentage, ML, zy, { width: 55, lineBreak: false });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text(z.name, ML + 55, zy + 2, { lineBreak: false });
      doc.rect(ML, zy + 18, CW, 3).fillColor('#eeeeee').fill();
      doc.rect(ML, zy + 18, barFill, 3).fillColor(ACCENT).fill(); // zona fill bar — se conserva
      doc.fontSize(8).font('Helvetica').fillColor(GRAY_M).text(z.description, ML, zy + 26, { width: CW, lineGap: 2 });
      doc.y = zy + rowH;

      if (i < kit.layout.zones.length - 1) {
        doc.moveTo(ML, doc.y - 3).lineTo(ML + CW, doc.y - 3).strokeColor(GRAY).lineWidth(0.3).stroke();
        doc.y += 4;
      }
    });

    doc.y += 12;
    if (doc.y + 30 > BODY_BOTTOM) newPage(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
      .text('FLUJO DE CLIENTES', ML, doc.y, { characterSpacing: 1, lineBreak: false });
    doc.y += 9;
    doc.fontSize(9).font('Helvetica').fillColor(BLACK).text(kit.layout.customer_flow, ML, doc.y, { width: CW, lineGap: 2.5 });
    doc.y += 14;

    // FIX 4: puntos estratégicos — lista columna única
    if (doc.y + 30 > BODY_BOTTOM) newPage(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
      .text('PUNTOS ESTRATÉGICOS CLAVE', ML, doc.y, { characterSpacing: 1, lineBreak: false });
    doc.y += 10;

    kit.layout.key_strategic_points.forEach((p, i) => {
      doc.fontSize(8.5).font('Helvetica');
      const pH   = doc.heightOfString(p, { width: CW - 32, lineGap: 2 });
      const rowH = Math.max(pH + 10, 22);
      if (doc.y + rowH > BODY_BOTTOM) newPage(doc, brand_name, 'LAYOUT Y CIRCULACIÓN');
      const ry = doc.y;
      if (i % 2 === 0) doc.rect(ML, ry, CW, rowH).fillColor('#f5f5f5').fill();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY_M)
        .text(String(i + 1).padStart(2, '0'), ML + 8, ry + (rowH - 10) / 2, { lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
        .text(p, ML + 28, ry + (rowH - pH) / 2, { width: CW - 36, lineGap: 2 });
      doc.y = ry + rowH;
    });
    footer(doc);

    // ═══════════════════ PAGE 3 — MOBILIARIO + INVERSIÓN ═══════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brand_name, 'MOBILIARIO E INVERSIÓN');
    secLabel(doc, 'Mobiliario y equipamiento');

    const itemW = CW - 44 - 104 - 104, qtyW = 44, unitW = 104, totalW = 104;
    const cw4 = [itemW, qtyW, unitW, totalW], tPad = 7;

    const printTableHeader = (y) => {
      doc.rect(ML, y, CW, 20).fillColor(BLACK).fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
      let cx = ML;
      [['ÍTEM','left'],['CANT.','center'],['UNIT. USD','right'],['TOTAL USD','right']].forEach(([h, a], idx) => {
        doc.text(h, cx + tPad, y + 6, { width: cw4[idx] - tPad * 2, align: a, lineBreak: false, characterSpacing: 0.5 });
        cx += cw4[idx];
      });
      return y + 20;
    };

    let ty = printTableHeader(doc.y);

    kit.furniture_and_equipment.forEach((f, i) => {
      doc.fontSize(8.5).font('Helvetica');
      const rowTxtH = doc.heightOfString(String(f.item), { width: itemW - tPad * 2, lineGap: 2 });
      const rowH    = Math.max(rowTxtH + tPad * 2, 22);

      if (ty + rowH > BODY_BOTTOM) {
        footer(doc);
        doc.addPage({ margin: 0, size: PAGE_SIZE });
        pageHeader(doc, brand_name, 'MOBILIARIO E INVERSIÓN');
        ty = printTableHeader(doc.y);
      }

      if (i % 2 !== 0) doc.rect(ML, ty, CW, rowH).fillColor('#f5f5f5').fill();
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
    doc.y = ty + 14;

    if (doc.y + 140 > BODY_BOTTOM) {
      footer(doc);
      doc.addPage({ margin: 0, size: PAGE_SIZE });
      pageHeader(doc, brand_name, 'MOBILIARIO E INVERSIÓN');
    }
    secLabel(doc, 'Estimación de inversión');

    const invRows = [
      ['Construcción', inv.construction_cost_usd], ['Mobiliario', inv.furniture_cost_usd],
      ['Iluminación',  inv.lighting_cost_usd],     ['Cartelería', inv.signage_cost_usd],
      ['Otros',        inv.other_costs_usd],
    ];
    const invColW = (CW - 14) / 2, invCol2X = ML + invColW + 14;
    let iy0 = doc.y, iy1 = doc.y;
    invRows.forEach(([lbl, val], i) => {
      const col = i % 2, ibx = col === 0 ? ML : invCol2X, iy = col === 0 ? iy0 : iy1;
      doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M).text(lbl, ibx, iy, { width: invColW * 0.5, lineBreak: false });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK).text(`USD ${val}`, ibx, iy, { width: invColW, align: 'right', lineBreak: false });
      const ny = iy + 16;
      doc.moveTo(ibx, ny).lineTo(ibx + invColW, ny).strokeColor(GRAY).lineWidth(0.3).stroke();
      if (col === 0) iy0 = ny + 5; else iy1 = ny + 5;
    });
    doc.y = Math.max(iy0, iy1) + 10;

    const totY = doc.y;
    doc.roundedRect(ML, totY, CW, 46, 2).fillColor(BLACK).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
      .text('TOTAL ESTIMADO', ML + 14, totY + 9, { characterSpacing: 1.5, lineBreak: false });
    doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
      .text(`USD ${inv.total_estimated_usd}`, ML + 14, totY + 20, { lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
      .text(`USD ${inv.cost_per_m2_usd} / m²`, ML, totY + 30, { width: CW - 14, align: 'right', lineBreak: false });
    doc.y = totY + 56;
    footer(doc);

    // ═══════════════════ PAGE 4 — CRONOGRAMA ═══════════════════
    // FIX 5: lista vertical con círculos y línea punteada
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brand_name, 'CRONOGRAMA');
    secLabel(doc, 'Cronograma de ejecución');

    const phases = kit.timeline;
    const r  = 14;
    const cx = ML + r;

    phases.forEach((t, i) => {
      doc.fontSize(9).font('Helvetica');
      const dH     = doc.heightOfString(t.description, { width: CW - 30, lineGap: 3 });
      const needed = r * 2 + 32 + dH + 20;
      if (doc.y + needed > BODY_BOTTOM) newPage(doc, brand_name, 'CRONOGRAMA');

      const ty2  = doc.y;
      const nextY = ty2 + 32 + dH + 20;

      doc.circle(cx, ty2 + r, r).fillColor(BLACK).fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
        .text(String(i + 1), cx - r, ty2 + r - 6, { width: r * 2, align: 'center', lineBreak: false });

      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
        .text(`${t.duration_weeks} SEMANAS`, ML + 30, ty2 + 2, { characterSpacing: 0.5, lineBreak: false });
      doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK)
        .text(t.phase, ML + 30, ty2 + 14, { width: CW - 30, lineBreak: false });
      doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
        .text(t.description, ML + 30, ty2 + 32, { width: CW - 30, lineGap: 3 });

      if (i < phases.length - 1) {
        doc.moveTo(cx, ty2 + r * 2 + 2).lineTo(cx, nextY - 4)
          .strokeColor(GRAY).lineWidth(0.8).dash(3, { space: 3 }).stroke().undash();
      }

      doc.y = nextY;
    });
    footer(doc);

    // ═══════════════════ PAGE 5 — RECOMENDACIONES ═══════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    pageHeader(doc, brand_name, 'RECOMENDACIONES');
    secLabel(doc, 'Recomendaciones estratégicas');

    const recGroups = [
      { title: 'Decisiones clave',       items: rec.key_decisions,    color: BLACK  },
      { title: 'Optimización de costos', items: rec.cost_optimization, color: GRAY_M },
      { title: 'Riesgos a evitar',       items: rec.risks_to_avoid,   color: RED    },
    ];

    recGroups.forEach(({ title, items, color }, gi) => {
      if (doc.y + 28 > BODY_BOTTOM) newPage(doc, brand_name, 'RECOMENDACIONES');
      const gty = doc.y;
      doc.rect(ML, gty, CW, 22).fillColor('#f0f0f0').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(color)
        .text(title.toUpperCase(), ML + 12, gty + 7, { characterSpacing: 0.8, lineBreak: false });
      doc.y = gty + 22 + 4;

      items.forEach((item, i) => {
        doc.fontSize(8.5).font('Helvetica');
        const ih = doc.heightOfString(item, { width: CW - 42, lineGap: 2.5 });
        const rh = Math.max(ih + 14, 26);

        if (doc.y + rh > BODY_BOTTOM) {
          newPage(doc, brand_name, 'RECOMENDACIONES');
          const gty2 = doc.y;
          doc.rect(ML, gty2, CW, 22).fillColor('#f0f0f0').fill();
          doc.fontSize(8).font('Helvetica-Bold').fillColor(color)
            .text(title.toUpperCase() + ' (cont.)', ML + 12, gty2 + 7, { characterSpacing: 0.8, lineBreak: false });
          doc.y = gty2 + 22 + 4;
        }

        const iy = doc.y;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY_M)
          .text(String(i + 1).padStart(2, '0'), ML + 8, iy + (rh - 9) / 2, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
          .text(item, ML + 28, iy + 7, { width: CW - 42, lineGap: 2.5 });
        doc.y = iy + rh;
      });
      if (gi < recGroups.length - 1) doc.y += 10;
    });
    footer(doc);

    // ═══════════════════ FINAL PAGE — CIERRE ═══════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });

    if (blackLogoExists) {
      doc.image(blackLogoPath, (PAGE_W - 180) / 2, 140, { width: 180 });
    } else {
      doc.fontSize(62).font('Helvetica').fillColor(BLACK)
        .text('wedo', ML, 155, { width: CW, align: 'center', characterSpacing: -0.5, lineBreak: false });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(GRAY_M)
        .text('STUDIO', ML, 224, { width: CW, align: 'center', characterSpacing: 7, lineBreak: false });
    }

    // FIX 6: brand_name fontSize 28
    doc.fontSize(28).font('Helvetica-Bold').fillColor(BLACK)
      .text(brand_name, ML, 290, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
      .text(`${category}  ·  ${country_name}`, ML, 328, { width: CW, align: 'center', lineBreak: false });

    const sepW = CW * 0.3, sepX = ML + (CW - sepW) / 2;
    doc.moveTo(sepX, 350).lineTo(sepX + sepW, 350).strokeColor(GRAY).lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica').fillColor(GRAY_M)
      .text('Análisis profesional para locales comerciales', ML, 362, { width: CW, align: 'center', lineBreak: false });

    const stripY = PAGE_H - 85;
    doc.rect(0, stripY, PAGE_W, 85).fillColor(BLACK).fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
      .text('wedo-studio.com', ML, stripY + 22, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
      .text('Diseño comercial  ·  Expansión de retail  ·  Análisis de locales', ML, stripY + 42, { width: CW, align: 'center', lineBreak: false });

    doc.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { kit, brand_name, category, surface_m2, location_type, country_name } = req.body || {};
  if (!kit || !brand_name) { res.status(400).json({ error: 'kit y brand_name son requeridos' }); return; }

  try {
    const buffer = await generateBuffer(kit, { brand_name, category, surface_m2, location_type, country_name });
    const filename = `retail-kit-${brand_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Error generando PDF' });
  }
};

module.exports.generateBuffer = generateBuffer;
