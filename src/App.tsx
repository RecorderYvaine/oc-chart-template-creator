import React, { useRef, useEffect, useState } from 'react';
import { useStore } from './store';
import { Plus, Trash2, Eye, EyeOff, Palette, Columns, Layers, Loader2, ArrowUp, ArrowDown, StretchHorizontal, ChevronDown, Download, X, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { domToPng } from 'modern-screenshot';

// Helper to determine if a hex color is light
const isLightColor = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 155;
};

function App() {
  const s = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState('');
  const [isFontLoading, setIsFontLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Preload font immediately on mount in the background
  useEffect(() => {
    document.fonts.load('1em "QijiCombo"').then(() => {
      setIsFontLoading(false);
    }).catch(() => {
      setIsFontLoading(false);
    });
  }, []);

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
      r.style.setProperty('--oc-font-weight', s.theme.fontFamily.includes('Qiji') ? 'normal' : 'bold');
    }
  }, [s.theme]);

  const handleShowPreview = async () => {
    if (!canvasRef.current || isGenerating) return;
    setIsGenerating(true); setExportMessage('正在渲染高清预览图...');
    try {
      await document.fonts.ready;
      const original = canvasRef.current;
      const noExportEls = document.querySelectorAll('.no-export');
      noExportEls.forEach(el => (el as HTMLElement).style.display = 'none');
      await new Promise(r => setTimeout(r, 800));
      const dataUrl = await domToPng(original, { 
        scale: 3, 
        backgroundColor: s.theme.bgColor,
        width: original.offsetWidth,
        height: original.offsetHeight
      });
      noExportEls.forEach(el => (el as HTMLElement).style.display = '');
      setPreviewUrl(dataUrl);
    } catch (err: any) { alert(`预览生成失败: ${err.message}`); } finally { setIsGenerating(false); setExportMessage(''); }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `oc-chart-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
    setPreviewUrl(null);
  };

  const hAR = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.target as HTMLTextAreaElement;
    t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`;
  };

  if (!s.theme || !s.rows) return null;

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
        <div className="flex items-center gap-3"><Layers className="w-6 h-6 text-blue-500" /><h1 className="text-xl font-bold text-white tracking-tighter uppercase">OC 制表工具</h1></div>
        
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight flex items-center gap-2"><Palette className="w-4 h-4" /> 样式与字体</h2>
            <div className="space-y-3">
              <div className="flex flex-col gap-3 pt-1">
                <label className="text-[13px] font-bold text-gray-100 uppercase px-0.5">全局字体选择</label>
                <div className="relative group/select">
                  <select className="w-full bg-[#2a2a2a] text-white p-3 pr-12 rounded-xl outline-none border border-[#333] text-sm font-medium focus:border-blue-500 transition-colors appearance-none cursor-pointer" value={s.theme.fontFamily} onChange={(e) => s.setTheme({ fontFamily: e.target.value })}>
                    <option value='"QijiCombo", serif'>齐伋体 (Qiji-Combo)</option>
                    <option value='"Noto Serif SC", serif'>思源宋体</option>
                    <option value='"Noto Sans SC", sans-serif'>思源黑体</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/select:text-white transition-colors" />
                </div>
                {s.theme.fontFamily.includes('Qiji') && isFontLoading && (
                  <div className="text-[11px] text-gray-400 flex items-start gap-1.5 px-1 animate-pulse mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-blue-400" />
                    <span>该字体加载较慢，请耐心等待一段时间，加载完成后会自动显示。</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-200">背景颜色</span>
                <input type="color" value={s.theme.bgColor} onChange={(e) => s.setTheme({ bgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-200">文字颜色</span>
                <input type="color" value={s.theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value, borderColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-100">格子填充</span>
                <input type="color" value={s.theme.boxBgColor} onChange={(e) => s.setTheme({ boxBgColor: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0 cursor-pointer" />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-100">透明格子底</span>
                <input type="checkbox" checked={s.theme.boxBgTransparent === true} onChange={(e) => s.setTheme({ boxBgTransparent: e.target.checked })} className="w-4 h-4 cursor-pointer accent-blue-500" />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[13px] font-bold text-gray-100">标题加粗 (描边)</span>
                <input type="checkbox" checked={s.theme.titleBold !== false} onChange={(e) => s.setTheme({ titleBold: e.target.checked })} className="w-4 h-4 cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[13px] text-gray-100 font-bold uppercase"><span>线条粗细</span><span className="text-blue-400 text-xs">{s.theme.borderWidth}px</span></div>
                <input type="range" min="0" max="10" value={s.theme.borderWidth} onChange={(e) => s.setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight flex items-center gap-2">全局字号调节</h2>
            <div className="space-y-1">
              {[
                { label: '主标题', key: 'titleSize', max: 200 },
                { label: '副标题', key: 'subtitleSize', max: 100 },
                { label: '格子大', key: 'baseTitleSize', max: 100 },
                { label: '格子小', key: 'baseSubtitleSize', max: 60 }
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 py-1">
                  <span className="text-[13px] w-14 shrink-0 font-bold text-gray-200">{item.label}</span>
                  <input type="range" min="10" max={item.max} value={(s.theme as any)[item.key]} onChange={(e) => s.setTheme({ [item.key]: parseInt(e.target.value) || 10 })} className="flex-1 h-1 bg-[#333] accent-blue-500" />
                  <input type="number" value={(s.theme as any)[item.key]} onChange={(e) => s.setTheme({ [item.key]: parseInt(e.target.value) || 10 })} className="w-14 bg-[#333] text-center font-bold text-[12px] rounded p-1 text-gray-100" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-[15px] font-bold text-white tracking-tight">描述行管理</h2>
              <button onClick={s.addExtraLineToAll} className="p-1 hover:bg-[#333] rounded text-blue-400" title="为所有格子增加描述行"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {extraLineIndices.map(idx => {
                const curVal = s.rows[0]?.items[0]?.extraLines?.[idx]?.fontSize || s.theme.baseExtraLineSize;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-blue-300">
                      <span>第 {idx + 1} 行字号</span>
                      <button onClick={() => s.removeExtraLineIndexFromAll(idx)} className="p-0.5 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min="10" max={100} value={curVal} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseInt(e.target.value) || 10)} className="flex-1 h-1 bg-[#333] accent-blue-400" />
                      <input type="number" value={curVal} onChange={(e) => s.updateExtraLineSizeGlobal(idx, parseInt(e.target.value) || 10)} className="w-14 bg-[#333] text-center font-bold text-[12px] rounded p-1 shrink-0 text-gray-100" />
                      <button onClick={() => s.removeExtraLineIndexFromAll(idx)} className="text-[11px] text-red-500/80 hover:text-red-500 font-bold px-1 py-0.5 uppercase shrink-0">删除</button>
                    </div>
                  </div>
                );
              })}
              {maxExtraLines === 0 && <p className="text-[11px] text-gray-500 text-center italic py-1">暂无描述行</p>}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-bold text-white uppercase tracking-tight flex items-center gap-2"><Columns className="w-4 h-4" /> 布局细节</h2>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1">
                 <span className="text-[13px] font-bold text-gray-200">比例</span>
                 <select className="bg-[#2a2a2a] text-white p-1 rounded-lg outline-none text-xs font-bold border border-[#333]" value={s.theme.boxAspectRatio} onChange={(e) => s.setTheme({ boxAspectRatio: e.target.value })}><option value="1/1">1:1</option><option value="3/4">3:4</option><option value="4/3">4:3</option><option value="9/16">9:16</option><option value="custom">自定义</option></select>
              </div>
              {[
                { label: '格子宽', key: 'boxBaseWidth', min: 50, max: 800 },
                { label: '列间距', key: 'gridGap', min: 0, max: 150, global: true },
                { label: '行间距', key: 'rowGap', min: 0, max: 300, global: true },
                { label: '标题-作者距', key: 'titleAuthorGap', min: 0, max: 200 },
                { label: '作者-表格距', key: 'authorGridGap', min: 0, max: 300 },
                { label: '文-框贴合(相对于框)', key: 'textMarginTop', min: -50, max: 150 },
                { label: '文字行间距', key: 'titleSubtitleGap', min: 0, max: 100 },
                { label: '画布总宽', key: 'containerWidth', min: 400, max: 3500, global: true }
              ].map(item => (
                <div key={item.key} className="space-y-0.5 py-1">
                  <div className="flex justify-between font-bold text-gray-100 text-[13px] uppercase"><span>{item.label}</span><span className="text-blue-400 text-xs">{item.global ? (s as any)[item.key] : (s.theme as any)[item.key]}px</span></div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={item.min} max={item.max} value={item.global ? (s as any)[item.key] : (s.theme as any)[item.key]} onChange={(e) => item.global ? (s as any)[`set${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`](parseInt(e.target.value) || 0) : s.setTheme({ [item.key]: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <input type="number" value={item.global ? (s as any)[item.key] : (s.theme as any)[item.key]} onChange={(e) => item.global ? (s as any)[`set${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`](parseInt(e.target.value) || 0) : s.setTheme({ [item.key]: parseInt(e.target.value) || 0 })} className="w-14 bg-[#333] text-center rounded p-1 text-[12px] font-bold text-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-4 border-t border-[#333]">
          <button disabled={isGenerating} onClick={handleShowPreview} className="w-full bg-white text-black py-3 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 shadow-lg hover:bg-gray-100 transition-all">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {isGenerating ? '正在渲染...' : '生成并预览图片'}</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-auto p-12 bg-neutral-800 relative scroll-smooth font-sans" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        {exportMessage && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] bg-blue-600 text-white px-8 py-3 rounded-full animate-bounce flex items-center gap-3 shadow-2xl font-bold"><span>{exportMessage}</span></div>}
        
        {/* Zoom Controls */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 bg-[#222] p-2 rounded-2xl shadow-2xl border border-[#444]">
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="放大"><ZoomIn className="w-5 h-5" /></button>
          <div className="text-center text-xs font-bold text-gray-400 py-1">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="缩小"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={() => setZoom(1)} className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-xl transition-all" title="重置大小"><RotateCcw className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center min-w-max mx-auto transition-transform duration-200 origin-top" style={{ transform: `scale(${zoom})` }}>
          <div ref={canvasRef} className="p-16 relative shadow-2xl transition-all duration-500" style={{ backgroundColor: s.theme.bgColor, color: s.theme.textColor, width: `${s.containerWidth}px`, maxWidth: 'none' }}>
            <div className="flex flex-col items-center text-center">
              <div className="relative w-full group/label">
                 <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                    <input type="color" value={s.theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value, borderColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                 </div>
                 <textarea className="w-full text-center bg-transparent outline-none placeholder-gray-800 tracking-wider resize-none overflow-hidden block p-0" style={{ fontFamily: 'var(--oc-font)', color: s.theme.textColor, fontSize: `${s.theme.titleSize}px`, fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', WebkitTextStroke: s.theme.titleBold !== false && s.theme.fontFamily.includes('Qiji') ? '1px currentColor' : '0', lineHeight: 1.1 }} rows={1} value={s.title} onInput={hAR} onChange={(e) => s.setTitle(e.target.value)} placeholder="大标题" />
              </div>
              <div style={{ height: `${s.theme.titleAuthorGap}px` }} />
              <div className="flex justify-between items-center w-full px-12 font-bold" style={{ fontFamily: 'var(--oc-font)', fontSize: `${s.theme.subtitleSize}px`, fontWeight: 'normal' }}>
                <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/3 block p-0" value={s.author} onChange={(e) => s.setAuthor(e.target.value)} placeholder="制表人：" />
                <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/2 block ml-16 p-0" value={s.filler} onChange={(e) => s.setFiller(e.target.value)} placeholder="填表人：" />
              </div>
            </div>
            <div style={{ height: `${s.theme.authorGridGap}px` }} />
            <div className="flex flex-col items-center" style={{ gap: `${s.rowGap}px`, width: '100%' }}>
              <div className="flex flex-col" style={{ width: `${naturalTableWidth}px`, gap: `${s.rowGap}px` }}>
                {s.rows.map((row) => (
                  <div key={row.id} className="flex relative group/row justify-center" style={{ gap: `${s.gridGap}px`, width: '100%' }}>
                    <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex flex-col gap-2 z-20">
                      <button onClick={() => s.addItemToRow(row.id)} className="p-1 bg-blue-600 text-white rounded-lg shadow-lg hover:scale-110" title="加格子"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => s.toggleRowFillWidth(row.id)} className={`p-1 rounded-lg shadow-lg transition-all hover:scale-110 ${row.fillWidth ? 'bg-orange-500 text-white border-orange-400' : 'bg-gray-600 text-gray-100'}`} title="铺满该行"><StretchHorizontal className="w-4 h-4" /></button>
                      <button onClick={() => s.removeRow(row.id)} className="p-1 bg-red-600 text-white rounded-lg shadow-lg hover:scale-110" title="删行"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {row.items.map((item) => {
                      const cTS = item.titleSize || s.theme.baseTitleSize; const cSS = item.subtitleSize || s.theme.baseSubtitleSize;
                      return (
                        <div key={item.id} className="flex flex-col relative group/box transition-all duration-300" style={{ flex: row.fillWidth ? '1 1 0%' : 'none', width: row.fillWidth ? 'auto' : `${s.theme.boxBaseWidth}px` }}>
                          <div className="no-export absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/box:opacity-100 transition-opacity z-20 bg-[#1a1a1a]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#333] items-center text-[10px] shadow-2xl min-w-max transition-all">
                            <button onClick={() => s.updateItem(row.id, item.id, { showSubtitle: !item.showSubtitle })} className="text-gray-400 hover:text-white px-1">{item.showSubtitle === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            <button onClick={() => s.addExtraLine(row.id, item.id)} className="text-blue-400 hover:text-blue-300 font-bold px-1">+描述</button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) - 4 })} className="text-gray-400 hover:text-white"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) + 4 })} className="text-gray-400 hover:text-white"><ArrowDown className="w-4 h-4" /></button>
                            {row.items.length > 1 && <button onClick={() => s.removeItemFromRow(row.id, item.id)} className="text-red-500 ml-1 hover:bg-red-500/10 rounded p-0.5"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                          <div className="w-full relative shadow-lg transition-all duration-300" style={{ height: `${fixedHeight}px`, border: s.theme.borderWidth > 0 ? `${s.theme.borderWidth}px solid ${s.theme.borderColor}` : 'none', backgroundColor: s.theme.boxBgTransparent ? 'transparent' : s.theme.boxBgColor }}><textarea className="w-full h-full p-4 bg-transparent outline-none resize-none" style={{ fontFamily: 'var(--oc-font)', color: '#111827' }} value={item.content} onChange={(e) => s.updateItem(row.id, item.id, { content: e.target.value })} /></div>
                          <div className="text-center flex flex-col items-center transition-all duration-300" style={{ marginTop: `${(item.textOffsetY || 0) + s.theme.textMarginTop}px`, gap: `${s.theme.titleSubtitleGap}px` }}>
                            <div className="relative w-full group/label">
                              <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                 <input type="color" value={item.titleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { titleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                                 <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (item.titleSize || s.theme.baseTitleSize) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                 <button onClick={() => s.updateItem(row.id, item.id, { titleSize: (item.titleSize || s.theme.baseTitleSize) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                              </div>
                              <textarea className="w-full text-center bg-transparent outline-none resize-none overflow-hidden block p-0" rows={1} style={{ fontFamily: 'var(--oc-font)', color: item.titleColor || s.theme.textColor, fontSize: `${cTS}px`, fontWeight: s.theme.titleBold !== false ? 'var(--oc-font-weight)' : 'normal', WebkitTextStroke: s.theme.titleBold !== false && s.theme.fontFamily.includes('Qiji') ? '0.5px currentColor' : '0', lineHeight: 1.1 }} value={item.title} onInput={hAR} onChange={(e) => s.updateItem(row.id, item.id, { title: e.target.value })} placeholder="格子标题" />
                            </div>
                            {item.showSubtitle !== false && (
                              <div className="relative w-full group/label">
                                <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={item.subtitleColor || s.theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { subtitleColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (item.subtitleSize || s.theme.baseSubtitleSize) + 2 })} className="text-blue-500 font-bold px-1 text-xs">+</button>
                                   <button onClick={() => s.updateItem(row.id, item.id, { subtitleSize: (item.subtitleSize || s.theme.baseSubtitleSize) - 2 })} className="text-blue-500 font-bold px-1 text-xs">-</button>
                                </div>
                                <textarea className="w-full text-center bg-transparent outline-none opacity-80 resize-none overflow-hidden block p-0" rows={1} style={{ fontFamily: 'var(--oc-font)', color: item.subtitleColor || s.theme.textColor, fontSize: `${cSS}px`, fontWeight: 'normal', lineHeight: 1.2 }} value={item.subtitle} onInput={hAR} onChange={(e) => s.updateItem(row.id, item.id, { subtitle: e.target.value })} placeholder="格子小字" />
                              </div>
                            )}
                            {item.extraLines?.map((line, lineIndex) => (
                              <div key={line.id} className="relative w-full group/label flex justify-center">
                                <div className="no-export absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 flex items-center gap-1 transition-opacity bg-[#222] p-1 rounded-lg z-30 shadow-lg border border-[#444]">
                                   <input type="color" value={line.color || s.theme.textColor} onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, { color: e.target.value })} className="w-3 h-3 p-0 border-0 bg-transparent cursor-pointer" />
                                   <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (line.fontSize || s.theme.baseExtraLineSize) + 2 })} className="text-[10px] text-blue-500 font-bold">+</button>
                                   <button onClick={() => s.updateExtraLine(row.id, item.id, line.id, { fontSize: (line.fontSize || s.theme.baseExtraLineSize) - 2 })} className="text-[10px] text-blue-500 font-bold">-</button>
                                   <button onClick={() => s.removeExtraLine(row.id, item.id, line.id)} className="text-red-500 ml-1 hover:scale-110 transition-transform"><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <textarea className="w-full text-center bg-transparent outline-none opacity-70 resize-none overflow-hidden block p-0" rows={1} style={{ fontFamily: 'var(--oc-font)', color: line.color || s.theme.textColor, fontSize: `${line.fontSize || s.theme.baseExtraLineSize}px`, fontWeight: 'normal' }} value={line.text} onInput={hAR} onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, { text: e.target.value })} placeholder={`描述行 ${lineIndex + 1}`} />
                              </div>
                            ))}
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
            <button onClick={s.addRow} className="group flex items-center gap-3 bg-[#222] hover:bg-blue-600 border border-[#444] hover:border-blue-500 text-gray-400 hover:text-white px-12 py-4 rounded-full transition-all shadow-2xl font-bold uppercase tracking-widest text-sm"><Plus className="w-5 h-5 transition-transform group-hover:rotate-90" /><span>添加新行</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
