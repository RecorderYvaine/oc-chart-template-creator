import React, { useRef, useEffect, useState } from 'react';
import { useStore } from './store';
import { Palette, Layers, Columns, Type, Plus, Trash2, Maximize, Eye, EyeOff, Loader2 } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import jsPDF from 'jspdf';

function App() {
  const s = useStore();
  const theme = s.theme;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    if (!theme) return;
    const r = document.documentElement;
    r.style.setProperty('--oc-bg', theme.bgColor);
    r.style.setProperty('--oc-text', theme.textColor);
    r.style.setProperty('--oc-border', theme.borderColor);
    r.style.setProperty('--oc-border-width', `${theme.borderWidth}px`);
    r.style.setProperty('--oc-box-bg', theme.boxBgColor);
    if (theme.fontFamily) {
      r.style.setProperty('--oc-font', theme.fontFamily.split('|')[0]);
      r.style.setProperty('--oc-font-weight', theme.fontFamily.includes('|900') ? '900' : 'bold');
    }
  }, [theme]);

  const handleExportPNG = async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true); setExportMessage('正在准备高清渲染...');
    try {
      await document.fonts.ready;
      const clone = canvasRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed'; clone.style.top = '-9999px';
      document.body.appendChild(clone);
      clone.querySelectorAll('.no-export').forEach(el => el.remove());
      clone.querySelectorAll('textarea, input').forEach((input) => {
        const i = input as HTMLTextAreaElement | HTMLInputElement;
        const div = document.createElement('div');
        div.innerText = i.value || '';
        const st = window.getComputedStyle(i);
        div.style.fontFamily = st.fontFamily; div.style.fontSize = st.fontSize;
        div.style.fontWeight = st.fontWeight; div.style.color = st.color;
        div.style.textAlign = st.textAlign; div.style.lineHeight = st.lineHeight;
        div.style.whiteSpace = 'pre-wrap'; div.style.wordBreak = 'break-word';
        div.style.width = '100%'; div.style.display = 'block';
        i.parentNode?.replaceChild(div, i);
      });
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await domToPng(clone, { scale: 3, backgroundColor: theme.bgColor, width: canvasRef.current.offsetWidth, height: canvasRef.current.offsetHeight });
      document.body.removeChild(clone);
      const link = document.createElement('a'); link.download = 'meme-template.png'; link.href = dataUrl; link.click();
    } catch (err: any) { alert(`失败: ${err.message}`); } finally { setIsExporting(false); setExportMessage(''); }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await domToPng(canvasRef.current, { scale: 2, backgroundColor: theme.bgColor });
      const pdf = new jsPDF({ orientation: canvasRef.current.offsetWidth > canvasRef.current.offsetHeight ? 'landscape' : 'portrait', unit: 'px', format: [canvasRef.current.offsetWidth, canvasRef.current.offsetHeight] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight);
      pdf.save('meme-template.pdf');
    } catch (err: any) { alert(`失败`); } finally { setIsExporting(false); }
  };

  const hAR = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.target as HTMLTextAreaElement;
    t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`;
  };

  // SKELETON_BODY
  if (!theme) return null;

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-gray-300 font-sans overflow-hidden text-[10px]">
      <div className="w-80 border-r border-[#333] bg-[#222] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-xl z-20">
        <h1 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-500" /> OC 制表工具</h1>
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3" /> 样式设置</h2>
            <div className="flex justify-between items-center bg-[#2a2a2a] p-2 rounded-lg"><span>背景颜色</span><input type="color" value={theme.bgColor} onChange={(e) => s.setTheme({ bgColor: e.target.value })} /></div>
            <div className="flex justify-between items-center bg-[#2a2a2a] p-2 rounded-lg"><span>文字颜色</span><input type="color" value={theme.textColor} onChange={(e) => s.setTheme({ textColor: e.target.value, borderColor: e.target.value })} /></div>
            <div className="flex justify-between items-center bg-[#2a2a2a] p-2 rounded-lg"><span>格子填充</span><input type="color" value={theme.boxBgColor} onChange={(e) => s.setTheme({ boxBgColor: e.target.value })} /></div>
            <div className="space-y-1"><span>线条粗细 {theme.borderWidth}px</span><input type="range" min="0" max="10" value={theme.borderWidth} onChange={(e) => s.setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
            <select className="w-full bg-[#2a2a2a] text-white p-2 rounded-lg outline-none border border-[#444]" value={theme.fontFamily} onChange={(e) => s.setTheme({ fontFamily: e.target.value })}>
              <option value='"QijiCombo", serif'>齐伋体 (Qiji-Combo)</option>
              <option value='"Noto Serif SC", serif'>思源宋体</option>
              <option value='"Zhi Mang Xing", cursive'>志莽行书</option>
              <option value='"Noto Sans SC", sans-serif'>思源黑体</option>
            </select>
          </section>
          <section className="grid grid-cols-2 gap-2">
            <div className="bg-[#2a2a2a] p-2 rounded-lg space-y-1"><span>主标题</span><input type="number" value={theme.titleSize} onChange={(e) => s.setTheme({ titleSize: parseInt(e.target.value) || 20 })} className="w-full bg-transparent text-white font-bold outline-none" /></div>
            <div className="bg-[#2a2a2a] p-2 rounded-lg space-y-1"><span>副标题</span><input type="number" value={theme.subtitleSize} onChange={(e) => s.setTheme({ subtitleSize: parseInt(e.target.value) || 10 })} className="w-full bg-transparent text-white font-bold outline-none" /></div>
            <div className="bg-[#2a2a2a] p-2 rounded-lg space-y-1"><span>格子大字</span><input type="number" value={theme.baseTitleSize} onChange={(e) => s.setTheme({ baseTitleSize: parseInt(e.target.value) || 10 })} className="w-full bg-transparent text-white font-bold outline-none" /></div>
            <div className="bg-[#2a2a2a] p-2 rounded-lg space-y-1"><span>格子小字</span><input type="number" value={theme.baseSubtitleSize} onChange={(e) => s.setTheme({ baseSubtitleSize: parseInt(e.target.value) || 10 })} className="w-full bg-transparent text-white font-bold outline-none" /></div>
          </section>
          <section className="space-y-4">
            <h2 className="font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Columns className="w-3 h-3" /> 布局控制</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#2a2a2a] p-2 rounded-lg"><span>比例</span><select className="bg-transparent text-white outline-none" value={theme.boxAspectRatio} onChange={(e) => s.setTheme({ boxAspectRatio: e.target.value })}><option value="1/1">1:1</option><option value="3/4">3:4</option><option value="4/3">4:3</option><option value="9/16">9:16</option></select></div>
              <div className="flex justify-between text-[10px] text-gray-400 px-1"><span>总宽</span><span>{s.containerWidth}px</span></div>
              <input type="range" min="600" max="3000" step="50" value={s.containerWidth} onChange={(e) => s.setContainerWidth(parseInt(e.target.value) || 600)} className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <button onClick={s.addRow} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl transition-all text-xs font-bold mt-2 shadow-lg shadow-blue-900/20">添加新行</button>
            </div>
          </section>
        </div>
        <div className="mt-auto pt-4 border-t border-[#333] space-y-3">
          <div className="flex gap-2">
            <button disabled={isExporting} onClick={handleExportPNG} className="flex-1 bg-white text-black py-2 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PNG'}
            </button>
            <button disabled={isExporting} onClick={handleExportPDF} className="flex-1 bg-[#333] text-white py-2 rounded-xl font-bold hover:bg-[#444] transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-[#444]">PDF</button>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase"><span>做旧特效</span><button onClick={() => s.setTheme({ isDistressed: !theme.isDistressed })} className={`w-8 h-4 rounded-full transition-all relative ${theme.isDistressed ? 'bg-blue-600' : 'bg-gray-700'}`}><div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${theme.isDistressed ? 'translate-x-4' : ''}`}></div></button></div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-12 flex justify-center items-start bg-neutral-800 relative scroll-smooth" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        {exportMessage && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce"><Loader2 className="w-5 h-5 animate-spin" /><span className="font-bold text-sm">{exportMessage}</span></div>}
        <div ref={canvasRef} className="p-16 shadow-2xl relative transition-all duration-500 bg-black" style={{ backgroundColor: theme.bgColor, color: theme.textColor, fontFamily: 'var(--oc-font)', width: `${s.containerWidth}px`, maxWidth: 'none' }}>
          {theme.isDistressed && <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true"><filter id="distressed-text"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="warpNoise" /><feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="1" xChannelSelector="R" yChannelSelector="G" result="displaced" /><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="fineNoise" /><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 -1.2" in="fineNoise" result="holes" /><feComposite operator="in" in="displaced" in2="holes" result="final" /></filter></svg>}
          <div className="mb-16 flex flex-col items-center gap-6">
            <textarea className="w-full text-center bg-transparent outline-none placeholder-gray-800 tracking-wider resize-none overflow-hidden block" style={{ color: theme.textColor, fontFamily: 'var(--oc-font)', fontWeight: 'var(--oc-font-weight)', filter: theme.isDistressed ? 'url(#distressed-text)' : 'none', fontSize: `${theme.titleSize}px`, lineHeight: 1.1, textAlign: 'center' }} rows={1} value={s.title} onInput={hAR} onChange={(e) => s.setTitle(e.target.value)} placeholder="大标题" />
            <div className="flex justify-between items-center w-full px-12">
              <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/2 block" style={{ color: theme.textColor, opacity: 0.8, fontFamily: 'var(--oc-font)', fontSize: `${theme.subtitleSize}px`, textAlign: 'left' }} value={s.author} onChange={(e) => s.setAuthor(e.target.value)} placeholder="制表人" />
              <input className="bg-transparent outline-none placeholder-gray-800 text-left w-1/3 block" style={{ color: theme.textColor, opacity: 0.8, fontFamily: 'var(--oc-font)', fontSize: `${theme.subtitleSize}px`, textAlign: 'left' }} value={s.filler} onChange={(e) => s.setFiller(e.target.value)} placeholder="填表人" />
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: `${s.rowGap}px` }}>
            {s.rows.map((row) => (
              <div key={row.id} className="flex relative group/row justify-center" style={{ gap: `${s.gridGap}px` }}>
                <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex flex-col gap-2 z-20 bg-[#222] p-1 rounded-lg border border-[#333]"><button onClick={() => s.addItemToRow(row.id)} className="p-1.5 bg-blue-600 text-white rounded-md transition-colors shadow-lg" title="添加格子"><Plus className="w-4 h-4" /></button><button onClick={() => s.removeRow(row.id)} className="p-1.5 bg-red-600 text-white rounded-md transition-colors shadow-lg" title="删除行"><Trash2 className="w-4 h-4" /></button></div>
                {row.items.map((item) => {
                  const cTS = item.titleSize || theme.baseTitleSize; const cSS = item.subtitleSize || theme.baseSubtitleSize;
                  return (
                    <div key={item.id} className={`flex flex-col relative group/box transition-all duration-300 ${item.flexGrow ? 'flex-1' : ''}`} style={{ width: item.flexGrow ? 'auto' : `${theme.boxBaseWidth}px` }}>
                      <div className="no-export absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover/box:opacity-100 transition-opacity z-20 bg-[#1a1a1a]/95 backdrop-blur-md p-1.5 rounded-lg shadow-2xl border border-[#333] items-center text-[8px]">
                        <button onClick={() => s.updateItem(row.id, item.id, { flexGrow: !item.flexGrow })} className="p-1 rounded text-gray-400 hover:text-white" title="铺满"><Maximize className="w-3.5 h-3.5" /></button>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1"><span>大</span><input type="color" value={item.titleColor || theme.textColor} onChange={(e) => s.updateItem(row.id, item.id, { titleColor: e.target.value })} className="w-3 h-3 rounded-sm" /><button onClick={() => s.updateItem(row.id, item.id, { titleSize: cTS + 2 })}>+</button><button onClick={() => s.updateItem(row.id, item.id, { titleSize: cTS - 2 })}>-</button></div>
                          <div className="flex items-center gap-1"><span>小</span><button onClick={() => s.updateItem(row.id, item.id, { showSubtitle: !item.showSubtitle })}>{item.showSubtitle === false ? <EyeOff className="w-2 h-2" /> : <Eye className="w-2 h-2" />}</button></div>
                        </div>
                        <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) + 5 })} title="下移">↓</button>
                        <button onClick={() => s.updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) - 5 })} title="上移">↑</button>
                        <button onClick={() => s.addExtraLine(row.id, item.id)} title="加行"><Type className="w-3 h-3" /></button>
                        {row.items.length > 1 && <button onClick={() => s.removeItemFromRow(row.id, item.id)} className="text-red-500 hover:text-red-400 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                      <div className="w-full relative mb-4 shadow-lg transition-all duration-300" style={{ aspectRatio: theme.boxAspectRatio, border: theme.borderWidth > 0 ? `${theme.borderWidth}px solid ${theme.borderColor}` : 'none', backgroundColor: theme.boxBgColor }}>
                        <textarea className="w-full h-full p-2 bg-transparent outline-none resize-none text-gray-900 placeholder-gray-300" style={{ fontFamily: 'var(--oc-font)' }} value={item.content} onChange={(e) => s.updateItem(row.id, item.id, { content: e.target.value })} placeholder="绘图区" />
                      </div>
                      <div className="text-center flex flex-col items-center transition-all duration-300" style={{ marginTop: `${(item.textOffsetY || 0) + theme.textMarginTop}px`, gap: `${theme.titleSubtitleGap}px` }}>
                        <textarea className="w-full text-center bg-transparent outline-none resize-none overflow-hidden block" rows={1} style={{ color: item.titleColor || theme.textColor, fontFamily: 'var(--oc-font)', fontWeight: 'var(--oc-font-weight)', fontSize: `${cTS}px`, lineHeight: 1.1, textAlign: 'center' }} value={item.title} onInput={hAR} onChange={(e) => s.updateItem(row.id, item.id, { title: e.target.value })} placeholder="标题" />
                        {item.showSubtitle !== false && <textarea className="w-full text-center bg-transparent outline-none opacity-80 resize-none overflow-hidden block" rows={1} style={{ color: item.subtitleColor || theme.textColor, fontFamily: 'var(--oc-font)', fontSize: `${cSS}px`, lineHeight: 1.2, textAlign: 'center' }} value={item.subtitle} onInput={hAR} onChange={(e) => s.updateItem(row.id, item.id, { subtitle: e.target.value })} placeholder="小字" />}
                        {item.extraLines?.map((line) => (
                          <div key={line.id} className="relative w-full group/line flex justify-center">
                            <textarea className="w-full text-center bg-transparent outline-none opacity-70 resize-none overflow-hidden block" rows={1} style={{ color: theme.textColor, fontFamily: 'var(--oc-font)', fontSize: `${cSS * 0.8}px`, textAlign: 'center' }} value={line.text} onInput={hAR} onChange={(e) => s.updateExtraLine(row.id, item.id, line.id, e.target.value)} placeholder="附加" />
                            <button onClick={() => s.removeExtraLine(row.id, item.id, line.id)} className="no-export absolute -right-6 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover/line:opacity-100 transition-opacity"><Trash2 className="w-2.5 h-2.5" /></button>
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
    </div>
  );
}

export default App;
