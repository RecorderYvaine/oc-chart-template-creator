import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;
let fontSerif: opentype.Font | null = null;
let fontSerifBold: opentype.Font | null = null;
let fontSans: opentype.Font | null = null;
let fontSansBold: opentype.Font | null = null;
let initialized = false;

export async function initVectorFonts(onStatus?: (msg: string) => void) {
  if (initialized) return;
  const fetchFont = async (url: string, name: string) => {
    try {
      if (onStatus) onStatus(`加载字体资源: ${name}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      return opentype.parse(buffer);
    } catch (e: any) {
      console.error(`Failed to load font ${name}:`, e);
      return null;
    }
  };

  const results = await Promise.all([
    fetchFont('/qiji-part1.ttf', '齐伋1'),
    fetchFont('/qiji-part2.ttf', '齐伋2'),
    fetchFont('/huiwen-mincho.otf', '明朝'),
    fetchFont('/noto-serif.ttf', '宋体'),
    fetchFont('/noto-serif-bold.ttf', '宋体粗'),
    fetchFont('/noto-sans.ttf', '黑体'),
    fetchFont('/noto-sans-bold.ttf', '黑体粗')
  ]);

  fontP1 = results[0]; fontP2 = results[1]; fontHuiwen = results[2];
  fontSerif = results[3]; fontSerifBold = results[4];
  fontSans = results[5]; fontSansBold = results[6];
  initialized = true;
  if (onStatus) onStatus('');
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try { return font.charToGlyphIndex(char) > 0; } catch { return false; }
}

function getBestFont(char: string, preferredFamily: string, isBold: boolean): opentype.Font {
  const isQijiMode = preferredFamily.includes('Qiji');
  const isHuiwenMode = preferredFamily.includes('Huiwen');
  const isSansMode = preferredFamily.includes('Sans');

  if (isQijiMode) {
    if (hasGlyph(fontP1, char)) return fontP1!;
    if (hasGlyph(fontP2, char)) return fontP2!;
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontP1!);
  }
  if (isHuiwenMode) {
    if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontP1!);
  }
  if (isSansMode) {
    if (isBold && fontSansBold && hasGlyph(fontSansBold, char)) return fontSansBold;
    if (hasGlyph(fontSans, char)) return fontSans!;
    return (isBold && fontSerifBold) ? fontSerifBold : (fontSerif || fontHuiwen!);
  }
  if (isBold && fontSerifBold && hasGlyph(fontSerifBold, char)) return fontSerifBold;
  return fontSerif || fontP1 || fontHuiwen!;
}

function measureWidth(text: string, fontSize: number, preferredFamily: string, isBold: boolean): number {
  let width = 0;
  for (const char of text) {
    const font = getBestFont(char, preferredFamily, isBold);
    const glyph = font.charToGlyph(char);
    let curSize = fontSize;
    if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
      curSize = Math.max(10, fontSize - 4);
    }
    width += (glyph.advanceWidth || font.unitsPerEm) * curSize / font.unitsPerEm;
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
  const lineHeightMult = 1.35;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = containerWidth - padding.left - padding.right - 2;

  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize, preferredFamily, isBold) > safeMaxWidth && currentLine.length > 0) {
        lines.push(currentLine); currentLine = char;
      } else { currentLine = testLine; }
    }
    if (currentLine) lines.push(currentLine);
  }

  const contentHeight = lines.length * fontSize * lineHeightMult;
  // Center vertically
  const innerHeight = containerHeight - padding.top - padding.bottom;
  const startY = padding.top + (innerHeight - contentHeight) / 2;
  
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize, preferredFamily, isBold);
    const yBaseline = startY + (idx + 0.85) * fontSize * lineHeightMult;
    let x = padding.left + ((align === 'center') ? (safeMaxWidth - lineWidth) / 2 : 0);
    
    for (const char of line) {
      const font = getBestFont(char, preferredFamily, isBold);
      const glyph = font.charToGlyph(char);
      let curSize = fontSize; let yOff = 0;
      
      if (isQiji && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
        curSize = Math.max(10, fontSize - 4); yOff = 2;
      }

      const path = glyph.getPath(x, yBaseline + yOff, curSize);
      
      // REVERT: Back to high precision (5) to stop CJK glyph distortion/holes.
      const pathData = path.toPathData(5);
      
      const isNativeBold = (font === fontSerifBold || font === fontSansBold);
      
      // SOLUTION TO CHIPPING: 
      // Use paint-order="stroke fill" so the stroke renders BEHIND the fill.
      // This allows us to thicken the character without stroke artifacts intersecting the fill.
      let sw = 0;
      if (isBold) {
        sw = isNativeBold ? 0.3 : 1.5; // Stronger stroke, but hidden behind fill
      } else {
        sw = isQiji ? 0.6 : 0.2; // Slight bolding for Qiji to keep ink weight, Noto gets a tiny anti-alias boost
      }

      pathElements.push(`<path d="${pathData}" fill="${color}" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * curSize / font.unitsPerEm;
    }
  });

  // Safe viewBox without crazy negative translations
  return `<svg width="${containerWidth}" height="${containerHeight}" viewBox="0 0 ${containerWidth} ${containerHeight}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible;background:transparent;">${pathElements.join('')}</svg>`;
}
