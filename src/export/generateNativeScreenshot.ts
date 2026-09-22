import type { AppDocument } from '../store';

type TextSegment = {
  char: string;
  color: string;
  fontSize: number;
  isBold: boolean;
  fontFamily: string;
};

export const generateNativeScreenshot = async (canvasEl: HTMLElement, s: AppDocument, scale = 3): Promise<string> => {
  await document.fonts.ready;
  const rootRect = canvasEl.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = rootRect.width * scale;
  canvas.height = rootRect.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = s.theme.bgColor;
  ctx.fillRect(0, 0, rootRect.width, rootRect.height);

  const boxes = canvasEl.querySelectorAll('.grid-box-inner');
  boxes.forEach((box) => {
    const rect = box.getBoundingClientRect();
    const x = rect.left - rootRect.left;
    const y = rect.top - rootRect.top;

    if (s.theme.isTransparentBg) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'black';
      ctx.fillRect(x, y, rect.width, rect.height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (s.theme.showGridFill) {
      ctx.fillStyle = s.theme.boxBgColor;
      ctx.fillRect(x, y, rect.width, rect.height);
    }

    const borderWidth = Number(s.theme.borderWidth) || 0;
    if (s.theme.showBoxBorder && borderWidth > 0) {
      ctx.strokeStyle = s.theme.borderColor;
      ctx.lineWidth = borderWidth;
      const halfLineWidth = ctx.lineWidth / 2;
      ctx.strokeRect(x + halfLineWidth, y + halfLineWidth, rect.width - ctx.lineWidth, rect.height - ctx.lineWidth);
    }
  });

  const textEls = canvasEl.querySelectorAll('.rich-text');
  textEls.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') return;

    let html = htmlEl.innerHTML;
    let isPlaceholder = false;
    if (!html || html === '<br>') {
      html = htmlEl.getAttribute('placeholder') || '';
      isPlaceholder = true;
    }
    if (!html) return;

    const rect = htmlEl.getBoundingClientRect();
    const x = rect.left - rootRect.left;
    const y = rect.top - rootRect.top;

    const defaultSize = parseFloat(computedStyle.fontSize);
    const defaultColor = isPlaceholder ? '#9ca3af' : computedStyle.color;
    const defaultBold = computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700;
    const defaultFamily = computedStyle.fontFamily;
    const textAlign = computedStyle.textAlign;

    let strokeWidth = 0;
    const strokeColor = defaultColor;
    const rawStrokeWidth = computedStyle.webkitTextStrokeWidth || computedStyle.getPropertyValue('-webkit-text-stroke-width');
    if (rawStrokeWidth && rawStrokeWidth !== '0px' && rawStrokeWidth !== '0') {
      strokeWidth = parseFloat(rawStrokeWidth);
    }

    const tempNode = document.createElement('div');
    tempNode.innerHTML = html;
    const segments: TextSegment[] = [];

    function traverse(node: Node, color: string, size: number, isBold: boolean) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        for (const char of text) {
          segments.push({ char, color, fontSize: size, isBold, fontFamily: defaultFamily });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const nodeEl = node as HTMLElement;
        let newColor = color;
        let newSize = size;
        let newBold = isBold;

        if (nodeEl.style.color) newColor = nodeEl.style.color;
        if (nodeEl.style.fontSize) {
          const parsed = parseFloat(nodeEl.style.fontSize);
          if (!isNaN(parsed)) newSize = parsed;
        }
        if (nodeEl.style.fontWeight === 'bold' || nodeEl.tagName === 'B' || nodeEl.tagName === 'STRONG') {
          newBold = true;
        }

        if (nodeEl.tagName === 'BR' || nodeEl.tagName === 'DIV') {
          if (segments.length > 0 && segments[segments.length - 1].char !== '\n') {
            segments.push({ char: '\n', color: newColor, fontSize: newSize, isBold: newBold, fontFamily: defaultFamily });
          }
        }

        nodeEl.childNodes.forEach((child) => traverse(child, newColor, newSize, newBold));
      }
    }
    traverse(tempNode, defaultColor, defaultSize, defaultBold);

    const linesOfSegments: TextSegment[][] = [];
    let currentLineSegments: TextSegment[] = [];
    for (const seg of segments) {
      if (seg.char === '\n') {
        linesOfSegments.push(currentLineSegments);
        currentLineSegments = [];
      } else {
        currentLineSegments.push(seg);
      }
    }
    if (currentLineSegments.length > 0) linesOfSegments.push(currentLineSegments);

    const padL = parseFloat(computedStyle.paddingLeft) || 0;
    const padR = parseFloat(computedStyle.paddingRight) || 0;
    const padT = parseFloat(computedStyle.paddingTop) || 0;
    const innerWidth = rect.width - padL - padR;

    const getCanvasFontMeasure = (isBold: boolean, fontSize: number, fontFamily: string) => {
      let weight = isBold ? 'bold' : 'normal';
      let family = fontFamily;
      if (isBold) {
        if (family.includes('Noto Serif SC')) {
          family = '"Noto Serif SC Bold Canvas", serif';
          weight = 'normal';
        } else if (family.includes('Noto Sans SC')) {
          family = '"Noto Sans SC Bold Canvas", sans-serif';
          weight = 'normal';
        }
      }
      return `${weight} ${fontSize}px ${family}`;
    };

    const wrappedLines: TextSegment[][] = [];
    for (const line of linesOfSegments) {
      let currentWrappedLine: TextSegment[] = [];
      let currentWidth = 0;
      for (const seg of line) {
        ctx.font = getCanvasFontMeasure(seg.isBold, seg.fontSize, seg.fontFamily);
        const width = ctx.measureText(seg.char).width;
        if (currentWidth + width > innerWidth && currentWrappedLine.length > 0) {
          wrappedLines.push(currentWrappedLine);
          currentWrappedLine = [seg];
          currentWidth = width;
        } else {
          currentWrappedLine.push(seg);
          currentWidth += width;
        }
      }
      if (currentWrappedLine.length > 0) wrappedLines.push(currentWrappedLine);
    }

    let startY = y + padT;
    if (htmlEl.classList.contains('single-line-center')) {
      startY = y + (rect.height - defaultSize) / 2;
    } else {
      startY += defaultSize * 0.1;
    }

    let currentY = startY;
    for (const wrappedLine of wrappedLines) {
      let maxFontSize = defaultSize;
      let lineWidth = 0;
      for (const seg of wrappedLine) {
        if (seg.fontSize > maxFontSize) maxFontSize = seg.fontSize;
        ctx.font = getCanvasFontMeasure(seg.isBold, seg.fontSize, seg.fontFamily);
        lineWidth += ctx.measureText(seg.char).width;
      }

      const lineHeight = maxFontSize * 1.2;
      let currentX = x + padL;
      if (textAlign === 'center') {
        currentX += (innerWidth - lineWidth) / 2;
      } else if (textAlign === 'right') {
        currentX += innerWidth - lineWidth;
      }

      for (const seg of wrappedLine) {
        ctx.font = getCanvasFontMeasure(seg.isBold, seg.fontSize, seg.fontFamily);
        ctx.fillStyle = seg.color;
        ctx.textBaseline = 'bottom';
        const charY = currentY + maxFontSize;

        if (strokeWidth > 0 && !isNaN(strokeWidth) && !isPlaceholder) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(seg.char, currentX, charY);
        }
        ctx.fillText(seg.char, currentX, charY);
        currentX += ctx.measureText(seg.char).width;
      }
      currentY += lineHeight;
    }
  });

  const watermarks = canvasEl.querySelectorAll('.watermark-text');
  watermarks.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const text = htmlEl.innerText || htmlEl.textContent || '';
    if (!text) return;

    const style = window.getComputedStyle(htmlEl);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

    const rect = htmlEl.getBoundingClientRect();
    const x = rect.left - rootRect.left;
    const y = rect.top - rootRect.top;

    const fontSize = parseFloat(style.fontSize);
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;

    ctx.globalAlpha = parseFloat(style.opacity) || 1;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  });

  return canvas.toDataURL('image/png');
};
