import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;

export async function initVectorFonts() {
  if (fontP1 && fontP2 && fontHuiwen) return;
  const results = await Promise.allSettled([
    fetch('/qiji-part1.ttf').then(r => r.arrayBuffer()),
    fetch('/qiji-part2.ttf').then(r => r.arrayBuffer()),
    fetch('/huiwen-mincho.otf').then(r => r.arrayBuffer())
  ]);
  if (results[0].status === 'fulfilled') fontP1 = opentype.parse(results[0].value);
  if (results[1].status === 'fulfilled') fontP2 = opentype.parse(results[1].value);
  if (results[2].status === 'fulfilled') fontHuiwen = opentype.parse(results[2].value);
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try {
    const idx = font.charToGlyphIndex(char);
    return idx > 0;
  } catch { return false; }
}

function getBestFont(char: string): { font: opentype.Font, usedChar: string } {
  // 1. Try Qiji Part 1
  if (hasGlyph(fontP1, char)) return { font: fontP1!, usedChar: char };
  // 2. Try Qiji Part 2
  if (hasGlyph(fontP2, char)) return { font: fontP2!, usedChar: char };

  // 3. Smart Calligraphy Fallback:
  // If user typed a standard comma (， or ,) but Qiji only has the Dunhao (、)
  // we map it to Dunhao to KEEP the calligraphy style.
  if (char === '，' || char === ',') {
    if (hasGlyph(fontP1, '、')) return { font: fontP1!, usedChar: '、' };
  }

  // 4. Try Huiwen
  if (hasGlyph(fontHuiwen, char)) return { font: fontHuiwen!, usedChar: char };

  // Final fallback
  return { font: fontP1 || fontP2 || fontHuiwen!, usedChar: char };
}

function measureWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const { font, usedChar } = getBestFont(char);
    const glyph = font.charToGlyph(usedChar);
    width += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center') {
  const lineHeight = 1.45; // Increased line height to give vertical space
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = maxWidth * 0.98;

  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize) > safeMaxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  // BLEED logic: Give huge vertical padding and use overflow:visible
  const verticalPadding = fontSize * 1.5; 
  const totalHeight = lines.length * fontSize * lineHeight + verticalPadding;
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    // Baseline shift: Move the whole text down into the safe zone
    const yBaseline = (idx + 1) * fontSize * lineHeight + (fontSize * 0.4);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const { font, usedChar } = getBestFont(char);
      const glyph = font.charToGlyph(usedChar);
      const path = glyph.getPath(x, yBaseline, fontSize);
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="none" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent; transform: translateY(-${fontSize * 0.4}px);">
      ${pathElements.join('')}
    </svg>
  `;
}
