import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useStore } from './store';
import { 
  Plus, Trash2, Eye, EyeOff, Palette, Columns, Layers, Loader2, 
  ArrowUp, ArrowDown, StretchHorizontal, ChevronDown, Download, 
  X, Search, ZoomIn, ZoomOut, RotateCcw 
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';

/**
 * Utility to determine if a hex color is "light" for accessibility/contrast.
 */
const isLightColor = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 155;
};

/**
 * PunchHoleBackground: Creates an SVG "donut" path to allow the parent background 
 * to show through specific "holes" (the grid boxes) when isTransparentBg is true.
 */
function PunchHoleBackground({ containerRef, bgColor, isTransparent, zoom, rowCount, colCount, containerWidth }: { 
  containerRef: React.RefObject<HTMLDivElement | null>, 
  bgColor: string, 
  isTransparent: boolean,
  zoom: number,
  rowCount: number,
  colCount: number,
  containerWidth: number
}) {
  const [pathData, setPathData] = useState("");

  useLayoutEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current;
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;

      if (!isTransparent) {
        setPathData(`M 0 0 h ${w} v ${h} h -${w} z`);
        return;
      }

      const boxEls = parent.querySelectorAll('.grid-box-inner');
      let d = `M 0 0 h ${w} v ${h} h -${w} z`;

      boxEls.forEach(el => {
        const target = el as HTMLElement;
        let x = 0; 
        let y = 0;
        let current: HTMLElement | null = target;
        while (current && current !== parent) {
          x += current.offsetLeft;
          y += current.offsetTop;
          current = current.offsetParent as HTMLElement;
        }
        const bw = target.offsetWidth; 
        const bh = target.offsetHeight;
        // SVG donut hole: draw counter-clockwise
        d += ` M ${x} ${y} v ${bh} h ${bw} v -${bh} z`;
      });
      setPathData(d);
    };

    update();
    const timer = setTimeout(update, 200);
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => { 
      clearTimeout(timer); 
      observer.disconnect(); 
      window.removeEventListener('resize', update); 
    };
  }, [containerRef, isTransparent, zoom, rowCount, colCount, containerWidth, bgColor]);

  return (
    <svg className="absolute inset-0 z-0 pointer-events-none w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d={pathData} fill={bgColor} fillRule="evenodd" />
    </svg>
  );
}

