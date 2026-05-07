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
      if (onStatus) onStatus(`正在加载本地资源: ${name}...`);
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
    fetchFont('/qiji-part1.ttf', '分包1'),
    fetchFont('/qiji-part2.ttf', '分包2'),
    fetchFont('/huiwen-mincho.otf', '明朝'),
    fetchFont('/noto-serif.ttf', '宋体'),
    fetchFont('/noto-serif-bold.ttf', '宋体粗'),
    fetchFont('/noto-sans.ttf', '黑体'),
    fetchFont('/noto-sans-bold.ttf', '黑体粗')
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
    return font.charToGlyphIndex(char) > 0;
  } catch { return false; }
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
  if (hasGlyph(fontSerif, char)) return fontSerif!;
  return fontP1 || fontHuiwen || fontSans!;
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
  maxWidth: number, 
  targetHeight: number,
  color: string, 
  align: 'left' | 'center' = 'center', 
  preferredFamily: string = "", 
  isBold: boolean = false
) {
  const lineHeightMult = 1.35;
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const safeMaxWidth = maxWidth - 4; // Minor padding margin

  for (const p of paragraphs) {
    let currentLine = "";
    for (const char of p) {
      const testLine = currentLine + char;
      if (measureWidth(testLine, fontSize, preferredFamily, isBold) > safeMaxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  // Calculate vertical start to center lines within targetHeight
  const contentHeight = lines.length * fontSize * lineHeightMult;
  const startY = (targetHeight - contentHeight) / 2;
  
  const pathElements: string[] = [];

  lines.forEach((line, idx) => {
    const lineWidth = measureWidth(line, fontSize, preferredFamily, isBold);
    // Baseline is roughly 80% down from the line top
    const yBaseline = startY + (idx + 0.82) * fontSize * lineHeightMult;
    let x = (align === 'center') ? (maxWidth - lineWidth) / 2 : 0;
    
    for (const char of line) {
      const font = getBestFont(char, preferredFamily, isBold);
      const glyph = font.charToGlyph(char);
      let curSize = fontSize;
      let yOff = 0;
      
      if (preferredFamily.includes('Qiji') && (char === '，' || char === ',') && !hasGlyph(fontP1, char) && !hasGlyph(fontP2, char)) {
        curSize = Math.max(10, fontSize - 4);
        yOff = 2;
      }

      const path = glyph.getPath(x, yBaseline + yOff, curSize);
      const isNativeBold = (font === fontSerifBold || font === fontSansBold);
      const sw = isBold ? (isNativeBold ? 0.2 : 0.9) : 0.38;

      pathElements.push(`<path d="${path.toPathData(5)}" fill="${color}" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" />`);
      x += (glyph.advanceWidth || font.unitsPerEm) * curSize / font.unitsPerEm;
    }
  });

  return `
    <svg width="${maxWidth}" height="${targetHeight}" viewBox="0 0 ${maxWidth} ${targetHeight}" 
      xmlns="http://www.w3.org/2000/svg" 
      style="display: block; overflow: visible; background: transparent;">
      ${pathElements.join('')}
    </svg>
  `;
}
