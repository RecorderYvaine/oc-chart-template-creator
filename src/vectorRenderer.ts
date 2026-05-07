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

function getEffectiveChar(char: string): { font: opentype.Font, char: string } {
  if (hasGlyph(fontP1, char)) return { font: fontP1!, char };
  if (hasGlyph(fontP2, char)) return { font: fontP2!, char };
  if (char === '，' || char === ',') {
    if (hasGlyph(fontP1, '、')) return { font: fontP1!, char: '、' };
  }
  if (hasGlyph(fontHuiwen, char)) return { font: fontHuiwen!, char };
  return { font: fontP1 || fontP2 || fontHuiwen!, char };
}

function measureWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const { font, char: effectiveChar } = getEffectiveChar(char);
    const glyph = font.charToGlyph(effectiveChar);
    width += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center') {
  const lineHeight = 1.35;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = maxWidth * 0.99;

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

  const totalHeight = Math.max(fontSize * lineHeight, lines.length * fontSize * lineHeight) + (fontSize * 0.4);
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    const yBaseline = (idx + 0.9) * fontSize * lineHeight;
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const { font, char: effectiveChar } = getEffectiveChar(char);
      const glyph = font.charToGlyph(effectiveChar);
      const path = glyph.getPath(x, yBaseline, fontSize);
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="none" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">
      ${pathElements.join('')}
    </svg>
  `;
}
