import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;

/**
 * Load all font files into memory as opentype.js Font objects.
 */
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
  // Try P1 (Common Hanzi)
  if (fontP1?.glyphs.get(fontP1.charToGlyphIndex(char)).unicode !== undefined) return fontP1;
  // Try P2 (Rare Hanzi)
  if (fontP2?.glyphs.get(fontP2.charToGlyphIndex(char)).unicode !== undefined) return fontP2;
  // Fallback to Huiwen (Symbols/English/Everything else)
  return fontHuiwen || fontP1!;
}

interface RenderedLine {
  paths: { d: string, color: string }[];
  width: number;
}

/**
 * Renders a single line of text into SVG path data, handling character-level font fallback.
 */
function renderLine(text: string, fontSize: number, color: string): RenderedLine {
  let x = 0;
  const paths: { d: string, color: string }[] = [];
  
  for (const char of text) {
    const font = getBestFont(char);
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(x, 0, fontSize);
    paths.push({ d: path.toPathData(2), color });
    const advanceWidth = glyph.advanceWidth || font.unitsPerEm;
    x += (advanceWidth * fontSize) / font.unitsPerEm;
  }
  
  return { paths, width: x };
}

/**
 * Wraps text into multiple lines and renders them as an array of paths.
 */
export function textToVectorPaths(
  text: string, 
  fontSize: number, 
  maxWidth: number, 
  color: string, 
  align: 'left' | 'center' = 'center',
  lineHeight: number = 1.2
) {
  const lines: string[] = [];
  
  // Simple wrapping logic: Split by space/newline first
  const paragraphs = text.split('\n');
  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      const metrics = renderLine(testLine, fontSize, color);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const allPaths: { d: string, color: string }[] = [];
  let totalHeight = lines.length * fontSize * lineHeight;
  
  lines.forEach((line, idx) => {
    const metrics = renderLine(line, fontSize, color);
    const yOffset = (idx + 0.8) * fontSize * lineHeight;
    let xOffset = 0;
    
    if (align === 'center') {
      xOffset = (maxWidth - metrics.width) / 2;
    }

    metrics.paths.forEach(p => {
      // Shift path by xOffset and yOffset
      // Note: opentype.js paths are already at y=0 (baseline)
      // We wrap the d string in a translate transform later for simplicity
      allPaths.push({ 
        d: `M ${xOffset} ${yOffset} ${p.d.replace(/M|m/g, 'm ')}`, // This is naive, better to use svg grouping
        color: p.color 
      });
    });
  });

  return { paths: allPaths, height: totalHeight, width: maxWidth };
}

/**
 * High-level component to replace text with SVG paths during capture.
 */
export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center') {
  const result = textToVectorPaths(text, fontSize, maxWidth, color, align);
  return `
    <svg width="${result.width}" height="${result.height}" viewBox="0 0 ${result.width} ${result.height}" xmlns="http://www.w3.org/2000/svg">
      ${result.paths.map(p => `<path d="${p.d}" fill="${p.color}" />`).join('')}
    </svg>
  `;
}
