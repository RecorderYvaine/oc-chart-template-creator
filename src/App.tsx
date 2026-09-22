import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useStore, type AppDocument } from './store';
import { 
  Plus, Trash2, Eye, EyeOff, Palette, Columns, Layers, Loader2, 
  ArrowUp, ArrowDown, StretchHorizontal, ChevronDown, Download, 
  X, Search, ZoomIn, ZoomOut, RotateCcw, AlignLeft, Undo2, Redo2
} from 'lucide-react';
import { FormatToolbar } from './components/FormatToolbar';
import { PunchHoleBackground } from './components/PunchHoleBackground';
import { RichText } from './components/RichText';
import { generateNativeScreenshot } from './export/generateNativeScreenshot';
import { isLightColor } from './utils/color';

const isTextEditingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tagName = el.tagName;
  return el.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || Boolean(el.closest('.rich-text'));
};

const parseNumberInput = (value: string) => (value === '' ? '' : parseInt(value));

type LayoutControl =
  | { label: string; key: 'gridGap' | 'rowGap'; min: number; max: number; global: true }
  | {
      label: string;
      key: 'boxBaseWidth' | 'titleAuthorGap' | 'authorGridGap' | 'containerPadding';
      min: number;
      max: number;
      def: number;
      global?: false;
    };

const layoutControls: LayoutControl[] = [
  { label: '格子宽', key: 'boxBaseWidth', min: 50, max: 800, def: 200 },
  { label: '格子列间距', key: 'gridGap', min: 0, max: 150, global: true },
  { label: '格子行间距', key: 'rowGap', min: 0, max: 300, global: true },
  { label: '大标题-作者间距', key: 'titleAuthorGap', min: 0, max: 200, def: 32 },
  { label: '作者-表格间距', key: 'authorGridGap', min: 0, max: 300, def: 32 },
  { label: '画布边缘间距', key: 'containerPadding', min: 0, max: 200, def: 64 },
];

