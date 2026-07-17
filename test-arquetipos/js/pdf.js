/** Generación de PDF profesional del resultado */

export async function downloadResultPdf(state, result) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;
  const a = result.archetype;

  const ink = [12, 12, 12];
  const muted = [90, 90, 90];

  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, pageW, 120, 'F');
  doc.setTextColor(37, 244, 238);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AGENCIA EL ARBOL  ·  METODO R.A.I.C.E.S.', margin, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Test Oficial de Arquetipos TikTok LIVE', margin, 72);
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text(`Resultado de ${state.user.name}`, margin, 96);

  y = 150;
  doc.setTextColor(...ink);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(a.name.toUpperCase(), margin, y);
  y += 24;
  doc.setFontSize(12);
  doc.setTextColor(...muted);
  doc.text(a.tagline, margin, y, { maxWidth: pageW - margin * 2 });
  y += 36;

  doc.setTextColor(...ink);
  doc.setFontSize(11);
  const meta = [
    `Afinidad: ${result.affinity}%`,
    `Nivel: ${result.level.label}`,
    `Secundario: ${result.secondary}`,
    `Proximo nivel: ${result.nextLevel}`
  ];
  doc.text(meta.join('   ·   '), margin, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.text('Descripcion', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  const desc = doc.splitTextToSize(a.description, pageW - margin * 2);
  doc.text(desc, margin, y);
  y += desc.length * 14 + 18;

  const blocks = [
    ['Como monetiza', a.monetization],
    ['Como transmitir', a.howToStream],
    ['Comunidad', a.community],
    ['Donadores', a.donors],
    ['Horario / Duracion / Frecuencia', `${a.idealSchedule} | ${a.idealDuration} | ${a.idealFrequency}`],
    ['Tipo de PK', a.pkType],
    ['Plan 1-30', a.plan90Days.d1_30],
    ['Plan 31-60', a.plan90Days.d31_60],
    ['Plan 61-90', a.plan90Days.d61_90],
    ['Errores a evitar', (a.errorsToAvoid || []).join(' · ')]
  ];

  for (const [title, body] of blocks) {
    if (y > 720) {
      doc.addPage();
      y = 56;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ink);
    doc.text(title, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    const lines = doc.splitTextToSize(String(body), pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 14;
  }

  if (y > 680) {
    doc.addPage();
    y = 56;
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ink);
  doc.text('Comparacion de arquetipos', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  for (const r of result.ranked) {
    doc.setTextColor(...ink);
    doc.text(`${r.name}  ${r.affinity}%`, margin, y);
    const barW = ((pageW - margin * 2 - 140) * r.affinity) / 100;
    doc.setFillColor(37, 244, 238);
    doc.rect(margin + 140, y - 8, Math.max(4, barW), 8, 'F');
    y += 16;
  }

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('Documento generado por Agencia El Arbol · Metodo R.A.I.C.E.S.', margin, 820);

  doc.save(`RAICES-${a.name}-${state.user.name.replace(/\s+/g, '_')}.pdf`);
}
