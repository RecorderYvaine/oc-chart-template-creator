import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;

export async function initVectorFonts() {
  if (fontP1 && fontP2 && fontHuiwen) return;
  const [p1, p2, hw] = await Promise.all([
    fetch('/qiji-part1.ttf').then(r => r.arrayBuffer()),
    fetch('/qiji-part2.ttf').then(r => r.arrayBuffer()),
    fetch('/huiwen-mincho.otf').then(r => r.arrayBuffer())
  ]);
  fontP1 = opentype.parse(p1);
  fontP2 = opentype.parse(p2);
  fontHuiwen = opentype.parse(hw);
}

function getBestFont(char: string): opentype.Font {
  if (fontP1?.glyphs.get(fontP1.charToGlyphIndex(char)).unicode !== undefined) return fontP1;
  if (fontP2?.glyphs.get(fontP2.charToGlyphIndex(char)).unicode !== undefined) return fontP2;
  return fontHuiwen || fontP1!;
}

/**
 * Calculates total width of a string for a given font and size.
 */
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
  const lineHeight = 1.2;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  // Wrap text
  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize) > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const totalHeight = lines.length * fontSize * lineHeight;
  const paths: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize);
    const yBaseline = (idx + 0.8) * fontSize * lineHeight;
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char);
      const glyph = font.charToGlyph(char);
      const path = glyph.getPath(x, yBaseline, fontSize);
      paths.push(`<path d="${path.toPathData(2)}" fill="${color}" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * fontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${paths.join('')}
    </svg>
  `;
}
