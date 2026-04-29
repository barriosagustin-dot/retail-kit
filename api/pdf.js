const PDFDocument = require('pdfkit');
const https = require('https');
const http  = require('http');

const PAGE_W = 595, PAGE_H = 842, ML = 40, CW = 515;
const BLACK = '#202121', GRAY = '#c9c9c9', GRAY_M = '#888888', WHITE = '#ffffff', RED = '#8B2020';
const FOOTER_Y = PAGE_H - 38, BODY_BOTTOM = FOOTER_Y - 12, PAGE_SIZE = [PAGE_W, PAGE_H];

// Fetch con http/https nativo (compatible con todos los entornos Vercel/Node)
function fetchImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { timeout: 12000 }, (res) => {
        if (res.statusCode !== 200) return resolve(null);
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

function footer(doc) {
  doc.moveTo(ML, FOOTER_Y).lineTo(PAGE_W - ML, FOOTER_Y).strokeColor(GRAY).lineWidth(0.4).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('Retail Kit — powered by wedo studio', ML, FOOTER_Y + 8, { lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('wedo-studio.com', ML, FOOTER_Y + 8, { width: CW, align: 'right', lineBreak: false });
}

function newPage(doc, brandName, section) {
  footer(doc);
  doc.addPage({ margin: 0, size: PAGE_SIZE });
  doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
    .text(brandName.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
  if (section) {
    doc.fontSize(7).font('Helvetica').fillColor(GRAY)
      .text(section, ML, 10, { width: CW, align: 'right', lineBreak: false });
  }
  doc.y = 40;
  return doc.y;
}

function secLabel(doc, label) {
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY_M)
    .text(label.toUpperCase(), ML, doc.y, { width: CW, characterSpacing: 1.3 });
  doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.5).stroke();
  doc.y += 9;
}

// Verifica si hay espacio; si no, abre nueva página y devuelve nueva Y
function checkSpace(doc, needed, brandName, section) {
  if (doc.y + needed > BODY_BOTTOM) {
    newPage(doc, brandName, section);
  }
  return doc.y;
}

async function generateBuffer(kit, meta) {
  const { brand_name, category, surface_m2, location_type, country_name } = meta;
  const ps  = kit.project_summary;
  const inv = kit.investment_estimate;
  const rec = kit.strategic_recommendations;

  const imgBuf = await fetchImage(kit.render_url || null);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: PAGE_SIZE, autoFirstPage: true, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ══════════════════════════════════════════════
    // PÁGINA 1 — Cover + Concepto + Layout
    // ══════════════════════════════════════════════
    const hh = 102;
    doc.rect(0, 0, PAGE_W, hh).fillColor(BLACK).fill();
    doc.fontSize(30).font('Helvetica').fillColor(WHITE).text('wedo', ML, 22, { lineBreak: false });
    doc.fontSize(6).font('Helvetica-Bold').fillColor(GRAY).text('STUDIO', ML, 60, { characterSpacing: 4.5, lineBreak: false });
    doc.moveTo(ML + 90, 16).lineTo(ML + 90, hh - 16).strokeColor('#3d3d3d').lineWidth(0.6).stroke();
    const bx = ML + 106, bw = PAGE_W - bx - ML;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('RETAIL KIT', bx, 22, { width: bw, characterSpacing: 2, lineBreak: false });
    doc.fontSize(22).font('Helvetica-Bold').fillColor(WHITE).text(brand_name, bx, 35, { width: bw, lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
      .text(`${category}  ·  ${surface_m2} m²  ·  ${location_type}  ·  ${country_name}`, bx, 68, { width: bw, lineBreak: false });
    doc.y = hh + 18;

    secLabel(doc, 'Concepto del proyecto');
    doc.fontSize(11).font('Helvetica').fillColor(BLACK).text(ps.concept, ML, doc.y, { width: CW, lineGap: 2.5 });
    doc.y += 14;

    // Bloques experiencia / diseño
    const colW = (CW - 12) / 2, col2x = ML + colW + 12, bPad = 10;
    const blockY = doc.y;
    const expH = doc.fontSize(8.5).font('Helvetica').heightOfString(ps.target_experience, { width: colW - bPad * 2, lineGap: 2.5 });
    const desH = doc.heightOfString(ps.design_intent, { width: colW - bPad * 2, lineGap: 2.5 });
    const blockH = Math.max(expH, desH) + 14 + 8;

    for (const [bx2, lbl, txt] of [[ML, 'EXPERIENCIA OBJETIVO', ps.target_experience], [col2x, 'INTENCIÓN DE DISEÑO', ps.design_intent]]) {
      doc.rect(bx2, blockY, colW, 14).fillColor(BLACK).fill();
      doc.fontSize(6).font('Helvetica-Bold').fillColor(WHITE).text(lbl, bx2 + bPad, blockY + 4, { width: colW - bPad * 2, characterSpacing: 0.6, lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK).text(txt, bx2 + bPad, blockY + 20, { width: colW - bPad * 2, lineGap: 2.5 });
    }
    doc.y = blockY + blockH + 16;

    // Layout
    checkSpace(doc, 60, brand_name, 'LAYOUT Y CIRCULACIÓN');
    secLabel(doc, 'Layout y circulación');
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M)
      .text(`DISTRIBUCIÓN DE ZONAS — ${surface_m2} m²`, ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
    doc.y += 13;

    const pctW = 65, nameW = 155, descW = CW - pctW - nameW;
    kit.layout.zones.forEach((z, i) => {
      doc.fontSize(8.5).font('Helvetica');
      const dH  = doc.heightOfString(z.description, { width: descW, lineGap: 2 });
      const rowH = Math.max(24, dH + 10);
      checkSpace(doc, rowH + 5, brand_name, 'LAYOUT Y CIRCULACIÓN');
      const zy = doc.y;
      doc.fontSize(17).font('Helvetica-Bold').fillColor(BLACK).text(z.approx_percentage, ML, zy, { width: pctW, lineBreak: false });
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK).text(z.name, ML + pctW, zy + 4, { width: nameW, lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M).text(z.description, ML + pctW + nameW, zy + 4, { width: descW, lineGap: 2 });
      doc.y = zy + rowH;
      if (i < kit.layout.zones.length - 1) {
        doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(GRAY).lineWidth(0.3).stroke();
        doc.y += 5;
      }
    });
    doc.y += 12;

    checkSpace(doc, 40, brand_name, 'LAYOUT Y CIRCULACIÓN');
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M).text('FLUJO DE CLIENTES', ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
    doc.y += 9;
    doc.fontSize(9).font('Helvetica').fillColor(BLACK).text(kit.layout.customer_flow, ML, doc.y, { width: CW, lineGap: 2.5 });
    doc.y += 12;

    checkSpace(doc, 30, brand_name, 'LAYOUT Y CIRCULACIÓN');
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M).text('PUNTOS ESTRATÉGICOS CLAVE', ML, doc.y, { characterSpacing: 0.8, lineBreak: false });
    doc.y += 10;
    kit.layout.key_strategic_points.forEach((p, i) => {
      doc.fontSize(9).font('Helvetica');
      const pH = doc.heightOfString(p, { width: CW - 24, lineGap: 2 });
      checkSpace(doc, pH + 9, brand_name, 'LAYOUT Y CIRCULACIÓN');
      const py = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY).text(String(i + 1).padStart(2, '0'), ML, py, { width: 22, lineBreak: false });
      doc.fontSize(9).font('Helvetica').fillColor(BLACK).text(p, ML + 24, py, { width: CW - 24, lineGap: 2 });
      doc.y = py + pH + 8;
    });

    footer(doc);

    // ══════════════════════════════════════════════
    // PÁGINA 2 — Render Image + Mobiliario + Inversión
    // ══════════════════════════════════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE).text(brand_name.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
    doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('MOBILIARIO E INVERSIÓN', ML, 10, { width: CW, align: 'right', lineBreak: false });
    doc.y = 40;

    // Imagen del render
    if (imgBuf) {
      const imgH = Math.round(CW * 9 / 16); // ~290px
      try {
        doc.image(imgBuf, ML, doc.y, { width: CW, height: imgH });
        doc.y += imgH + 14;
      } catch (e) {
        console.error('[PDF] imagen error:', e.message);
        doc.y += 8;
      }
    } else {
      console.warn('[PDF] sin imagen — render_url:', kit.render_url);
      doc.y += 8;
    }

    // Tabla mobiliario
    secLabel(doc, 'Mobiliario y equipamiento');

    const itemW = CW - 44 - 104 - 104, qtyW = 44, unitW = 104, totalW = 104;
    const cw4 = [itemW, qtyW, unitW, totalW], tPad = 7;

    const printTableHeader = (y) => {
      doc.rect(ML, y, CW, 20).fillColor(BLACK).fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
      let cx = ML;
      [['ÍTEM','left'],['CANT.','center'],['UNIT. USD','right'],['TOTAL USD','right']].forEach(([h, a], i) => {
        doc.text(h, cx + tPad, y + 6, { width: cw4[i] - tPad * 2, align: a, lineBreak: false, characterSpacing: 0.5 });
        cx += cw4[i];
      });
      return y + 20;
    };

    let ty = printTableHeader(doc.y);

    kit.furniture_and_equipment.forEach((f, i) => {
      doc.fontSize(8.5).font('Helvetica');
      const rowTxtH = doc.heightOfString(String(f.item), { width: itemW - tPad * 2, lineGap: 2 });
      const rowH = Math.max(rowTxtH + tPad * 2, 22);

      if (ty + rowH > BODY_BOTTOM) {
        doc.rect(ML, ty, CW, 0.5).fillColor(GRAY).fill();
        footer(doc);
        doc.addPage({ margin: 0, size: PAGE_SIZE });
        doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE).text(brand_name.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
        doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('MOBILIARIO E INVERSIÓN', ML, 10, { width: CW, align: 'right', lineBreak: false });
        doc.y = 40;
        ty = printTableHeader(doc.y);
      }

      if (i % 2 === 0) doc.rect(ML, ty, CW, rowH).fillColor('#f5f5f5').fill();
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK).text(String(f.item), ML + tPad, ty + tPad, { width: itemW - tPad * 2, lineGap: 2 });
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK).text(String(f.quantity), ML + itemW + tPad, ty + tPad, { width: qtyW - tPad * 2, align: 'center', lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(BLACK).text(`USD ${f.estimated_unit_cost_usd}`, ML + itemW + qtyW + tPad, ty + tPad, { width: unitW - tPad * 2, align: 'right', lineBreak: false });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK).text(`USD ${f.total_cost_usd}`, ML + itemW + qtyW + unitW + tPad, ty + tPad, { width: totalW - tPad * 2, align: 'right', lineBreak: false });
      ty += rowH;
    });
    doc.rect(ML, ty, CW, 0.5).fillColor(GRAY).fill();
    doc.y = ty + 14;

    // Inversión — función inline
    const renderInv = () => {
      checkSpace(doc, 140, brand_name, 'MOBILIARIO E INVERSIÓN');
      secLabel(doc, 'Estimación de inversión');
      const rows = [
        ['Construcción', inv.construction_cost_usd], ['Mobiliario', inv.furniture_cost_usd],
        ['Iluminación',  inv.lighting_cost_usd],     ['Cartelería', inv.signage_cost_usd],
        ['Otros',        inv.other_costs_usd],
      ];
      const cW2 = (CW - 14) / 2, c2X = ML + cW2 + 14;
      let y0 = doc.y, y1 = doc.y;
      rows.forEach(([lbl, val], i) => {
        const col = i % 2, bx2 = col === 0 ? ML : c2X, iy = col === 0 ? y0 : y1;
        doc.fontSize(9).font('Helvetica').fillColor(GRAY_M).text(lbl, bx2, iy, { width: cW2 * 0.5, lineBreak: false });
        doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text(`USD ${val}`, bx2, iy, { width: cW2, align: 'right', lineBreak: false });
        const ny = iy + 15;
        doc.moveTo(bx2, ny).lineTo(bx2 + cW2, ny).strokeColor(GRAY).lineWidth(0.3).stroke();
        if (col === 0) y0 = ny + 5; else y1 = ny + 5;
      });
      doc.y = Math.max(y0, y1) + 8;
      const totY = doc.y;
      doc.rect(ML, totY, CW, 44).fillColor(BLACK).fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('TOTAL ESTIMADO', ML + 14, totY + 9, { characterSpacing: 1.5, lineBreak: false });
      doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE).text(`USD ${inv.total_estimated_usd}`, ML + 14, totY + 20, { lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(`USD ${inv.cost_per_m2_usd} / m²`, ML, totY + 28, { width: CW - 14, align: 'right', lineBreak: false });
      doc.y = totY + 54;
    };

    renderInv();
    footer(doc);

    // ══════════════════════════════════════════════
    // PÁGINA 3 — Cronograma
    // ══════════════════════════════════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE).text(brand_name.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
    doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('CRONOGRAMA', ML, 10, { width: CW, align: 'right', lineBreak: false });
    doc.y = 40;
    secLabel(doc, 'Cronograma de ejecución');

    kit.timeline.forEach((t, i) => {
      doc.fontSize(9).font('Helvetica');
      const dH = doc.heightOfString(t.description, { width: CW - 30, lineGap: 3 });
      const needed = 32 + dH + 20;
      checkSpace(doc, needed, brand_name, 'CRONOGRAMA');
      const ty2 = doc.y, cx2 = ML + 11, r = 11;
      doc.circle(cx2, ty2 + r, r).fillColor(BLACK).fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE).text(String(i + 1), cx2 - r, ty2 + r - 6, { width: r * 2, align: 'center', lineBreak: false });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY_M).text(`${t.duration_weeks} SEMANAS`, ML + 30, ty2 + 2, { characterSpacing: 0.5, lineBreak: false });
      doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK).text(t.phase, ML + 30, ty2 + 14, { width: CW - 30, lineBreak: false });
      doc.fontSize(9).font('Helvetica').fillColor(GRAY_M).text(t.description, ML + 30, ty2 + 32, { width: CW - 30, lineGap: 3 });
      const nextY = ty2 + 32 + dH + 20;
      if (i < kit.timeline.length - 1) {
        doc.moveTo(cx2, ty2 + r * 2 + 2).lineTo(cx2, nextY - 4).strokeColor(GRAY).lineWidth(0.8).dash(3, { space: 3 }).stroke().undash();
      }
      doc.y = nextY;
    });
    footer(doc);

    // ══════════════════════════════════════════════
    // PÁGINA 4 — Recomendaciones
    // ══════════════════════════════════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    doc.rect(0, 0, PAGE_W, 28).fillColor(BLACK).fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE).text(brand_name.toUpperCase(), ML, 10, { lineBreak: false, characterSpacing: 0.5 });
    doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('RECOMENDACIONES', ML, 10, { width: CW, align: 'right', lineBreak: false });
    doc.y = 40;
    secLabel(doc, 'Recomendaciones estratégicas');

    const recGroups = [
      { title: 'Decisiones clave',       items: rec.key_decisions,    accent: BLACK,  bg: '#f0f0f0' },
      { title: 'Optimización de costos', items: rec.cost_optimization, accent: GRAY_M, bg: '#f7f7f7' },
      { title: 'Riesgos a evitar',       items: rec.risks_to_avoid,   accent: RED,    bg: '#fdf5f5' },
    ];

    recGroups.forEach(({ title, items, accent, bg }, gi) => {
      checkSpace(doc, 30, brand_name, 'RECOMENDACIONES');
      const gty = doc.y;
      doc.rect(ML, gty, CW, 22).fillColor(accent).fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE).text(title.toUpperCase(), ML + 14, gty + 7, { width: CW - 28, characterSpacing: 0.8, lineBreak: false });
      doc.y = gty + 22;

      items.forEach((item, i) => {
        doc.fontSize(8.5).font('Helvetica');
        const ih = doc.heightOfString(item, { width: CW - 42, lineGap: 2.5 });
        const rh = Math.max(ih + 14, 26);
        // Si el item no cabe, nueva página Y reimprimir cabecera del grupo
        if (doc.y + rh > BODY_BOTTOM) {
          newPage(doc, brand_name, 'RECOMENDACIONES');
          // Reimprime la cabecera del grupo en la nueva página
          const gty2 = doc.y;
          doc.rect(ML, gty2, CW, 22).fillColor(accent).fill();
          doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE).text(title.toUpperCase() + ' (cont.)', ML + 14, gty2 + 7, { width: CW - 28, characterSpacing: 0.8, lineBreak: false });
          doc.y = gty2 + 22;
        }
        const iy = doc.y;
        if (i % 2 === 0) doc.rect(ML, iy, CW, rh).fillColor(bg).fill();
        doc.rect(ML, iy, 3, rh).fillColor(accent).fill();
        doc.fontSize(8).font('Helvetica-Bold').fillColor(accent).text(String(i + 1).padStart(2, '0'), ML + 10, iy + (rh - 9) / 2, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica').fillColor(BLACK).text(item, ML + 28, iy + 7, { width: CW - 42, lineGap: 2.5 });
        doc.y = iy + rh;
      });
      if (gi < recGroups.length - 1) doc.y += 12;
    });
    footer(doc);

    // ══════════════════════════════════════════════
    // PÁGINA 5 — Cierre
    // ══════════════════════════════════════════════
    doc.addPage({ margin: 0, size: PAGE_SIZE });
    doc.rect(0, 0, PAGE_W, 5).fillColor(BLACK).fill();
    const logoY = 190;
    doc.fontSize(80).font('Helvetica').fillColor(BLACK).text('wedo', ML, logoY, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(GRAY_M).text('STUDIO', ML, logoY + 82, { width: CW, align: 'center', characterSpacing: 10, lineBreak: false });
    const sepW = CW * 0.35, sepX = ML + (CW - sepW) / 2;
    doc.moveTo(sepX, logoY + 106).lineTo(sepX + sepW, logoY + 106).strokeColor(GRAY).lineWidth(0.6).stroke();
    doc.fontSize(11).font('Helvetica').fillColor(GRAY_M).text('Retail Kit', ML, logoY + 120, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text('Análisis profesional para locales comerciales', ML, logoY + 138, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BLACK).text(brand_name, ML, logoY + 166, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(GRAY_M).text(`${category}  ·  ${country_name}`, ML, logoY + 183, { width: CW, align: 'center', lineBreak: false });
    const stripY = PAGE_H - 70;
    doc.rect(0, stripY, PAGE_W, 70).fillColor(BLACK).fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE).text('wedo-studio.com', ML, stripY + 20, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('Diseño comercial  ·  Expansión de retail  ·  Análisis de locales', ML, stripY + 38, { width: CW, align: 'center', lineBreak: false });
    doc.moveTo(ML, FOOTER_Y).lineTo(PAGE_W - ML, FOOTER_Y).strokeColor('#3a3a3a').lineWidth(0.4).stroke();
    doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('Retail Kit — powered by wedo studio', ML, FOOTER_Y + 8, { lineBreak: false });
    doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('wedo-studio.com', ML, FOOTER_Y + 8, { width: CW, align: 'right', lineBreak: false });

    doc.end();
  });
}

module.exports = { generateBuffer };
