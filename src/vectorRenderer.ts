import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;
let fontSerif: opentype.Font | null = null;
let fontSerifBold: opentype.Font | null = null;
let fontSans: opentype.Font | null = null;
let fontSansBold: opentype.Font | null = null;
let initialized = false;

/**
 * Loads all font files into memory as opentype.js Font objects.
 * We now use ONLY local files to ensure 100% reliability and speed.
 */
export async function initVectorFonts(onStatus?: (msg: string) => void) {
  if (initialized) return;
  
  const fetchFont = async (url: string, name: string) => {
    try {
      if (onStatus) onStatus(`正在加载本地资源: ${name}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const font = opentype.parse(buffer);
      return font;
    } catch (e: any) {
      console.error(`Failed to load local font ${name}:`, e);
      if (onStatus) onStatus(`字体 ${name} 加载失败: ${e.message}`);
      return null;
    }
  };

  const results = await Promise.all([
    fetchFont('/qiji-part1.ttf', '齐伋P1'),
    fetchFont('/qiji-part2.ttf', '齐伋P2'),
    fetchFont('/huiwen-mincho.otf', '汇文明朝'),
    fetchFont('/noto-serif.ttf', '思源宋体'),
    fetchFont('/noto-serif-bold.ttf', '思源宋体-粗体'),
    fetchFont('/noto-sans.ttf', '思源黑体'),
    fetchFont('/noto-sans-bold.ttf', '思源黑体-粗体')
  ]);

  fontP1 = results[0];
  fontP2 = results[1];
  fontHuiwen = results[2];
  fontSerif = results[3];
  fontSerifBold = results[4];
  fontSans = results[5];
  fontSansBold = results[6];
  
  initialized = true;
  if (onStatus) onStatus('');
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try {
    // Opentype.js charToGlyphIndex returns 0 for .notdef
    // We check glyph index > 0 to ensure the font actually HAS the character
    const index = font.charToGlyphIndex(char);
    return index > 0;
  } catch { return false; }
}

/**
 * Returns the best font for a character based on the user's preferred theme font.
 */
function getBestFont(char: string, preferredFamily: string, isBold: boolean): opentype.Font {
  const isQijiMode = preferredFamily.includes('Qiji');
  const isHuiwenMode = preferredFamily.includes('Huiwen');
  const isSansMode = preferredFamily.includes('Sans');

  // 1. If Qiji mode: P1 -> P2 -> Huiwen (for symbols/fallback)
  if (isQijiMode) {
    if (hasGlyph(fontP1, char)) return fontP1!;
    if (hasGlyph(fontP2, char)) return fontP2!;
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontP1!);
  }

  // 2. If Huiwen mode: Huiwen -> Serif
  if (isHuiwenMode) {
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontP1!);
  }

  // 3. If Sans mode: Use REAL Bold Sans if requested
  if (isSansMode) {
    if (isBold && fontSansBold && hasGlyph(fontSansBold, char)) return fontSansBold;
    if (hasGlyph(fontSans, char)) return fontSans!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontHuiwen!);
  }

  // 4. Default Serif mode: Use REAL Bold Serif if requested
  if (isBold && fontSerifBold && hasGlyph(fontSerifBold, char)) return fontSerifBold;
  if (hasGlyph(fontSerif, char)) return fontSerif!;
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  return fontP1 || fontP2 || fontHuiwen!;
}

function measureWidth(text: string, fontSize: number, preferredFamily: string, isBold: boolean): number {
  let width = 0;
  for (const char of text) {
    const font = getBestFont(char, preferredFamily, isBold);
    const glyph = font.charToGlyph(char);
    
    let currentFontSize = fontSize;
    // Smart sizing for fallback commas
    if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
      currentFontSize = Math.max(10, fontSize - 4);
    }
    width += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
  }
  return width;
}

export function generateTextSVG(
  text: string, 
  fontSize: number, 
  containerWidth: number, 
  containerHeight: number,
  padding: { top: number, right: number, bottom: number, left: number },
  color: string, 
  align: 'left' | 'center' = 'center', 
  preferredFamily: string = "", 
  isBold: boolean = false
) {
  const isQiji = preferredFamily.includes('Qiji');
  const lineHeightMult = 1.4;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  const innerMaxWidth = containerWidth - padding.left - padding.right - 4;

  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize, preferredFamily, isBold) > innerMaxWidth && currentLine.length > 0) {
        lines.push(currentLine); currentLine = char;
      } else { currentLine = testLine; }
    }
    if (currentLine) lines.push(currentLine);
  }

  const contentHeight = lines.length * fontSize * lineHeightMult;
  const innerHeight = containerHeight - padding.top - padding.bottom;
  const startY = padding.top + (innerHeight - contentHeight) / 2;
  
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize, preferredFamily, isBold);
    const yBaseline = startY + (idx + 0.85) * fontSize * lineHeightMult;
    let x = padding.left + ((align === 'center') ? (innerMaxWidth - lineWidth) / 2 : 0);
    
    for (const char of line) {
      const font = getBestFont(char, preferredFamily, isBold);
      const glyph = font.charToGlyph(char);
      
      let currentFontSize = fontSize;
      let yOffset = 0;
      if (isQiji && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
        currentFontSize = Math.max(10, fontSize - 4);
        yOffset = 2; 
      }

      const path = glyph.getPath(x, yBaseline + yOffset, currentFontSize);
      const isNativeBold = (font === fontSerifBold || font === fontSansBold);
      const isNoto = font === fontSerif || font === fontSerifBold || font === fontSans || font === fontSansBold;
      
      // Increased stroke-width to prevent thinning in high-res PNG
      // Regular: 0.5px (up from 0.38), Bold: 1.2px (up from 1.0)
      let sw = 0.5;
      if (isBold) {
        sw = isNativeBold ? 0.3 : 1.2;
      } else {
        sw = isNoto ? 0.2 : 0.5;
      }

      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * currentFontSize / font.unitsPerEm;
    }
  });

  return `<svg viewBox="0 0 ${containerWidth} ${containerHeight}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible;background:transparent;">${pathElements.join('')}</svg>`;
}
