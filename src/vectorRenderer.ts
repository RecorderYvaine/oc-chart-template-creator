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

function getBestFont(char: string): opentype.Font {
  // 1. Try Qiji Part 1
  if (hasGlyph(fontP1, char)) return fontP1!;
  // 2. Try Qiji Part 2
  if (hasGlyph(fontP2, char)) return fontP2!;
  // 3. Fallback to Huiwen (Standard)
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  // Final fallback
  return fontP1 || fontP2 || fontHuiwen!;
}

function measureWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const font = getBestFont(char);
    const glyph = font.charToGlyph(char);
    width += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center') {
  const lineHeight = 1.4;
  const paragraphs = text.split('\n');
  const lines: string[] = [];
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

  // HUGE padding to prevent swallowing top/bottom strokes
  const bleed = fontSize * 1.0; 
  const totalHeight = lines.length * fontSize * lineHeight + bleed;
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    // Move baseline down to give head room
    const yBaseline = (idx + 0.85) * fontSize * lineHeight + (fontSize * 0.4);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char);
      const glyph = font.charToGlyph(char);
      const path = glyph.getPath(x, yBaseline, fontSize);
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent; transform: translateY(-${fontSize * 0.2}px);">
      ${pathElements.join('')}
    </svg>
  `;
}
