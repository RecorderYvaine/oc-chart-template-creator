import opentype from 'opentype.js';

let fontP1: opentype.Font | null = null;
let fontP2: opentype.Font | null = null;
let fontHuiwen: opentype.Font | null = null;
let fontSerif: opentype.Font | null = null;
let fontSans: opentype.Font | null = null;
let initialized = false;

/**
 * Loads all font files into memory as opentype.js Font objects.
 * We now use more reliable URLs and provide better error feedback.
 */
export async function initVectorFonts(onStatus?: (msg: string) => void) {
  if (initialized) return;
  
  const fetchFont = async (url: string, name: string) => {
    try {
      if (onStatus) onStatus(`正在加载字体: ${name}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      return opentype.parse(buffer);
    } catch (e: any) {
      console.error(`Failed to load font ${name}:`, e);
      if (onStatus) onStatus(`字体 ${name} 加载失败: ${e.message}`);
      return null;
    }
  };

  // We prioritize Qiji and Huiwen as they are local and essential.
  // For Noto, we use specific OTF files from a reliable CDN with CORS.
  const [p1, p2, hw, serif, sans] = await Promise.all([
    fetchFont('/qiji-part1.ttf', '齐伋P1'),
    fetchFont('/qiji-part2.ttf', '齐伋P2'),
    fetchFont('/huiwen-mincho.otf', '汇文明朝'),
    fetchFont('https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Serif/OTF/ChineseSimplified/NotoSerifCJKsc-Regular.otf', '思源宋体'),
    fetchFont('https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/ChineseSimplified/NotoSansCJKsc-Regular.otf', '思源黑体')
  ]);

  fontP1 = p1;
  fontP2 = p2;
  fontHuiwen = hw;
  fontSerif = serif;
  fontSans = sans;
  
  initialized = true;
  if (onStatus) onStatus('');
}

function hasGlyph(font: opentype.Font | null, char: string): boolean {
  if (!font) return false;
  try {
    return font.charToGlyphIndex(char) > 0;
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
    return fontSerif || fontP1 || fontHuiwen!;
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

  // Default Serif mode
  if (hasGlyph(fontSerif, char)) return fontSerif!;
  if (hasGlyph(fontHuiwen, char)) return fontHuiwen!;
  return fontP1 || fontP2 || fontHuiwen!;
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
      // Precision 5 for sharp rendering. Added tiny stroke to prevent thinning.
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
