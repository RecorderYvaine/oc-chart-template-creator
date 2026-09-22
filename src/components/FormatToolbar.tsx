import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { rgbToHex } from '../utils/color';

export const FormatToolbar = () => {
  const [pos, setPos] = useState({ top: 0, left: 0, show: false });
  const [currentSize, setCurrentSize] = useState<number | ''>(30);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const savedRange = useRef<Range | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();

      if (document.activeElement?.closest('.format-toolbar')) {
        return;
      }

      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        let node: Node | null = sel.anchorNode;
        let isRich = false;
        while (node) {
          if ((node as HTMLElement).classList?.contains('rich-text')) {
            isRich = true;
            break;
          }
          node = node.parentNode;
        }
        if (isRich) {
          savedRange.current = sel.getRangeAt(0).cloneRange();
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          const parent = sel.anchorNode?.parentElement;
          if (parent) {
            const style = window.getComputedStyle(parent);
            setCurrentColor(rgbToHex(style.color));
            setCurrentSize(parseFloat(style.fontSize) || 30);
          }
          setPos({ top: rect.top - 50, left: rect.left + rect.width / 2, show: true });
          return;
        }
      }
      setPos((p) => ({ ...p, show: false }));
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  if (!pos.show) return null;

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      let node: Node | null = savedRange.current.startContainer;
      while (node) {
        if ((node as HTMLElement).classList?.contains('rich-text')) {
          (node as HTMLElement).focus();
          break;
        }
        node = node.parentNode;
      }

      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const updateSavedRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const triggerInput = () => {
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && !(node as HTMLElement).classList?.contains('rich-text')) {
        node = node.parentNode;
      }
      if (node) {
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const applyColor = (color: string) => {
    restoreSelection();
    setCurrentColor(color);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    triggerInput();
    updateSavedRange();
  };

  const applySize = (newSize: number | '', keepFocus = false) => {
    if (newSize === '' || isNaN(newSize) || newSize <= 0) return;
    restoreSelection();
    setCurrentSize(newSize);

    document.execCommand('styleWithCSS', false, 'true');

    const marker = 'MARKER_SIZE_HACK';
    document.execCommand('fontName', false, marker);

    const els = document.querySelectorAll(`font[face="${marker}"], [style*="${marker}"]`);
    els.forEach((el) => {
      const e = el as HTMLElement;
      if (e.tagName === 'FONT') e.removeAttribute('face');
      e.style.fontFamily = '';
      e.style.fontSize = `${newSize}px`;
      if (e.getAttribute('style') === '') e.removeAttribute('style');
    });

    triggerInput();
    updateSavedRange();

    if (keepFocus && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : parseInt(e.target.value);
    setCurrentSize(val);
    applySize(val, true);
  };

  const numericSize = Number(currentSize) || 30;

  return (
    <div
      className="format-toolbar fixed z-[200] bg-[#222] border border-[#444] shadow-2xl rounded-xl p-2 flex items-center gap-2 transform -translate-x-1/2"
      style={{ top: pos.top, left: pos.left }}
    >
      <input
        type="color"
        value={currentColor}
        onChange={(e) => applyColor(e.target.value)}
        className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer"
      />
      <div className="flex items-center gap-1 bg-[#111] rounded px-1">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applySize(Math.max(10, numericSize - 2));
          }}
          className="text-gray-400 hover:text-white px-2 py-1 font-bold"
        >
          -
        </button>
        <input
          ref={inputRef}
          type="number"
          value={currentSize}
          onChange={handleSizeChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySize(currentSize);
          }}
          className="bg-transparent text-white text-xs w-10 text-center outline-none appearance-none m-0"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applySize(numericSize + 2);
          }}
          className="text-gray-400 hover:text-white px-2 py-1 font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
};
