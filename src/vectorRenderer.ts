import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;
let initialized = false;

/**
 * Robustly load local fonts for vectorization. 
 * We avoid external CDNs to ensure reliability in all regions.
 */
export async function initVectorFonts() {
  if (initialized) return;
  
  const results = await Promise.allSettled([
    fetch('/qiji-part1.ttf').then(r => r.arrayBuffer()),
    fetch('/qiji-part2.ttf').then(r => r.arrayBuffer()),
    fetch('/huiwen-mincho.otf').then(r => r.arrayBuffer())
  ]);

  if (results[0].status === 'fulfilled') fontP1 = opentype.parse(results[0].value);
  if (results[1].status === 'fulfilled') fontP2 = opentype.parse(results[1].value);
  if (results[2].status === 'fulfilled') fontHuiwen = opentype.parse(results[2].value);
  
  initialized = true;
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try {
    return font.charToGlyphIndex(char) > 0;
  } catch { return false; }
}

/**
 * Returns the best font for a character based on the user's preferred theme font.
 * Only uses loaded local fonts to prevent crashes.
 */
function getBestFont(char: string, preferredFamily: string): opentype.Font {
  const isQijiMode = preferredFamily.includes('Qiji');
  
  // 1. If Qiji mode: P1 -> P2 -> Huiwen
  if (isQijiMode) {
    if (hasGlyph(fontP1, char)) return fontP1!;
    if (hasGlyph(fontP2, char)) return fontP2!;
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  }

  // 2. Default/Huiwen/Sans/Serif mode: Huiwen -> P1 (as serif fallback)
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  if (hasGlyph(fontP1, char)) return fontP1!;
  
  return fontP1 || fontP2 || fontHuiwen!;
}

function measureWidth(text: string, fontSize: number, preferredFamily: string): number {
  let width = 0;
  for (const char of text) {
    const font = getBestFont(char, preferredFamily);
    const glyph = font.charToGlyph(char);
    
    let currentFontSize = fontSize;
    // Smart sizing: commas in Huiwen while using Qiji should be slightly smaller
    if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
      currentFontSize -= 2;
    }
    width += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center', preferredFamily: string = "") {
  const lineHeight = 1.4;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = maxWidth * 0.98;

  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize, preferredFamily) > safeMaxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const verticalPadding = fontSize * 1.0; 
  const totalHeight = lines.length * fontSize * lineHeight + verticalPadding;
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize, preferredFamily);
    const yBaseline = (idx + 0.88) * fontSize * lineHeight + (fontSize * 0.3);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char, preferredFamily);
      const glyph = font.charToGlyph(char);
      
      let currentFontSize = fontSize;
      let yOffset = 0;
      // Smart Comma Logic: decrease size by 2px and nudge down if it's fallback Huiwen
      if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
        currentFontSize -= 2;
        yOffset = 1; 
      }

      const path = glyph.getPath(x, yBaseline + yOffset, currentFontSize);
      // Stroke width 0.3 to prevent text from looking too thin in vector mode
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="${color}" stroke-width="0.3" stroke-linejoin="round" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${totalHeight}" viewBox="0 0 ${maxWidth} ${totalHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent; transform: translateY(-${fontSize * 0.15}px);">
      ${pathElements.join('')}
    </svg>
  `;
}
