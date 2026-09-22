import { type RefObject, useEffect, useState } from 'react';
import type { AppDocument } from '../store';

interface PunchHoleBackgroundProps {
  s: AppDocument;
  canvasRef: RefObject<HTMLDivElement | null>;
}

export const PunchHoleBackground = ({ s, canvasRef }: PunchHoleBackgroundProps) => {
  const [path, setPath] = useState('');

  useEffect(() => {
    if (!s.theme.isTransparentBg || !canvasRef.current) return;
    const parent = canvasRef.current;
    let frame: number;
    const update = () => {
      const width = parent.offsetWidth;
      const height = parent.offsetHeight;
      const boxes = parent.querySelectorAll('.grid-box-inner');
      let d = `M 0 0 h ${width} v ${height} h -${width} z`;
      boxes.forEach((box) => {
        const target = box as HTMLElement;
        let x = 0;
        let y = 0;
        let current: HTMLElement | null = target;
        while (current && current !== parent) {
          x += current.offsetLeft;
          y += current.offsetTop;
          current = current.offsetParent as HTMLElement;
        }
        const boxWidth = target.offsetWidth;
        const boxHeight = target.offsetHeight;
        d += ` M ${x} ${y} v ${boxHeight} h ${boxWidth} v -${boxHeight} z`;
      });
      setPath(d);
    };

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    observer.observe(parent, { childList: true, subtree: true, attributes: true });

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    resizeObserver.observe(parent);

    update();
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [s.theme.isTransparentBg, s.rows, s.theme.boxBaseWidth, s.theme.boxAspectRatio, s.gridGap, s.rowGap, s.theme.containerPadding, canvasRef]);

  if (!s.theme.isTransparentBg) return null;

  return (
    <svg className="no-export absolute inset-0 w-full h-full pointer-events-none z-0" style={{ fill: s.theme.bgColor }}>
      <path d={path} fillRule="evenodd" />
    </svg>
  );
};
