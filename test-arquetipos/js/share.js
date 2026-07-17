/** Imagen tipo Wrapped para compartir */

export async function shareWrappedCard(state, result) {
  const a = result.archetype;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 1080, 1920);
  g.addColorStop(0, '#050505');
  g.addColorStop(0.45, '#1a0b2e');
  g.addColorStop(1, '#052e16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = a.color;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(900, 280, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#39FF14';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText('R.A.I.C.E.S.  ·  EL ARBOL', 80, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.fillText(state.user.name.toUpperCase(), 80, 220);

  ctx.fillStyle = '#a3a3a3';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText('Mi ADN como creador', 80, 270);

  ctx.fillStyle = a.color;
  ctx.font = '900 96px system-ui, sans-serif';
  wrapText(ctx, a.name.toUpperCase(), 80, 420, 920, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px system-ui, sans-serif';
  ctx.fillText(`${result.affinity}% afinidad`, 80, 640);
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillStyle = '#d4d4d4';
  ctx.fillText(`Nivel ${result.level.label}`, 80, 700);
  ctx.fillText(`Secundario: ${result.secondary}`, 80, 750);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 28px system-ui, sans-serif';
  let y = 860;
  ctx.fillText('Top fortalezas', 80, y);
  y += 50;
  for (const s of result.topStrengths) {
    ctx.fillStyle = a.color;
    ctx.fillRect(80, y - 22, Math.max(20, (s.value / 100) * 700), 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText(`${s.name} ${s.value}%`, 80, y + 30);
    y += 70;
  }

  ctx.fillStyle = '#a3a3a3';
  ctx.font = 'italic 26px system-ui, sans-serif';
  wrapText(ctx, `"${a.tagline}"`, 80, 1500, 900, 36);

  ctx.fillStyle = '#39FF14';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('Agencia El Arbol · Test Oficial TikTok LIVE', 80, 1820);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], `raices-${a.id}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'Mi ADN como creador',
      text: `Soy ${a.name} (${result.affinity}%) en el Test R.A.I.C.E.S. de Agencia El Arbol`,
      files: [file]
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}
