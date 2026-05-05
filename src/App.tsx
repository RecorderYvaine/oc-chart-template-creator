import React, { useRef, useEffect } from 'react';
import { useStore } from './store';
import { Download, Palette, Layers, Columns, RectangleHorizontal, Type, Sparkles, Scaling, ALargeSmall, Plus, Trash2, Maximize, Minus, TypeOutline, Eye, EyeOff } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function App() {
  const { 
    theme, setTheme, title, author, filler, setTitle, setAuthor, setFiller, 
    rows, addRow, removeRow, addItemToRow, removeItemFromRow, updateItem, 
    gridGap, setGridGap, rowGap, setRowGap, containerWidth, setContainerWidth,
    addExtraLine, removeExtraLine, updateExtraLine
  } = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--oc-bg', theme.bgColor);
    document.documentElement.style.setProperty('--oc-text', theme.textColor);
    document.documentElement.style.setProperty('--oc-border', theme.borderColor);
    document.documentElement.style.setProperty('--oc-border-width', `${theme.borderWidth}px`);
    document.documentElement.style.setProperty('--oc-box-bg', theme.boxBgColor);
    document.documentElement.style.setProperty('--oc-font', theme.fontFamily.split('|')[0]);
    document.documentElement.style.setProperty('--oc-font-weight', theme.fontFamily.includes('|900') ? '900' : 'bold');
  }, [theme]);

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    
    // Temporarily hide all 'no-export' elements directly via DOM to avoid html-to-image filter issues
    const noExportElements = document.querySelectorAll('.no-export');
    noExportElements.forEach(el => (el as HTMLElement).style.display = 'none');
    
    // Use requestAnimationFrame to ensure the DOM has updated before capturing
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: window.devicePixelRatio || 1, // dynamically use device pixel ratio, avoids huge 2x multiplier on 3000px wide screens
        backgroundColor: theme.bgColor,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'meme-template.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
      alert('导出图片失败，可能是图片分辨率过大（当前宽度过高），请尝试调小左侧的 Size(Width) 或关闭做旧特效重试。');
    } finally {
      // Restore visibility
      noExportElements.forEach(el => (el as HTMLElement).style.display = '');
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    
    const noExportElements = document.querySelectorAll('.no-export');
    noExportElements.forEach(el => (el as HTMLElement).style.display = 'none');
    
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: window.devicePixelRatio || 1,
        backgroundColor: theme.bgColor,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvasRef.current.offsetWidth > canvasRef.current.offsetHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvasRef.current.offsetWidth, canvasRef.current.offsetHeight]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight);
      pdf.save('meme-template.pdf');
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('导出PDF失败，可能是图片分辨率过大（当前宽度过高），请尝试调小左侧的 Size(Width) 或关闭做旧特效重试。');
    } finally {
      noExportElements.forEach(el => (el as HTMLElement).style.display = '');
    }
  };

  // Helper to auto-resize textarea height
  const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-gray-300 font-sans">
      {/* Sidebar / Tools */}
      <div className="w-80 border-r border-[#333] bg-[#222] p-6 flex flex-col gap-8 overflow-y-auto z-10 shadow-xl shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Layers className="w-6 h-6" /> Meme Grid Builder
          </h1>
          <p className="text-sm text-gray-400">Design your own interaction/drawing templates.</p>
        </div>

        {/* Theme Settings */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Style
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm">Background</label>
              <input type="color" value={theme.bgColor} onChange={(e) => setTheme({ bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm">Text & Lines</label>
              <input type="color" value={theme.textColor} onChange={(e) => setTheme({ textColor: e.target.value, borderColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm">Box Fill</label>
              <input type="color" value={theme.boxBgColor} onChange={(e) => setTheme({ boxBgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm">Line Thickness</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="10" value={theme.borderWidth} onChange={(e) => setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="w-20" />
                <input type="number" min="0" max="10" value={theme.borderWidth} onChange={(e) => setTheme({ borderWidth: parseInt(e.target.value) || 0 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <label className="text-sm flex items-center gap-1"><Type className="w-4 h-4"/> Font</label>
              <select 
                className="bg-[#333] text-white p-1 rounded outline-none border-none text-sm w-32"
                value={theme.fontFamily}
                onChange={(e) => setTheme({ fontFamily: e.target.value })}
              >
                <option value='"QijiCombo", serif'>齐伋体 (Qiji-Combo)</option>
                <option value='"Noto Serif SC", serif'>思源宋体</option>
                <option value='"Noto Serif SC", serif|900'>思源宋体 (特粗)</option>
                <option value='"Zhi Mang Xing", cursive'>志莽行书</option>
                <option value='"Noto Sans SC", sans-serif'>思源黑体</option>
              </select>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><TypeOutline className="w-4 h-4"/> 主标题大小</label>
              <div className="flex items-center gap-2">
                <input type="range" min="20" max="150" value={theme.titleSize} onChange={(e) => setTheme({ titleSize: parseInt(e.target.value) || 60 })} className="w-16" />
                <input type="number" min="20" max="150" value={theme.titleSize} onChange={(e) => setTheme({ titleSize: parseInt(e.target.value) || 60 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><TypeOutline className="w-4 h-4"/> 副标题大小</label>
              <div className="flex items-center gap-2">
                <input type="range" min="10" max="60" value={theme.subtitleSize} onChange={(e) => setTheme({ subtitleSize: parseInt(e.target.value) || 22 })} className="w-16" />
                <input type="number" min="10" max="60" value={theme.subtitleSize} onChange={(e) => setTheme({ subtitleSize: parseInt(e.target.value) || 22 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><TypeOutline className="w-4 h-4"/> 全局大字大小</label>
              <div className="flex items-center gap-2">
                <input type="range" min="10" max="100" value={theme.baseTitleSize} onChange={(e) => setTheme({ baseTitleSize: parseInt(e.target.value) || 10 })} className="w-16" />
                <input type="number" min="10" max="100" value={theme.baseTitleSize} onChange={(e) => setTheme({ baseTitleSize: parseInt(e.target.value) || 10 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><TypeOutline className="w-4 h-4"/> 全局小字大小</label>
              <div className="flex items-center gap-2">
                <input type="range" min="10" max="60" value={theme.baseSubtitleSize} onChange={(e) => setTheme({ baseSubtitleSize: parseInt(e.target.value) || 10 })} className="w-16" />
                <input type="number" min="10" max="60" value={theme.baseSubtitleSize} onChange={(e) => setTheme({ baseSubtitleSize: parseInt(e.target.value) || 10 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Scaling className="w-4 h-4"/> 文本与框间距</label>
              <div className="flex items-center gap-2">
                <input type="range" min="-50" max="100" value={theme.textMarginTop} onChange={(e) => setTheme({ textMarginTop: parseInt(e.target.value) || 0 })} className="w-16" />
                <input type="number" min="-50" max="100" value={theme.textMarginTop} onChange={(e) => setTheme({ textMarginTop: parseInt(e.target.value) || 0 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Scaling className="w-4 h-4"/> 大字小字间距</label>
              <div className="flex items-center gap-2">
                <input type="range" min="-20" max="50" value={theme.titleSubtitleGap} onChange={(e) => setTheme({ titleSubtitleGap: parseInt(e.target.value) || 0 })} className="w-16" />
                <input type="number" min="-20" max="50" value={theme.titleSubtitleGap} onChange={(e) => setTheme({ titleSubtitleGap: parseInt(e.target.value) || 0 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Sparkles className="w-4 h-4"/> 标题做旧特效</label>
              <button 
                onClick={() => setTheme({ isDistressed: !theme.isDistressed })}
                className={`w-12 h-6 rounded-full transition-colors relative ${theme.isDistressed ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${theme.isDistressed ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Global Layout */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Columns className="w-4 h-4" /> Layout Controls
          </h2>
          <div className="space-y-4">
            
            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><RectangleHorizontal className="w-4 h-4"/> Box Ratio</label>
              <select 
                className="bg-[#333] text-white p-1 rounded outline-none border-none text-sm w-32"
                value={theme.boxAspectRatio}
                onChange={(e) => setTheme({ boxAspectRatio: e.target.value })}
              >
                <option value="1/1">Square (1:1)</option>
                <option value="3/4">Portrait (3:4)</option>
                <option value="4/3">Landscape (4:3)</option>
                <option value="9/16">Tall (9:16)</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Scaling className="w-4 h-4"/> Box Base Width</label>
              <div className="flex items-center gap-2">
                <input type="range" min="100" max="600" value={theme.boxBaseWidth} onChange={(e) => setTheme({ boxBaseWidth: parseInt(e.target.value) || 100 })} className="w-16" />
                <input type="number" min="100" max="600" value={theme.boxBaseWidth} onChange={(e) => setTheme({ boxBaseWidth: parseInt(e.target.value) || 100 })} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Scaling className="w-4 h-4"/> Column Gap</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" value={gridGap} onChange={(e) => setGridGap(parseInt(e.target.value) || 0)} className="w-16" />
                <input type="number" min="0" max="100" value={gridGap} onChange={(e) => setGridGap(parseInt(e.target.value) || 0)} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><Scaling className="w-4 h-4"/> Row Gap</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="200" value={rowGap} onChange={(e) => setRowGap(parseInt(e.target.value) || 0)} className="w-16" />
                <input type="number" min="0" max="200" value={rowGap} onChange={(e) => setRowGap(parseInt(e.target.value) || 0)} className="w-12 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-sm flex items-center gap-1"><ALargeSmall className="w-4 h-4"/> Size (Width)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="600" max="3000" step="50" value={containerWidth} onChange={(e) => setContainerWidth(parseInt(e.target.value) || 600)} className="w-16" />
                <input type="number" min="600" max="3000" step="50" value={containerWidth} onChange={(e) => setContainerWidth(parseInt(e.target.value) || 600)} className="w-14 bg-[#333] text-white p-1 rounded outline-none border-none text-xs text-center" />
              </div>
            </div>

            <button 
              onClick={addRow}
              className="w-full flex items-center justify-center gap-2 bg-[#333] hover:bg-[#444] text-white py-2 rounded-md transition-colors mt-2"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="mt-auto">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Template
          </h2>
          <div className="flex gap-2">
            <button onClick={handleExportPNG} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-500 transition-colors">PNG</button>
            <button onClick={handleExportPDF} className="flex-1 bg-[#444] text-white py-2 rounded-md font-medium hover:bg-[#555] transition-colors">PDF</button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-neutral-800" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div 
          ref={canvasRef}
          className="p-12 shadow-2xl relative transition-all duration-300"
          style={{ 
            backgroundColor: 'var(--oc-bg)', 
            color: 'var(--oc-text)',
            fontFamily: 'var(--oc-font)',
            width: `${containerWidth}px`,
            maxWidth: 'none'
          }}
        >
          {theme.isDistressed && (
            <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true" focusable="false">
              <filter id="distressed-text">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="warpNoise" />
                <feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="1" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="fineNoise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 -1.2" in="fineNoise" result="holes" />
                <feComposite operator="in" in="displaced" in2="holes" result="final" />
              </filter>
            </svg>
          )}

          {/* Titles */}
          <div className="mb-12 flex flex-col gap-4">
            <textarea 
              className="w-full text-center bg-transparent outline-none placeholder-opacity-30 tracking-wide resize-none overflow-hidden" 
              style={{ 
                color: 'var(--oc-text)', 
                fontFamily: 'var(--oc-font)', 
                fontWeight: 'var(--oc-font-weight)',
                filter: theme.isDistressed ? 'url(#distressed-text)' : 'none',
                fontSize: `${theme.titleSize}px`,
                lineHeight: 1.1
              }}
              rows={1}
              value={title}
              onInput={handleAutoResize}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Template Title..."
            />
            <div className="flex justify-between items-center w-full pl-12 pr-32">
              <input 
                className="bg-transparent outline-none opacity-90 placeholder-opacity-30 tracking-wider text-left w-1/2" 
                style={{ 
                  color: 'var(--oc-text)', 
                  fontFamily: 'var(--oc-font)', 
                  fontWeight: 'var(--oc-font-weight)',
                  fontSize: `${theme.subtitleSize}px`
                }}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="制表人"
              />
              <input 
                className="bg-transparent outline-none opacity-90 placeholder-opacity-30 tracking-wider text-left w-1/3" 
                style={{ 
                  color: 'var(--oc-text)', 
                  fontFamily: 'var(--oc-font)', 
                  fontWeight: 'var(--oc-font-weight)',
                  fontSize: `${theme.subtitleSize}px`
                }}
                value={filler}
                onChange={(e) => setFiller(e.target.value)}
                placeholder="填表人"
              />
            </div>
          </div>

          {/* Rows */}
          <div 
            className="flex flex-col"
            style={{ gap: `${rowGap}px` }}
          >
            {rows.map((row) => (
              <div 
                key={row.id} 
                className="flex relative group/row justify-center"
                style={{ gap: `${gridGap}px` }}
              >
                {/* Row Controls (Hidden on Export) */}
                <div className="no-export absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex flex-col gap-1 z-20">
                  <button onClick={() => addItemToRow(row.id)} className="p-1.5 bg-blue-600 text-white rounded shadow-lg" title="Add Box to Row"><Plus className="w-4 h-4" /></button>
                  <button onClick={() => removeRow(row.id)} className="p-1.5 bg-red-600 text-white rounded shadow-lg" title="Delete Entire Row"><Trash2 className="w-4 h-4" /></button>
                </div>

                {row.items.map((item) => {
                  const currentTitleSize = item.titleSize || theme.baseTitleSize;
                  const currentSubtitleSize = item.subtitleSize || theme.baseSubtitleSize;

                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col relative group/box ${item.flexGrow ? 'flex-1' : ''}`}
                      style={{ width: item.flexGrow ? 'auto' : `${theme.boxBaseWidth}px` }}
                    >
                      
                      {/* Item Toolbar (Hidden on Export) */}
                      <div className="no-export absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover/box:opacity-100 transition-opacity z-20 bg-[#222] p-1.5 rounded shadow border border-[#444] items-center">
                        <button onClick={() => updateItem(row.id, item.id, { flexGrow: !item.flexGrow })} className="text-gray-300 hover:text-white" title="切换铺满">
                          <Maximize className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-[#444] mx-1"></div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 w-8">大字</span>
                            <input 
                              type="color" 
                              value={item.titleColor || theme.textColor} 
                              onChange={(e) => updateItem(row.id, item.id, { titleColor: e.target.value })} 
                              className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                              title="大字颜色"
                            />
                            <button onClick={() => updateItem(row.id, item.id, { titleSize: currentTitleSize - 2 })} className="text-gray-300 hover:text-white ml-1"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs text-gray-300 font-mono w-4 text-center">{currentTitleSize}</span>
                            <button onClick={() => updateItem(row.id, item.id, { titleSize: currentTitleSize + 2 })} className="text-gray-300 hover:text-white"><Plus className="w-3 h-3" /></button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 w-8">小字</span>
                            <button onClick={() => updateItem(row.id, item.id, { showSubtitle: item.showSubtitle === false ? true : false })} className="text-gray-300 hover:text-white" title="切换小字显示">
                              {item.showSubtitle === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {item.showSubtitle !== false && (
                              <>
                                <input 
                                  type="color" 
                                  value={item.subtitleColor || theme.textColor} 
                                  onChange={(e) => updateItem(row.id, item.id, { subtitleColor: e.target.value })} 
                                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 ml-1"
                                  title="小字颜色"
                                />
                                <button onClick={() => updateItem(row.id, item.id, { subtitleSize: currentSubtitleSize - 2 })} className="text-gray-300 hover:text-white ml-1"><Minus className="w-3 h-3" /></button>
                                <span className="text-xs text-gray-300 font-mono w-4 text-center">{currentSubtitleSize}</span>
                                <button onClick={() => updateItem(row.id, item.id, { subtitleSize: currentSubtitleSize + 2 })} className="text-gray-300 hover:text-white"><Plus className="w-3 h-3" /></button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="w-px h-6 bg-[#444] mx-1"></div>
                        <div className="flex flex-col items-center gap-1 justify-center">
                           <button onClick={() => updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) - 5 })} className="text-gray-300 hover:text-white" title="文字上移"><Minus className="w-3 h-3" /></button>
                           <button onClick={() => updateItem(row.id, item.id, { textOffsetY: (item.textOffsetY || 0) + 5 })} className="text-gray-300 hover:text-white" title="文字下移"><Plus className="w-3 h-3" /></button>
                        </div>

                        <div className="w-px h-6 bg-[#444] mx-1"></div>
                        <button onClick={() => addExtraLine(row.id, item.id)} className="text-gray-300 hover:text-white" title="添加附加文字">
                          <Type className="w-3.5 h-3.5" />
                        </button>

                        {row.items.length > 1 && (
                          <>
                            <div className="w-px h-6 bg-[#444] mx-1"></div>
                            <button onClick={() => removeItemFromRow(row.id, item.id)} className="text-red-500 hover:text-red-400 h-full px-1" title="删除格子">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* The Box */}
                      <div 
                        className="w-full relative mb-2"
                        style={{ 
                          aspectRatio: theme.boxAspectRatio,
                          border: theme.borderWidth > 0 ? 'var(--oc-border-width) solid var(--oc-border)' : 'none',
                          backgroundColor: 'var(--oc-box-bg)'
                        }}
                      >
                        <textarea 
                          className="w-full h-full p-4 bg-transparent outline-none resize-none text-gray-900"
                          style={{ fontFamily: 'var(--oc-font)' }}
                          value={item.content}
                          onChange={(e) => updateItem(row.id, item.id, { content: e.target.value })}
                          placeholder=" "
                        />
                      </div>

                      {/* The Text Below the Box */}
                      <div 
                        className="text-center flex flex-col items-center transition-all duration-100"
                        style={{ 
                          marginTop: `${(item.textOffsetY || 0) + theme.textMarginTop}px`,
                          gap: `${theme.titleSubtitleGap}px`
                        }}
                      >
                        <textarea 
                          className="w-full text-center bg-transparent outline-none resize-none overflow-hidden"
                          rows={1}
                          style={{ 
                            color: item.titleColor || 'var(--oc-text)', 
                            fontFamily: 'var(--oc-font)', 
                            fontWeight: 'var(--oc-font-weight)',
                            fontSize: `${currentTitleSize}px`,
                            lineHeight: 1.1
                          }}
                          value={item.title}
                          onInput={handleAutoResize}
                          onChange={(e) => updateItem(row.id, item.id, { title: e.target.value })}
                          placeholder="格子标题"
                        />
                        {item.showSubtitle !== false && (
                          <textarea 
                            className="w-full text-center bg-transparent outline-none opacity-80 resize-none overflow-hidden"
                            rows={1}
                            style={{ 
                              color: item.subtitleColor || 'var(--oc-text)', 
                              fontFamily: 'var(--oc-font)',
                              fontSize: `${currentSubtitleSize}px`,
                              lineHeight: 1.2
                            }}
                            value={item.subtitle}
                            onInput={handleAutoResize}
                            onChange={(e) => updateItem(row.id, item.id, { subtitle: e.target.value })}
                            placeholder="格子小字"
                          />
                        )}

                        {item.extraLines && item.extraLines.map((line) => (
                          <div key={line.id} className="relative w-full group/line flex justify-center">
                            <textarea 
                              className="w-full text-center bg-transparent outline-none opacity-70 resize-none overflow-hidden"
                              rows={1}
                              style={{ 
                                color: item.subtitleColor || 'var(--oc-text)', 
                                fontFamily: 'var(--oc-font)',
                                fontSize: `${currentSubtitleSize * 0.8}px`, // slightly smaller than subtitle
                                lineHeight: 1.2
                              }}
                              value={line.text}
                              onInput={handleAutoResize}
                              onChange={(e) => updateExtraLine(row.id, item.id, line.id, e.target.value)}
                              placeholder="附加文字"
                            />
                            <button 
                              onClick={() => removeExtraLine(row.id, item.id, line.id)} 
                              className="no-export absolute -right-6 top-1/2 -translate-y-1/2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover/line:opacity-100 transition-opacity z-10"
                              title="删除此行"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
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
