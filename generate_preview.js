import fs from 'fs';

const groups = [
  '16x16_FX', '32x16_FX', '48x48_FX', '64x64_FX',
  '32x32_Arcane', '32x32_Circle', '32x32_Grow', '32x32_Impact', '32x32_Star',
  '48x48_Light', '64x64_Aura'
];

let html = `<!DOCTYPE html><html><body style="background:#111;color:#fff;font-family:sans-serif;padding:20px;">
<h2>Asset1 Effect Animations Preview</h2>`;

for (const g of groups) {
  html += `<h3>${g}</h3><div style="display:flex;flex-wrap:wrap;gap:12px;background:#1e1e24;padding:12px;margin-bottom:16px;border-radius:8px;">`;
  const files = fs.readdirSync('asset1').filter(f => f.startsWith(g + '_')).sort((a,b) => {
    const na = parseInt(a.match(/_(\d+)\.png/)[1]);
    const nb = parseInt(b.match(/_(\d+)\.png/)[1]);
    return na - nb;
  });
  for (const f of files) {
    html += `<div style="text-align:center;"><img src="${f}" style="image-rendering:pixelated;transform:scale(2);margin:16px;border:1px solid #444;"><br><small style="color:#aaa;">${f}</small></div>`;
  }
  html += `</div>`;
}
html += `</body></html>`;
fs.writeFileSync('asset1/preview_effects.html', html, 'utf8');
console.log('Done asset1/preview_effects.html');
