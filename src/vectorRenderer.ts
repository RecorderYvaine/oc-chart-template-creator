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
  return font.charToGlyphIndex(char) > 0;
}

function getBestFont(char: string): opentype.Font {
  // 1. Try Qiji Part 1 (Symbols + Hanzi Set 1)
  if (hasGlyph(fontP1, char)) return fontP1!;
  // 2. Try Qiji Part 2 (Hanzi Set 2)
  if (hasGlyph(fontP2, char)) return fontP2!;
  // 3. Fallback to Huiwen (Symbols/English/Fallback)
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  // Absolute fallback
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

  // HUGE vertical bleed to prevent swallowing top/bottom strokes of calligraphy
  const bleed = fontSize * 1.5; 
  const totalHeight = lines.length * fontSize * lineHeight + bleed;
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    // Baseline: Start further down to allow for ascenders/descenders
    const yBaseline = (idx + 1) * fontSize * lineHeight + (fontSize * 0.5);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char);
      const glyph = font.charToGlyph(char);
      const path = glyph.getPath(x, yBaseline, fontSize);
      // Precision 5 for sharp rendering
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent; transform: translateY(-${fontSize * 0.5}px);">
      ${pathElements.join('')}
    </svg>
  `;
}
