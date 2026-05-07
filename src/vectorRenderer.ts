import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;
let fontSerif: opentype.Font | null = null;
let fontSans: opentype.Font | null = null;
let initialized = false;

/**
 * Loads all font files into memory as opentype.js Font objects.
 * Uses local copies where possible to prevent rendering failure.
 */
export async function initVectorFonts() {
  if (initialized) return;
  
  const fetchFont = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch { return null; }
  };

  const [p1, p2, hw, serif, sans] = await Promise.all([
    fetchFont('/qiji-part1.ttf'),
    fetchFont('/qiji-part2.ttf'),
    fetchFont('/huiwen-mincho.otf'),
    fetchFont('https://fonts.gstatic.com/s/notoserifsc/v26/ia4S6D-L89N7p9m87f9uG8_Z4tZ2fV-l.otf'),
    fetchFont('https://fonts.gstatic.com/s/notosanssc/v26/k3kXo84MPtRZle96SrH5qJ7mYyid7A.otf')
  ]);

  try {
    if (p1) fontP1 = opentype.parse(p1);
    if (p2) fontP2 = opentype.parse(p2);
    if (hw) fontHuiwen = opentype.parse(hw);
    if (serif) fontSerif = opentype.parse(serif);
    if (sans) fontSans = opentype.parse(sans);
  } catch (e) {
    console.error("Font parsing failed:", e);
  }
  
  initialized = true;
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try {
    const idx = font.charToGlyphIndex(char);
    return idx > 0;
  } catch { return false; }
}

/**
 * Returns the best font for a character based on the user's preferred theme font.
 */
function getBestFont(char: string, preferredFamily: string): opentype.Font {
  const isQijiMode = preferredFamily.includes('Qiji');
  const isHuiwenMode = preferredFamily.includes('Huiwen');
  const isSansMode = preferredFamily.includes('Sans');

  if (isQijiMode) {
    if (hasGlyph(fontP1, char)) return fontP1!;
    if (hasGlyph(fontP2, char)) return fontP2!;
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    return fontSerif || fontP1!;
  }

  if (isHuiwenMode) {
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    if (hasGlyph(fontSerif, char)) return fontSerif!;
    return fontP1!;
  }

  if (isSansMode) {
    if (hasGlyph(fontSans, char)) return fontSans!;
    if (hasGlyph(fontSerif, char)) return fontSerif!;
    return fontHuiwen!;
  }

  if (hasGlyph(fontSerif, char)) return fontSerif!;
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  return fontP1!;
}

function measureWidth(text: string, fontSize: number, preferredFamily: string): number {
  let width = 0;
  for (const char of text) {
    const font = getBestFont(char, preferredFamily);
    const glyph = font.charToGlyph(char);
    let currentFontSize = fontSize;
    if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
      currentFontSize = Math.max(10, fontSize - 4);
    }
    width += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(text: string, fontSize: number, maxWidth: number, color: string, align: 'left' | 'center' = 'center', preferredFamily: string = "") {
  const lineHeight = 1.4;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = maxWidth * 0.99;

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

  const verticalPadding = fontSize * 1.2; 
  const totalHeight = lines.length * fontSize * lineHeight + verticalPadding;
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize, preferredFamily);
    const yBaseline = (idx + 0.95) * fontSize * lineHeight + (fontSize * 0.3);
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char, preferredFamily);
      const glyph = font.charToGlyph(char);
      let currentFontSize = fontSize;
      let yOffset = 0;
      if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
        currentFontSize = Math.max(10, fontSize - 4);
        yOffset = 2; 
      }
      const path = glyph.getPath(x, yBaseline + yOffset, currentFontSize);
      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="${color}" stroke-width="0.38" stroke-linejoin="round" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
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