function App() {
  const s = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState('oc-form.png');
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'style' | 'layout'>('style');
  const fontFamily = s.theme.fontFamily;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevZoomRef = useRef(1);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(Math.max(z - e.deltaY * 0.01, 0.2), 3));
      }
    };
    // Use non-passive listener to allow preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isTextEditingTarget(e.target)) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        s.redo();
      } else {
        s.undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [s]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const oldZoom = prevZoomRef.current;
    if (oldZoom === zoom) return;

    // Calculate center of the viewport relative to the scroll container
    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerY = container.scrollTop + container.clientHeight / 2;

    // Find the unzoomed coordinates of that center point
    const contentX = centerX / oldZoom;
    const contentY = centerY / oldZoom;

    // Calculate the new coordinates of that point after zooming
    const newCenterX = contentX * zoom;
    const newCenterY = contentY * zoom;

    // Adjust scroll to keep that point in the center of the viewport
    container.scrollLeft = newCenterX - container.clientWidth / 2;
    container.scrollTop = newCenterY - container.clientHeight / 2;

    prevZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    document.fonts.load('1em "QijiP1"').catch(() => {});
    document.fonts.load('1em "QijiP2"').catch(() => {});
    document.fonts.load('1em "HuiwenMincho"').catch(() => {});
    document.fonts.load('1em "Noto Serif SC"').catch(() => {});
    document.fonts.load('bold 1em "Noto Serif SC"').catch(() => {});
    document.fonts.load('1em "Noto Sans SC"').catch(() => {});
    document.fonts.load('bold 1em "Noto Sans SC"').catch(() => {});
    document.fonts.load('1em "Noto Serif SC Bold Canvas"').catch(() => {});
    document.fonts.load('1em "Noto Sans SC Bold Canvas"').catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const loadSelectedFont = async () => {
      if (fontFamily.includes('Qiji')) {
        setIsFontLoading(true);
        await Promise.all([
          document.fonts.load('1em "QijiP1"'),
          document.fonts.load('1em "QijiP2"'),
          document.fonts.load('1em "HuiwenMincho"'),
        ]);
      } else if (fontFamily.includes('Huiwen')) {
        setIsFontLoading(true);
        await document.fonts.load('1em "HuiwenMincho"');
      } else {
        setIsFontLoading(false);
        return;
      }

      if (active) setIsFontLoading(false);
    };

    void loadSelectedFont();
    return () => {
      active = false;
    };
  }, [fontFamily]);

  useEffect(() => {
    if (!s.theme) return;
    const r = document.documentElement;
    r.style.setProperty('--oc-bg', s.theme.bgColor);
    r.style.setProperty('--oc-text', s.theme.textColor);
    r.style.setProperty('--oc-border', s.theme.borderColor);
    r.style.setProperty('--oc-border-width', `${s.theme.borderWidth}px`);
    r.style.setProperty('--oc-box-bg', s.theme.boxBgColor);
    if (s.theme.fontFamily) {
      r.style.setProperty('--oc-font', s.theme.fontFamily);
      const isCustomFamily = s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen');
      r.style.setProperty('--oc-font-weight', isCustomFamily ? 'normal' : 'bold');
    }
  }, [s.theme]);

  const handleShowPreview = async () => {
    if (!canvasRef.current || isGenerating) return;
    setIsGenerating(true); 
    setRenderProgress(0); 
    
    const originalZoom = zoom;
    setZoom(1);

    try {
      setRenderProgress(10);
      await new Promise(r => setTimeout(r, 50));

      const noExportEls = document.querySelectorAll('.no-export');
      noExportEls.forEach(el => (el as HTMLElement).style.display = 'none');

      setRenderProgress(40);
      await new Promise(r => setTimeout(r, 100)); // Yield to allow progress bar to animate

      // Heavy synchronous rendering
      const dataUrl = await generateNativeScreenshot(canvasRef.current!, s, 3);

      setRenderProgress(100); 
      await new Promise(r => setTimeout(r, 50));

      noExportEls.forEach(el => (el as HTMLElement).style.display = '');

      setPreviewFilename(`oc-form-${Date.now()}.png`);
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error(err);
      alert('渲染失败，请重试');
    } finally {
      setIsGenerating(false);
      setZoom(originalZoom);
    }
  };

  const maxItemsCount = Math.max(0, ...s.rows.map(r => r.items.length));
  const naturalTableWidth = maxItemsCount * (Number(s.theme.boxBaseWidth) || 0) + (maxItemsCount - 1) * (Number(s.gridGap) || 0);
  const aspectRatioParts = s.theme.boxAspectRatio === 'custom' ? [1, 1] : s.theme.boxAspectRatio.split('/').map(Number);
  const fixedHeight = ((Number(s.theme.boxBaseWidth) || 0) * aspectRatioParts[1]) / aspectRatioParts[0];

  const maxExtraLines = Math.max(0, ...s.rows.flatMap(r => r.items.map(it => it.extraLines?.length || 0)));
  const extraLineIndices = Array.from({ length: maxExtraLines }, (_, i) => i);

  const previewModalIsLight = isLightColor(s.theme.bgColor);
  const canUndo = s.past.length > 0;
  const canRedo = s.future.length > 0;
  const getLayoutValue = (item: LayoutControl) => (item.global ? s[item.key] : s.theme[item.key] ?? item.def);
  const updateLayoutValue = (item: LayoutControl, value: number | '') => {
    if (item.global) {
      if (item.key === 'gridGap') {
        s.setGridGap(value);
      } else {
        s.setRowGap(value);
      }
      return;
    }

    const themePatch: Partial<AppDocument['theme']> = { [item.key]: value };
    s.setTheme(themePatch);
  };

  return (
    <div className="flex h-screen bg-[#111] text-[#eee] overflow-hidden selection:bg-blue-500/30">
      <FormatToolbar />
      {isGenerating && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold text-white tracking-widest">正在渲染...</h2>
            <div className="flex flex-col items-center gap-3">
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <span className="text-white/70 font-mono text-sm">{renderProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className={`fixed inset-0 z-[100] ${previewModalIsLight ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300`}>
          <button onClick={() => setPreviewUrl(null)} className={`absolute top-8 right-8 ${previewModalIsLight ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/5'} p-2 rounded-full transition-all`}><X className="w-8 h-8" /></button>
          <div className="relative max-w-full max-h-[80vh] group">
            <img src={previewUrl} className={`max-w-full max-h-[80vh] shadow-2xl rounded-sm border ${previewModalIsLight ? 'border-white/10' : 'border-black/10'}`} alt="Preview" />
            <a href={previewUrl} download={previewFilename} className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-all min-w-max"><Download className="w-5 h-5" /> 下载 PNG 图片</a>
          </div>
          <p className={`mt-24 text-sm font-medium ${previewModalIsLight ? 'text-gray-400' : 'text-gray-500'}`}>此为生成的预览图，下载后将保存为 PNG 格式</p>
        </div>
      )}

      <div className="w-[340px] border-r border-[#333] bg-[#222] flex flex-col shrink-0 z-20 shadow-xl font-sans h-full">
        <div className="p-5 pb-4 flex flex-col gap-5 border-b border-[#333] shrink-0 bg-[#222] z-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Layers className="w-6 h-6 text-blue-500 shrink-0" />
              <h1 className="text-xl font-bold text-white tracking-tighter uppercase truncate">OC 制表工具</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={s.undo}
                disabled={!canUndo}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300 transition-colors"
                title="撤销 Cmd+Z"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={s.redo}
                disabled={!canRedo}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300 transition-colors"
                title="重做 Cmd+Shift+Z"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">草稿会自动保存到当前浏览器</div>
        </div>

        <div className="flex bg-[#1a1a1a] rounded-lg p-1 gap-1 shrink-0 mt-4 mb-2 mx-5">
          <button onClick={() => setActiveTab('style')} className={`flex-1 py-1.5 text-[14px] font-bold rounded-md transition-all ${activeTab === 'style' ? 'bg-[#333] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>样式与字体</button>
          <button onClick={() => setActiveTab('layout')} className={`flex-1 py-1.5 text-[14px] font-bold rounded-md transition-all ${activeTab === 'layout' ? 'bg-[#333] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>整体布局</button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {activeTab === 'style' && (
            <>
              <section className="space-y-4">
                <h2 className="text-[17px] font-bold text-white uppercase tracking-tight flex items-center gap-2"><Palette className="w-4 h-4" /> 全局样式</h2>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="text-[13px] font-bold text-gray-200 uppercase px-0.5">全局字体选择</label>
                    <div className="relative group/select">
                      <select className="w-full bg-[#2a2a2a] text-white p-3 pr-12 rounded-xl outline-none border border-[#333] text-sm font-medium focus:border-blue-500 transition-colors appearance-none cursor-pointer" value={s.theme.fontFamily} onChange={(e) => s.setTheme({ fontFamily: e.target.value })}>
                        <option value='"Noto Serif SC", serif'>思源宋体</option>
                        <option value='"HuiwenMincho", serif'>汇文明朝体</option>
                        <option value='"QijiP1", "QijiP2", "HuiwenMincho", serif'>齐伋体</option>
                        <option value='"Noto Sans SC", sans-serif'>思源黑体</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/select:text-white transition-colors" />
                    </div>
                    {(s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) && isFontLoading && (
                      <div className="text-[11px] text-gray-400 flex items-start gap-1.5 px-1 animate-pulse mt-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-blue-400" />
                        <span>该字体加载较慢，请耐心等待一段时间。</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[13px] font-bold text-gray-200 uppercase">总背景颜色</span>
                      <input type="color" value={s.theme.bgColor} onChange={(e) => s.setTheme({ bgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-200 uppercase">格子填充</span><span className="text-[10px] text-gray-500">隐藏即显示背景色</span></div>
                      <div className="flex items-center gap-3">
                        <input type="color" value={s.theme.boxBgColor} onChange={(e) => s.setTheme({ boxBgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
                        <button onClick={() => s.setTheme({ showGridFill: !s.theme.showGridFill })} className={`p-1 rounded-lg transition-colors ${s.theme.showGridFill ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                          {s.theme.showGridFill ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-white/5 pt-2">
                      <span className="text-[13px] font-bold text-gray-200 uppercase">透明格子</span>
                      <input type="checkbox" checked={s.theme.isTransparentBg === true} onChange={(e) => s.setTheme({ isTransparentBg: e.target.checked })} className="w-4 h-4 cursor-pointer accent-blue-500" />
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-white/5 pt-2">
                      <span className="text-[13px] font-bold text-gray-200 uppercase">外框线颜色</span>
                      <div className="flex items-center gap-3">
                        <input type="color" value={s.theme.borderColor} onChange={(e) => s.setTheme({ borderColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
                        <button onClick={() => s.setTheme({ showBoxBorder: !s.theme.showBoxBorder })} className={`p-1 rounded-lg transition-colors ${s.theme.showBoxBorder ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                          {s.theme.showBoxBorder ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 pb-2">
                      <div className="flex justify-between text-[13px] text-gray-200 font-bold uppercase"><span>线框粗细</span><span className="text-blue-400 text-xs">{s.theme.borderWidth}px</span></div>
                      <input type="range" min="0" max="10" value={s.theme.borderWidth} onChange={(e) => s.setTheme({ borderWidth: parseNumberInput(e.target.value) })} className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[#333]">
                    <div className="text-[15px] font-bold text-gray-200 uppercase px-0.5">主标题</div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="10" max={200} value={s.theme.titleSize} onChange={(e) => s.setTheme({ titleSize: parseNumberInput(e.target.value) })} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                        <input type="number" value={s.theme.titleSize} onChange={(e) => s.setTheme({ titleSize: parseNumberInput(e.target.value) })} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1 text-gray-200" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[13px] font-bold text-gray-200 uppercase">标题加粗</span>
                      <input type="checkbox" checked={s.theme.titleBold !== false} onChange={(e) => s.setTheme({ titleBold: e.target.checked })} className="w-4 h-4 cursor-pointer accent-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[#333] pt-4">
                    <div className="flex justify-between items-center px-0.5">
                      <div className="text-[15px] font-bold text-gray-200 uppercase">全局副标题</div>
                      <button onClick={() => s.setTheme({ showGlobalSubtitle: !s.theme.showGlobalSubtitle })} className={`p-1 rounded-lg transition-colors ${s.theme.showGlobalSubtitle !== false ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                        {s.theme.showGlobalSubtitle !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="10" max={100} value={s.theme.globalSubtitleSize || 20} onChange={(e) => s.setTheme({ globalSubtitleSize: parseNumberInput(e.target.value) })} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                        <input type="number" value={s.theme.globalSubtitleSize || 20} onChange={(e) => s.setTheme({ globalSubtitleSize: parseNumberInput(e.target.value) })} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1 text-gray-200" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[#333] pt-4 pb-2">
                    <div className="text-[15px] font-bold text-gray-200 uppercase px-0.5">制表与填表人</div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="10" max="100" value={s.theme.authorFillerSize || 18} onChange={(e) => s.setTheme({ authorFillerSize: parseNumberInput(e.target.value) })} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                        <input type="number" value={s.theme.authorFillerSize || 18} onChange={(e) => s.setTheme({ authorFillerSize: parseNumberInput(e.target.value) })} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1 text-gray-200" />
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              <hr className="border-[#444] my-2" />

              <section className="space-y-3 pb-6">
                <h2 className="text-[17px] font-bold text-white uppercase tracking-tight flex items-center gap-2"><AlignLeft className="w-4 h-4" /> 格子描述行管理</h2>
                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <div className="text-[15px] font-bold text-gray-200 uppercase px-0.5">格子标题</div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                      <div className="flex items-center gap-3">
                        <input type="range" min="10" max={100} value={s.theme.baseTitleSize} onChange={(e) => s.updateGridTitleSizeGlobal(parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                        <input type="number" value={s.theme.baseTitleSize} onChange={(e) => s.updateGridTitleSizeGlobal(parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                        <input type="color" value={s.rows[0]?.items[0]?.titleColor || s.theme.textColor} onChange={(e) => s.updateGridTitleColorGlobal(e.target.value)} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer shrink-0" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">与上方素材距离</div>
                      <div className="flex items-center gap-3">
                        <input type="range" min="0" max="200" value={s.theme.baseTitleSpacing} onChange={(e) => s.updateGridTitleSpacingGlobal(parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-400" />
                        <input type="number" value={s.theme.baseTitleSpacing} onChange={(e) => s.updateGridTitleSpacingGlobal(parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                        <button onClick={() => s.setTheme({ showGridTitle: !s.theme.showGridTitle })} className={`p-1 rounded transition-colors ${s.theme.showGridTitle ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                          {s.theme.showGridTitle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="text-[15px] font-bold text-gray-200 uppercase px-0.5">格子小字</div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                      <div className="flex items-center gap-3">
                        <input type="range" min="10" max={100} value={s.theme.baseSubtitleSize} onChange={(e) => s.updateGridSubtitleSizeGlobal(parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                        <input type="number" value={s.theme.baseSubtitleSize} onChange={(e) => s.updateGridSubtitleSizeGlobal(parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                        <input type="color" value={s.rows[0]?.items[0]?.subtitleColor || s.theme.textColor} onChange={(e) => s.updateGridSubtitleColorGlobal(e.target.value)} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer shrink-0" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[13px] font-bold text-gray-300 uppercase">与上方素材距离</div>
                      <div className="flex items-center gap-3">
                        <input type="range" min="0" max="200" value={s.theme.baseSubtitleSpacing} onChange={(e) => s.updateGridSubtitleSpacingGlobal(parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-400" />
                        <input type="number" value={s.theme.baseSubtitleSpacing} onChange={(e) => s.updateGridSubtitleSpacingGlobal(parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                        <button onClick={() => s.updateItem(s.rows[0]?.id, s.rows[0]?.items[0]?.id, { showSubtitle: !s.rows[0]?.items[0]?.showSubtitle })} className={`p-1 rounded transition-colors ${s.theme.showGridSubtitle ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                          {s.theme.showGridSubtitle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {extraLineIndices.map(idx => (
                    <div key={idx} className="space-y-3 border-t border-white/5 pt-4">
                      <div className="text-[15px] font-bold text-gray-200 uppercase px-0.5">第 {idx + 1} 行描述</div>
                      <div className="space-y-1">
                        <div className="text-[13px] font-bold text-gray-300 uppercase">字体调节</div>
                        <div className="flex items-center gap-3">
                          <input type="range" min="10" max={100} value={s.rows[0]?.items[0]?.extraLines?.[idx]?.fontSize ?? s.theme.baseExtraLineSize} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                          <input type="number" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.fontSize ?? s.theme.baseExtraLineSize} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                          <input type="color" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.color || s.theme.textColor} onChange={(e) => s.updateExtraLineColorGlobal(idx, e.target.value)} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer shrink-0" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[13px] font-bold text-gray-300 uppercase">与上方素材距离</div>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="200" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.spacing ?? s.theme.baseExtraLineSpacing} onChange={(e) => s.updateExtraLineSpacingGlobal(idx, parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] accent-blue-400" />
                          <input type="number" value={s.rows[0]?.items[0]?.extraLines?.[idx]?.spacing ?? s.theme.baseExtraLineSpacing} onChange={(e) => s.updateExtraLineSpacingGlobal(idx, parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center font-bold text-[13px] rounded p-1" />
                          <button onClick={() => s.toggleExtraLineVisibilityGlobal(idx)} className={`p-1 rounded transition-colors ${!s.rows[0]?.items[0]?.extraLines?.[idx]?.hidden ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}>
                            {!s.rows[0]?.items[0]?.extraLines?.[idx]?.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => s.removeExtraLineIndexFromAll(idx)} className="p-1 text-gray-500 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={s.addExtraLineToAll} className="w-full mt-2 flex items-center justify-center gap-2 bg-[#333] hover:bg-blue-600/20 border border-[#444] text-gray-300 py-2 rounded-xl transition-all text-xs font-bold shadow-lg"><Plus className="w-4 h-4 text-blue-400" /> 添加一行描述到所有格子</button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'layout' && (
            <section className="space-y-3">
              <h2 className="text-[17px] font-bold text-white uppercase tracking-tight flex items-center gap-2"><Columns className="w-4 h-4" /> 布局细节</h2>
              <div className="space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[13px] font-bold text-gray-200 uppercase">格子比例</span>
                  <select className="bg-[#2a2a2a] text-white p-1 rounded-lg outline-none text-xs font-bold border border-[#333]" value={s.theme.boxAspectRatio} onChange={(e) => s.setTheme({ boxAspectRatio: e.target.value })}>
                    <option value="1/1">1:1</option>
                    <option value="3/4">3:4</option>
                    <option value="4/3">4:3</option>
                    <option value="9/16">9:16</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                {layoutControls.map(item => {
                  const val = getLayoutValue(item);
                  return (
                    <div key={item.key} className="space-y-1 py-1">
                      <div className="flex justify-between font-bold text-gray-200 text-[13px] uppercase"><span>{item.label}</span><span className="text-blue-400 text-xs">{val}px</span></div>
                      <div className="flex items-center gap-3">
                        <input type="range" min={item.min} max={item.max} value={val} onChange={(e) => updateLayoutValue(item, parseNumberInput(e.target.value))} className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                        <input type="number" value={val} onChange={(e) => updateLayoutValue(item, parseNumberInput(e.target.value))} className="w-14 bg-[#333] text-center rounded p-1 text-[13px] font-bold text-gray-200" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        <div className="p-5 pt-4 border-t border-[#333] shrink-0 bg-[#222]">
          <button disabled={isGenerating} onClick={handleShowPreview} className="w-full bg-white text-black py-2.5 rounded-xl font-bold text-[14px] flex justify-center items-center gap-2 shadow-lg hover:bg-gray-100 hover:scale-[1.02] transition-all">{isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} {isGenerating ? '正在渲染...' : ' 生成预览'}</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 flex overflow-auto p-12 bg-neutral-800 relative font-sans" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2 bg-[#222] p-2 rounded-2xl shadow-2xl border border-[#444]">
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="放大"><ZoomIn className="w-5 h-5" /></button>
          <div className="flex items-center justify-center text-[10px] font-bold text-gray-400 py-0.5 w-full">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="缩小"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={() => setZoom(1)} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title=" 重置大小"><RotateCcw className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col items-center min-w-max m-auto transition-all duration-200 relative group/main pb-24 px-24" style={{ zoom }}>
          <div ref={canvasRef} className="inline-flex flex-col items-center relative shadow-2xl transition-all duration-500" style={{ backgroundColor: s.theme.isTransparentBg ? 'transparent' : s.theme.bgColor, isolation: 'isolate', color: s.theme.textColor, padding: `${s.theme.containerPadding ?? 64}px` }}>
            <PunchHoleBackground s={s} canvasRef={canvasRef} />
            <div className="relative z-10 flex flex-col items-center text-center w-full">
              <div className="relative w-full group/label">
                 <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                    <input type="color" value={s.theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                 </div>
                 <RichText className="title-big w-full text-center bg-transparent outline-none tracking-wider resize-none block p-0" style={{ fontFamily: 'var(--oc-font)', color: s.theme.textColor, fontSize: `${s.theme.titleSize}px`, fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', WebkitTextStroke: s.theme.titleBold !== false && (s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) ? '0.8px currentColor' : '0', lineHeight: 1.1, whiteSpace: 'pre-wrap' }} value={s.title} onChange={(val: string) => s.setTitle(val)} placeholder="大标题" />
                 </div>

                 {s.theme.showGlobalSubtitle !== false && (
                 <div className="relative w-full group/label mt-2">
                  <RichText className="w-full text-center bg-transparent outline-none tracking-wider resize-none block p-0" style={{ fontFamily: 'var(--oc-font)', color: s.theme.textColor, fontSize: `${s.theme.globalSubtitleSize || 20}px`, fontWeight: 'normal', lineHeight: 1.2, whiteSpace: 'pre-wrap' }} value={s.globalSubtitle || ''} onChange={(val: string) => s.setGlobalSubtitle(val)} placeholder="全局副标题" />
                 </div>
                 )}

                 <div style={{ height: `${s.theme.titleAuthorGap}px` }} />
                 <div className="flex justify-between items-center w-full px-12 font-bold gap-8" style={{ fontFamily: 'var(--oc-font)', fontSize: `${s.theme.authorFillerSize || 18}px`, fontWeight: 'normal' }}>
                 <RichText className="bg-transparent outline-none text-left w-full block p-0 single-line-center" value={s.author} onChange={(val: string) => s.setAuthor(val)} placeholder="制表人：" />
                 <RichText className="bg-transparent outline-none text-left w-full block p-0 single-line-center" value={s.filler} onChange={(val: string) => s.setFiller(val)} placeholder="填表人：" />              </div>
            </div>
            <div style={{ height: `${s.theme.authorGridGap}px` }} />
            <div className="relative z-10 flex flex-col items-center" style={{ gap: `${s.rowGap}px`, width: '100%' }}>
              <div className="flex flex-col" style={{ width: `${naturalTableWidth}px`, gap: `${s.rowGap}px` }}>
                {s.rows.map((row) => (
                  <div key={row.id} className="flex relative group/row justify-center" style={{ gap: `${s.gridGap}px`, width: '100%' }}>
                    <div className="no-export absolute top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20" style={{ right: `calc(100% + ${Number(s.theme.containerPadding || 64) + 24}px)` }}>
                      <button onClick={() => s.toggleRowFillWidth(row.id)} className={`p-2 rounded-xl shadow-lg transition-all hover:scale-110 ${row.fillWidth ? 'bg-orange-500 text-white border-orange-400' : 'bg-[#2a2a2a] text-gray-300 border border-[#444] hover:bg-[#333]'}`} title="铺满该行"><StretchHorizontal className="w-4 h-4" /></button>
                      <button onClick={() => s.removeRow(row.id)} className="p-2 bg-[#2a2a2a] border border-[#444] text-red-400 rounded-xl shadow-lg hover:bg-red-900/50 hover:scale-110 transition-all" title="删行"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="no-export absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `calc(100% + ${Number(s.theme.containerPadding || 64) + 24}px)` }}>
                      <button onClick={() => s.addItemToRow(row.id)} className="bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-gray-300 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-105 whitespace-nowrap"><Plus className="w-4 h-4" /> 添加格子</button>
                    </div>
                    {row.items.map((item) => {
                      const cTS = item.titleSize || s.theme.baseTitleSize; 
                      const cSS = item.subtitleSize || s.theme.baseSubtitleSize;
                      return (
                        <div key={item.id} className="flex flex-col relative group/box transition-all duration-300" style={{ flex: row.fillWidth ? '1 1 0%' : 'none', width: row.fillWidth ? 'auto' : `${s.theme.boxBaseWidth}px` }}>
                          <div className="no-export absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/box:opacity-100 transition-opacity z-20 bg-[#1a1a1a]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#333] items-center text-[10px] shadow-2xl min-w-max transition-all">
                            <button onClick={() => s.updateItem(row.id, item.id, { showSubtitle: item.showSubtitle === false ? true : false })} className="text-gray-400 hover:text-white px-1">{item.showSubtitle === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            <button onClick={() => s.addExtraLine(row.id, item.id)} className="text-blue-400 hover:text-blue-300 font-bold px-1">+描述</button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) - 4 })} className="text-gray-400 hover:text-white"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) + 4 })} className="text-gray-400 hover:text-white"><ArrowDown className="w-4 h-4" /></button>
                            {row.items.length > 1 && <button onClick={() => s.removeItemFromRow(row.id, item.id)} className="text-red-500 ml-1 hover:bg-red-500/10 rounded p-0.5"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                          <div className={`grid-box-inner w-full relative transition-all duration-300 ${s.theme.isTransparentBg ? '' : 'shadow-lg'}`} style={{ height: `${fixedHeight}px`, border: (s.theme.showBoxBorder && Number(s.theme.borderWidth) > 0) ? `${s.theme.borderWidth}px solid ${s.theme.borderColor}` : 'none', backgroundColor: (s.theme.isTransparentBg || !s.theme.showGridFill) ? 'transparent' : s.theme.boxBgColor }}>
                            <RichText className="w-full h-full p-4 bg-transparent outline-none resize-none relative z-10" style={{ fontFamily: 'var(--oc-font)', color: s.theme.showGridFill ? (isLightColor(s.theme.boxBgColor) ? '#111827' : '#f3f4f6') : s.theme.textColor }} value={item.content} onChange={(val: string) => s.updateItem(row.id, item.id, { content: val })} />
                          </div>
                          <div className="text-center flex flex-col items-center transition-all duration-300" style={{ marginTop: `${item.textOffsetY || 0}px` }}>
                            {s.theme.showGridTitle !== false && (
                              <div className="relative w-full group/label" style={{ marginTop: `${item.titleSpacing || s.theme.baseTitleSpacing}px` }}>
                                <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={item.titleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { titleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                                   <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (Number(item.titleSize || s.theme.baseTitleSize) || 0) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                   <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (Number(item.titleSize || s.theme.baseTitleSize) || 0) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                                </div>
                                <RichText className="title-grid w-full text-center bg-transparent outline-none resize-none block p-0" style={{ fontFamily: 'var(--oc-font)', color: item.titleColor || s.theme.textColor, fontSize: `${cTS}px`, fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', WebkitTextStroke: s.theme.titleBold !== false && (s.theme.fontFamily.includes('Qiji') || s.theme.fontFamily.includes('Huiwen')) ? '0.8px currentColor' : '0', lineHeight: 1.1 }} value={item.title} onChange={(val: string) => s.updateItem(row.id, item.id, { title: val })} placeholder="格子标题" />
                              </div>
                            )}
                            {(s.theme.showGridSubtitle !== false && item.showSubtitle !== false) && (
                              <div className="relative w-full group/label" style={{ marginTop: `${item.subtitleSpacing || s.theme.baseSubtitleSpacing}px` }}>
                                <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={item.subtitleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { subtitleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (Number(item.subtitleSize || s.theme.baseSubtitleSize) || 0) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (Number(item.subtitleSize || s.theme.baseSubtitleSize) || 0) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                                </div>
                                <RichText className="w-full text-center bg-transparent outline-none resize-none block p-0" style={{ fontFamily: 'var(--oc-font)', color: item.subtitleColor || s.theme.textColor, fontSize: `${cSS}px`, fontWeight: 'normal', lineHeight: 1.2 }} value={item.subtitle} onChange={(val: string) => s.updateItem(row.id, item.id, { subtitle: val })} placeholder="格子小字" />
                              </div>
                            )}
                            {item.extraLines?.map((line, lineIndex) => {
                              if (line.hidden) return null;
                              return (
                                <div key={line.id} className="relative w-full group/label flex justify-center" style={{ marginTop: `${line.spacing || s.theme.baseExtraLineSpacing}px` }}>
                                  <div className="no-export absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                     <input type="color" value={line.color || s.theme.textColor} onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, { color: e.target.value })} className="w-3 h-3 p-0 border-0 bg-transparent cursor-pointer" />
                                     <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (Number(line.fontSize || s.theme.baseExtraLineSize) || 0) + 2 })} className="text-[10px] text-blue-500 font-bold">+</button>
                                     <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (Number(line.fontSize || s.theme.baseExtraLineSize) || 0) - 2 })} className="text-[10px] text-blue-500 font-bold">-</button>
                                     <button onClick={() => s.removeExtraLine(row.id, item.id, line.id)} className="text-red-500 ml-1 hover:scale-110 transition-transform"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                  <RichText className="w-full text-center bg-transparent outline-none resize-none block p-0" style={{ fontFamily: 'var(--oc-font)', color: line.color || s.theme.textColor, fontSize: `${line.fontSize || s.theme.baseExtraLineSize}px`, fontWeight: 'normal' }} value={line.text} onChange={(val: string) => s.updateExtraLine(row.id, item.id, line.id, { text: val })} placeholder={`描述行 ${lineIndex + 1}`} />
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
            <div className="watermark-text absolute bottom-3 right-6 font-bold select-none pointer-events-none opacity-40" style={{ fontFamily: 'var(--oc-font)', fontSize: s.theme.fontFamily.includes('Qiji') ? '13px' : '11px', color: isLightColor(s.theme.bgColor) ? '#000000' : '#ffffff' }}>
              使用万界记录者的表格制作工具制作
            </div>
          </div>
          <div className="no-export absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
            <button onClick={s.addRow} className="bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-gray-300 px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-105"><Plus className="w-4 h-4" /> 添加新行</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