function App() {
  const s = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState('');
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Trackpad zoom logic
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(Math.max(z - e.deltaY * 0.01, 0.2), 3));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Preload fonts
  useEffect(() => {
    document.fonts.load('1em "QijiCombo"').catch(() => {});
    document.fonts.load('1em "HuiwenMincho"').catch(() => {});
  }, []);

  // Font loading state management
  useEffect(() => {
    if (!s.theme) return;
    const isCustom = s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen');
    if (isCustom) {
      setIsFontLoading(true);
      const name = s.theme.fontFamily.includes('Qiji') ? 'QijiCombo' : 'HuiwenMincho';
      document.fonts.load(`1em "${name}"`).then(() => setIsFontLoading(false)).catch(() => setIsFontLoading(false));
    } else {
      setIsFontLoading(false);
    }
  }, [s.theme.fontFamily]);

  // Sync theme to CSS variables
  useEffect(() => {
    if (!s.theme) return;
    const r = document.documentElement;
    r.style.setProperty('--oc-bg', s.theme.bgColor);
    r.style.setProperty('--oc-text', s.theme.textColor);
    r.style.setProperty('--oc-border', s.theme.borderColor);
    r.style.setProperty('--oc-border-width', `${s.theme.borderWidth}px`);
    r.style.setProperty('--oc-box-bg', s.theme.boxBgColor);
    if (s.theme.fontFamily) {
      const family = s.theme.fontFamily.split('|')[0];
      r.style.setProperty('--oc-font', family);
      const isCustom = s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen');
      r.style.setProperty('--oc-font-weight', isCustom ? 'normal' : 'bold');
    }
  }, [s.theme]);

  const handleShowPreview = async () => {
    if (!canvasRef.current || isGenerating) return;
    setIsGenerating(true); 
    setExportMessage('正在准备超清预览...');
    const currentZoom = zoom;
    if (zoom !== 1) setZoom(1);
    
    try {
      await document.fonts.ready;
      if (zoom !== 1) await new Promise(r => setTimeout(r, 400));
      
      const original = canvasRef.current;
      const noExportEls = document.querySelectorAll('.no-export');
      noExportEls.forEach(el => (el as HTMLElement).style.display = 'none');
      
      await new Promise(r => setTimeout(r, 800));
      
      const dataUrl = await domToPng(original, { 
        scale: 3, 
        backgroundColor: 'rgba(0,0,0,0)', 
        width: original.offsetWidth, 
        height: original.offsetHeight 
      });
      
      noExportEls.forEach(el => (el as HTMLElement).style.display = '');
      setPreviewUrl(dataUrl);
    } catch (err: any) { 
      alert(`预览生成失败: ${err.message}`); 
    } finally { 
      if (zoom !== 1) setZoom(currentZoom);
      setIsGenerating(false); 
      setExportMessage(''); 
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `oc-chart-${Date.now()}.png`;
    link.href = previewUrl; 
    link.click();
    setPreviewUrl(null);
  };

  const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.target as HTMLTextAreaElement;
    t.style.height = 'auto'; 
    t.style.height = `${t.scrollHeight}px`;
  };

  if (!s.theme || !s.rows) return null;

  // Layout calculations
  const maxExtraLines = Math.max(...s.rows.flatMap(r => r.items.map(i => i.extraLines?.length || 0)), 0);
  const extraLineIndices = Array.from({ length: maxExtraLines }, (_, i) => i);
  const parts = s.theme.boxAspectRatio.split('/');
  const wRef = parseFloat(parts[0]) || 1;
  const hRef = parseFloat(parts[1]) || 1;
  const fixedHeight = s.theme.boxBaseWidth * (hRef / wRef);
  const maxItemsCount = Math.max(...s.rows.map(r => r.items.length), 0);
  const naturalTableWidth = maxItemsCount * s.theme.boxBaseWidth + (Math.max(0, maxItemsCount - 1) * s.gridGap);

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-gray-300 font-sans overflow-hidden text-[15px]">
      {/* Preview Modal */}
      {previewUrl && (
        <div className={`fixed inset-0 z-[100] ${isLightColor(s.theme.bgColor) ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300`}>
          <div className="absolute top-6 right-8 flex gap-4">
             <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"><Download className="w-5 h-5" /> 确认下载图片</button>
             <button onClick={() => setPreviewUrl(null)} className={`p-3 rounded-full shadow-2xl transition-all ${isLightColor(s.theme.bgColor) ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/10 hover:bg-black/20 text-black'}`}><X className="w-6 h-6" /></button>
          </div>
          <div className="w-full h-full flex items-center justify-center overflow-auto mt-12 scrollbar-hide">
             <img src={previewUrl} className={`max-w-none shadow-[0_0_80px_rgba(0,0,0,0.5)] border ${isLightColor(s.theme.bgColor) ? 'border-white/5' : 'border-black/5'}`} alt="Preview" style={{ zoom: 0.25 }} />
          </div>
          <p className={`mt-8 font-medium text-sm ${isLightColor(s.theme.bgColor) ? 'text-gray-400' : 'text-gray-600'}`}>此为 3x 超清预览，下载后将保存为高清 PNG 格式</p>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-[340px] border-r border-[#333] bg-[#222] p-5 flex flex-col gap-6 overflow-y-auto shrink-0 z-20 shadow-xl font-sans">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-white tracking-tighter uppercase">OC 制表工具</h1>
        </div>
        
        <div className="space-y-6">
          {/* Section: Styles and Fonts */}
          <section className="space-y-4">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Palette className="w-4 h-4" /> 样式与字体
            </h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-200 uppercase">全局字体</label>
                <div className="relative group/select">
                  <select 
                    className="w-full bg-[#2a2a2a] text-white p-2.5 pr-10 rounded-xl outline-none border border-[#333] text-sm font-medium focus:border-blue-500 transition-colors appearance-none cursor-pointer" 
                    value={s.theme.fontFamily} 
                    onChange={(e) => s.setTheme({ fontFamily: e.target.value })}
                  >
                    <option value='"Noto Serif SC", serif'>思源宋体 (默认)</option>
                    <option value='"HuiwenMincho", serif'>汇文明朝体 (新)</option>
                    <option value='"QijiCombo", serif'>齐伋体 (Qiji-Combo)</option>
                    <option value='"Noto Sans SC", sans-serif'>思源黑体</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {(s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) && isFontLoading && (
                  <div className="text-[11px] text-gray-400 flex items-start gap-1.5 px-1 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-blue-400" />
                    <span>字体加载中，请稍候...</span>
                  </div>
                )}
              </div>

              {/* Color Controls */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-gray-200">总背景颜色</span>
                  <input type="color" value={s.theme.bgColor} onChange={(e) => s.setTheme({ bgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-gray-200">文字颜色</span>
                  <input type="color" value={s.theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer rounded" />
                </div>
                
                {/* 格子填充 */}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-gray-200 uppercase">格子填充</span>
                  <div className="flex items-center gap-3">
                    <input type="color" value={s.theme.boxBgColor} onChange={(e) => s.setTheme({ boxBgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer rounded" />
                    <button onClick={() => s.setTheme({ showGridFill: !s.theme.showGridFill })} className={`p-1.5 rounded-lg transition-colors ${!s.theme.showGridFill ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-500/10'}`}>
                      {!s.theme.showGridFill ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 镂空透明 */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-gray-200 uppercase">镂空透明 (导出透明孔)</span>
                  </div>
                  <button onClick={() => s.setTheme({ isTransparentBg: !s.theme.isTransparentBg })} className={`p-1.5 rounded-lg transition-colors ${s.theme.isTransparentBg ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                    {s.theme.isTransparentBg ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-gray-200 uppercase">外框线</span>
                  <div className="flex items-center gap-3">
                    <input type="color" value={s.theme.borderColor} onChange={(e) => s.setTheme({ borderColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer rounded" />
                    <button onClick={() => s.setTheme({ showBoxBorder: !s.theme.showBoxBorder })} className={`p-1.5 rounded-lg transition-colors ${!s.theme.showBoxBorder ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-500/10'}`}>
                      {!s.theme.showBoxBorder ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[13px] text-gray-200 font-bold uppercase">
                  <span>线框粗细</span>
                  <span className="text-blue-400 text-xs">{s.theme.borderWidth}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="20" value={s.theme.borderWidth} onChange={(e) => s.setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <input type="number" value={s.theme.borderWidth} onChange={(e) => s.setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="w-14 bg-[#333] text-center font-bold text-[11px] rounded p-1" />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Title Management */}
          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight">全局标题调节</h2>
            <div className="space-y-2">
              {[
                { label: '主标题', key: 'titleSize', max: 200 },
                { label: '副标题', key: 'subtitleSize', max: 100 }
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="text-[13px] w-14 shrink-0 font-bold text-gray-200">{item.label}</span>
                  <input type="range" min="10" max={item.max} value={(s.theme as any)[item.key]} onChange={(e) => s.setTheme({ [item.key]: parseInt(e.target.value) || 10 })} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                  <input type="number" value={(s.theme as any)[item.key]} onChange={(e) => s.setTheme({ [item.key]: parseInt(e.target.value) || 10 })} className="w-14 bg-[#333] text-center font-bold text-[12px] rounded p-1 text-gray-100" />
                </div>
              ))}
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-200 uppercase">标题描边加粗</span>
                <input type="checkbox" checked={s.theme.titleBold !== false} onChange={(e) => s.setTheme({ titleBold: e.target.checked })} className="w-4 h-4 cursor-pointer accent-blue-500" />
              </div>
            </div>
          </section>

          {/* Section: Description Management */}
          <section className="space-y-4">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight">格子描述行管理</h2>
            <div className="space-y-4">
              {/* Row 1: Grid Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-blue-300 uppercase">
                  <span>格子标题行 (固定)</span>
                  <button onClick={() => s.setTheme({ showGridTitle: !s.theme.showGridTitle })} className={`p-1 rounded-md transition-colors ${!s.theme.showGridTitle ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-500/10'}`}>
                    {!s.theme.showGridTitle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="10" max={100} value={s.theme.baseTitleSize} onChange={(e) => s.updateGridTitleSizeGlobal(parseInt(e.target.value) || 10)} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                  <input type="color" value={s.rows[0]?.items[0]?.titleColor || s.theme.textColor} onChange={(e) => s.updateGridTitleColorGlobal(e.target.value)} className="w-5 h-5 border-0 bg-transparent p-0 cursor-pointer rounded" />
                  <input type="number" value={s.theme.baseTitleSize} onChange={(e) => s.updateGridTitleSizeGlobal(parseInt(e.target.value) || 10)} className="w-12 bg-[#333] text-center font-bold text-[11px] rounded p-1" />
                </div>
              </div>

              {/* Row 2: Grid Subtitle */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-blue-300 uppercase">
                  <span>格子副标题行 (固定)</span>
                  <button onClick={() => s.setTheme({ showGridSubtitle: !s.theme.showGridSubtitle })} className={`p-1 rounded-md transition-colors ${!s.theme.showGridSubtitle ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-500/10'}`}>
                    {!s.theme.showGridSubtitle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="10" max={100} value={s.theme.baseSubtitleSize} onChange={(e) => s.updateGridSubtitleSizeGlobal(parseInt(e.target.value) || 10)} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                  <input type="color" value={s.rows[0]?.items[0]?.subtitleColor || s.theme.textColor} onChange={(e) => s.updateGridSubtitleColorGlobal(e.target.value)} className="w-5 h-5 border-0 bg-transparent p-0 cursor-pointer rounded" />
                  <input type="number" value={s.theme.baseSubtitleSize} onChange={(e) => s.updateGridSubtitleSizeGlobal(parseInt(e.target.value) || 10)} className="w-12 bg-[#333] text-center font-bold text-[11px] rounded p-1" />
                </div>
              </div>

              {/* Dynamic Rows: Extra Descriptions */}
              {extraLineIndices.map(idx => {
                const isHidden = s.rows.every(r => r.items.every(i => i.extraLines?.[idx]?.hidden));
                return (
                  <div key={idx} className="space-y-1.5 group/dynamic">
                    <div className="flex justify-between items-center text-[11px] font-bold text-blue-300 uppercase">
                      <span>额外描述行 {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => s.toggleExtraLineVisibilityGlobal(idx)} className={`p-1 rounded-md transition-colors ${isHidden ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-500/10'}`}>
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => s.removeExtraLineIndexFromAll(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min="10" max={100} value={s.rows[0]?.items[0]?.extraLines?.[idx]?.fontSize || s.theme.baseExtraLineSize} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseInt(e.target.value) || 10)} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                      <input type="color" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.color || s.theme.textColor} onChange={(e) => s.updateExtraLineColorGlobal(idx, e.target.value)} className="w-5 h-5 border-0 bg-transparent p-0 cursor-pointer rounded" />
                      <input type="number" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.fontSize || s.theme.baseExtraLineSize} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseInt(e.target.value) || 10)} className="w-12 bg-[#333] text-center font-bold text-[11px] rounded p-1" />
                    </div>
                  </div>
                );
              })}
              
              <button onClick={s.addExtraLineToAll} className="w-full flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-blue-600/10 border border-[#333] hover:border-blue-500/50 text-gray-300 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg">
                <Plus className="w-4 h-4 text-blue-400" /> 
                添加一行描述到所有格子
              </button>
            </div>
          </section>

          {/* Section: Layout Details */}
          <section className="space-y-4">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Columns className="w-4 h-4" /> 布局细节
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-bold text-gray-200">格子比例</span>
                <select className="bg-[#2a2a2a] text-white p-1.5 rounded-lg outline-none text-xs font-bold border border-[#333] cursor-pointer" value={s.theme.boxAspectRatio} onChange={(e) => s.setTheme({ boxAspectRatio: e.target.value })}>
                  <option value="1/1">1:1</option>
                  <option value="3/4">3:4</option>
                  <option value="4/3">4:3</option>
                  <option value="9/16">9:16</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              {[
                { label: '格子宽度', key: 'boxBaseWidth', min: 50, max: 800 },
                { label: '列间距', key: 'gridGap', min: 0, max: 150, global: true },
                { label: '行间距', key: 'rowGap', min: 0, max: 300, global: true },
                { label: '标题-作者距', key: 'titleAuthorGap', min: 0, max: 200 },
                { label: '作者-表格距', key: 'authorGridGap', min: 0, max: 300 },
                { label: '文-框偏移', key: 'textMarginTop', min: -50, max: 150 },
                { label: '描述行间距', key: 'titleSubtitleGap', min: 0, max: 100 },
                { label: '画布总宽', key: 'containerWidth', min: 400, max: 3500, global: true }
              ].map(item => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex justify-between font-bold text-gray-200 text-[12px] uppercase">
                    <span>{item.label}</span>
                    <span className="text-blue-400">{item.global ? (s as any)[item.key] : (s.theme as any)[item.key]}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={item.min} max={item.max} value={item.global ? (s as any)[item.key] : (s.theme as any)[item.key]} onChange={(e) => item.global ? (s as any)[`set${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`](parseInt(e.target.value) || 0) : s.setTheme({ [item.key]: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <input type="number" value={item.global ? (s as any)[item.key] : (s.theme as any)[item.key]} onChange={(e) => item.global ? (s as any)[`set${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`](parseInt(e.target.value) || 0) : s.setTheme({ [item.key]: parseInt(e.target.value) || 0 })} className="w-14 bg-[#333] text-center rounded p-1 text-[11px] font-bold text-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-6 border-t border-[#333]">
          <button 
            disabled={isGenerating} 
            onClick={handleShowPreview} 
            className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 shadow-lg hover:bg-gray-100 transition-all active:scale-[0.98]"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} 
            {isGenerating ? '渲染中...' : '生成 3x 超清预览'}
          </button>
        </div>
      </div>

      {/* Main Area / Canvas */}
      <div className="flex-1 overflow-auto p-12 bg-neutral-800 relative scroll-smooth font-sans" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        {exportMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] bg-blue-600 text-white px-8 py-3 rounded-full animate-bounce flex items-center gap-3 shadow-2xl font-bold">
            <span>{exportMessage}</span>
          </div>
        )}

        {/* Zoom Controls Overlay */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 bg-[#222]/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-[#444]">
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="放大"><ZoomIn className="w-5 h-5" /></button>
          <div className="text-center text-xs font-bold text-gray-400 py-1">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="缩小"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={() => setZoom(1)} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="重置大小"><RotateCcw className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center min-w-max mx-auto transition-transform duration-200 origin-top" style={{ transform: `scale(${zoom})` }}>
          <div 
            ref={canvasRef} 
            className="p-16 relative shadow-2xl transition-all duration-500 overflow-hidden" 
            style={{ 
              backgroundColor: 'transparent', 
              isolation: 'isolate', 
              color: s.theme.textColor, 
              width: `${s.containerWidth}px`, 
              maxWidth: 'none' 
            }}
          >
            {/* Donut Background */}
            <PunchHoleBackground 
              containerRef={canvasRef} 
              bgColor={s.theme.bgColor} 
              isTransparent={s.theme.isTransparentBg} 
              zoom={zoom} 
              rowCount={s.rows.length} 
              colCount={maxItemsCount} 
              containerWidth={s.containerWidth} 
            />

            {/* Header Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="relative w-full group/label">
                 <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1.5 rounded-lg z-30 shadow-lg border border-[#444]">
                    <input type="color" value={s.theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer rounded" />
                 </div>
                 <textarea 
                   className="w-full text-center bg-transparent outline-none placeholder-gray-800 tracking-wider resize-none overflow-hidden block p-0" 
                   style={{ 
                     fontFamily: 'var(--oc-font)', 
                     color: s.theme.textColor, 
                     fontSize: `${s.theme.titleSize}px`, 
                     fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', 
                     WebkitTextStroke: s.theme.titleBold !== false && (s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) ? '1px currentColor' : '0', 
                     lineHeight: 1.1 
                   }} 
                   rows={1} 
                   value={s.title} 
                   onInput={handleAutoResize} 
                   onChange={(e) => s.setTitle(e.target.value)} 
                   placeholder="大标题" 
                 />
              </div>
              <div style={{ height: `${s.theme.titleAuthorGap}px` }} />
              <div 
                className="flex justify-between items-center w-full px-12 font-bold" 
                style={{ fontFamily: 'var(--oc-font)', fontSize: `${s.theme.subtitleSize}px`, fontWeight: 'normal' }}
              >
                <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/3 block p-0" value={s.author} onChange={(e) => s.setAuthor(e.target.value)} placeholder="制表人：" />
                <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/2 block ml-16 p-0" value={s.filler} onChange={(e) => s.setFiller(e.target.value)} placeholder="填表人：" />
              </div>
            </div>

            <div style={{ height: `${s.theme.authorGridGap}px` }} />

            {/* Grid Table */}
            <div className="relative z-10 flex flex-col items-center" style={{ gap: `${s.rowGap}px`, width: '100%' }}>
              <div className="flex flex-col" style={{ width: `${naturalTableWidth}px`, gap: `${s.rowGap}px` }}>
                {s.rows.map((row) => (
                  <div key={row.id} className="flex relative group/row justify-center" style={{ gap: `${s.gridGap}px`, width: '100%' }}>
                    <div className="no-export absolute -left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex flex-col gap-2 z-20">
                      <button onClick={() => s.addItemToRow(row.id)} className="p-1.5 bg-blue-600 text-white rounded-lg shadow-lg hover:scale-110" title="加格子"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => s.toggleRowFillWidth(row.id)} className={`p-1.5 rounded-lg shadow-lg transition-all hover:scale-110 ${row.fillWidth ? 'bg-orange-500 text-white' : 'bg-gray-600 text-gray-100'}`} title="铺满该行"><StretchHorizontal className="w-4 h-4" /></button>
                      <button onClick={() => s.removeRow(row.id)} className="p-1.5 bg-red-600 text-white rounded-lg shadow-lg hover:scale-110" title="删行"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    {row.items.map((item) => {
                      const currentTitleSize = item.titleSize || s.theme.baseTitleSize;
                      const currentSubtitleSize = item.subtitleSize || s.theme.baseSubtitleSize;

                      return (
                        <div key={item.id} className="flex flex-col relative group/box transition-all duration-300" style={{ flex: row.fillWidth ? '1 1 0%' : 'none', width: row.fillWidth ? 'auto' : `${s.theme.boxBaseWidth}px` }}>
                          {/* Box Tooltip Controls */}
                          <div className="no-export absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/box:opacity-100 transition-opacity z-20 bg-[#1a1a1a]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#333] items-center text-[10px] shadow-2xl min-w-max">
                            <button onClick={() => s.updateItem(row.id, item.id, { showSubtitle: !item.showSubtitle })} className="text-gray-400 hover:text-white px-1">
                              {item.showSubtitle === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => s.addExtraLine(row.id, item.id)} className="text-blue-400 hover:text-blue-300 font-bold px-1">+描述</button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) - 4 })} className="text-gray-400 hover:text-white"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) + 4 })} className="text-gray-400 hover:text-white"><ArrowDown className="w-4 h-4" /></button>
                            {row.items.length > 1 && <button onClick={() => s.removeItemFromRow(row.id, item.id)} className="text-red-500 ml-1 hover:bg-red-500/10 rounded p-0.5"><Trash2 className="w-4 h-4" /></button>}
                          </div>

                          {/* The Grid Box */}
                          <div 
                            className={`grid-box-inner w-full relative transition-all duration-300 ${s.theme.isTransparentBg ? '' : 'shadow-lg'}`} 
                            style={{ 
                              height: `${fixedHeight}px`, 
                              border: (s.theme.showBoxBorder && s.theme.borderWidth > 0) ? `${s.theme.borderWidth}px solid ${s.theme.borderColor}` : 'none', 
                              backgroundColor: s.theme.showGridFill ? s.theme.boxBgColor : 'transparent' 
                            }}
                          >
                            <textarea 
                              className="w-full h-full p-4 bg-transparent outline-none resize-none relative z-10" 
                              style={{ 
                                fontFamily: 'var(--oc-font)', 
                                color: s.theme.showGridFill ? (isLightColor(s.theme.boxBgColor) ? '#111827' : '#f3f4f6') : s.theme.textColor
                              }} 
                              value={item.content} 
                              onChange={(e) => s.updateItem(row.id, item.id, { content: e.target.value })} 
                            />
                          </div>

                          {/* Descriptions Below the Box */}
                          <div 
                            className="text-center flex flex-col items-center transition-all duration-300" 
                            style={{ 
                              marginTop: `${(item.textOffsetY || 0) + s.theme.textMarginTop}px`, 
                              gap: `${s.theme.titleSubtitleGap}px` 
                            }}
                          >
                            {s.theme.showGridTitle !== false && (
                              <div className="relative w-full group/label">
                                <div className="no-export absolute -left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={item.titleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { titleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer rounded" />
                                   <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (item.titleSize || s.theme.baseTitleSize) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                   <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (item.titleSize || s.theme.baseTitleSize) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                                </div>
                                <textarea 
                                  className="w-full text-center bg-transparent outline-none resize-none overflow-hidden block p-0" 
                                  rows={1} 
                                  style={{ 
                                    fontFamily: 'var(--oc-font)', 
                                    color: item.titleColor || s.theme.textColor, 
                                    fontSize: `${currentTitleSize}px`, 
                                    fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', 
                                    WebkitTextStroke: s.theme.titleBold !== false && (s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) ? '0.5px currentColor' : '0', 
                                    lineHeight: 1.1 
                                  }} 
                                  value={item.title} 
                                  onInput={handleAutoResize} 
                                  onChange={(e) => s.updateItem(row.id, item.id, { title: e.target.value })} 
                                  placeholder="格子标题" 
                                />
                              </div>
                            )}

                            {(s.theme.showGridSubtitle !== false && item.showSubtitle !== false) && (
                              <div className="relative w-full group/label">
                                <div className="no-export absolute -left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={item.subtitleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { subtitleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer rounded" />
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (item.subtitleSize || s.theme.baseSubtitleSize) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (item.subtitleSize || s.theme.baseSubtitleSize) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                                </div>
                                <textarea 
                                  className="w-full text-center bg-transparent outline-none opacity-80 resize-none overflow-hidden block p-0" 
                                  rows={1} 
                                  style={{ 
                                    fontFamily: 'var(--oc-font)', 
                                    color: item.subtitleColor || s.theme.textColor, 
                                    fontSize: `${currentSubtitleSize}px`, 
                                    fontWeight: 'normal', 
                                    lineHeight: 1.2 
                                  }} 
                                  value={item.subtitle} 
                                  onInput={handleAutoResize} 
                                  onChange={(e) => s.updateItem(row.id, item.id, { subtitle: e.target.value })} 
                                  placeholder="格子小字" 
                                />
                              </div>
                            )}

                            {item.extraLines?.map((line, lineIndex) => {
                              if (line.hidden) return null;
                              return (
                                <div key={line.id} className="relative w-full group/label flex justify-center">
                                  <div className="no-export absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                     <input type="color" value={line.color || s.theme.textColor} onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, { color: e.target.value })} className="w-3 h-3 p-0 border-0 bg-transparent cursor-pointer rounded" />
                                     <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (line.fontSize || s.theme.baseExtraLineSize) + 2 })} className="text-[10px] text-blue-500 font-bold">+</button>
                                     <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (line.fontSize || s.theme.baseExtraLineSize) - 2 })} className="text-[10px] text-blue-500 font-bold">-</button>
                                     <button onClick={() => s.removeExtraLine(row.id, item.id, line.id)} className="text-red-500 ml-1 hover:scale-110 transition-transform"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                  <textarea 
                                    className="w-full text-center bg-transparent outline-none opacity-70 resize-none overflow-hidden block p-0" 
                                    rows={1} 
                                    style={{ 
                                      fontFamily: 'var(--oc-font)', 
                                      color: line.color || s.theme.textColor, 
                                      fontSize: `${line.fontSize || s.theme.baseExtraLineSize}px`, 
                                      fontWeight: 'normal' 
                                    }} 
                                    value={line.text} 
                                    onInput={handleAutoResize} 
                                    onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, { text: e.target.value })} 
                                    placeholder={`描述行 ${lineIndex + 1}`} 
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="no-export flex justify-center mt-12 mb-20">
            <button 
              onClick={s.addRow} 
              className="group flex items-center gap-3 bg-[#222] hover:bg-blue-600 border border-[#444] hover:border-blue-500 text-gray-400 hover:text-white px-12 py-4 rounded-full transition-all shadow-2xl font-bold uppercase tracking-widest text-sm"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span>添加新行</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
