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
    const glyphIndex = font.charToGlyphIndex(char);
    // index 0 is always .notdef, but some fonts might have actual glyphs there if they are weird.
    // However, opentype.js returns 0 for missing characters usually.
    const glyph = font.glyphs.get(glyphIndex);
    return glyphIndex > 0 && !!glyph;
  } catch {
    return false;
  }
}

function getBestFont(char: string): { font: opentype.Font, usedChar: string } {
  // 1. Try Qiji Part 1 (now contains all symbols < U+8000)
  if (hasGlyph(fontP1, char)) return { font: fontP1!, usedChar: char };
  // 2. Try Qiji Part 2 (Hanzi >= U+8000)
  if (hasGlyph(fontP2, char)) return { font: fontP2!, usedChar: char };

  // 3. Smart Calligraphy Fallback: 
  // If user typed standard comma but Qiji only has the ideographic dot
  if (char === '，' || char === ',') {
    if (hasGlyph(fontP1, '、')) return { font: fontP1!, usedChar: '、' };
  }

  // 4. Fallback to Huiwen (Standard)
  if (hasGlyph(fontHuiwen, char)) return { font: fontHuiwen!, usedChar: char };

  // 5. Ultimate fallback to ensure something renders
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
  const lineHeight = 1.4; // Generous line height for calligraphy
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

  // Add significant padding to height to prevent swallowing top/bottom strokes
  const totalHeight = lines.length * fontSize * lineHeight + (fontSize * 0.5);
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    // Baseline adjustment: Move text down to fit descenders
    const yBaseline = (idx + 0.85) * fontSize * lineHeight + (fontSize * 0.2);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const { font, usedChar } = getBestFont(char);
      const glyph = font.charToGlyph(usedChar);
      const path = glyph.getPath(x, yBaseline, fontSize);
      // Precision 5 for sharp strokes
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="none" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent;">
      ${pathElements.join('')}
    </svg>
  `;
}
