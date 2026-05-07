import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 9);

export interface TextLine {
  id: string;
  text: string;
  color?: string;
  fontSize?: number;
  hidden?: boolean;
}

export interface GridItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: number;
  subtitleSize?: number;
  textOffsetY?: number;
  flexGrow?: boolean;
  extraLines?: TextLine[];
  showSubtitle?: boolean;
}

export interface RowData {
  id: string;
  items: GridItem[];
  fillWidth?: boolean;
}

interface AppState {
  theme: {
    bgColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number;
    boxAspectRatio: string;
    boxBgColor: string;
    isTransparentBg: boolean;
    showGridFill: boolean;
    showBoxBorder: boolean;
    showGridTitle: boolean;
    showGridSubtitle: boolean;
    fontFamily: string;
    isDistressed: boolean;
    boxBaseWidth: number;
    baseTitleSize: number;
    baseSubtitleSize: number;
    baseExtraLineSize: number;
    titleSize: number;
    subtitleSize: number;
    textMarginTop: number;
    titleSubtitleGap: number;
    titleAuthorGap: number;
    authorGridGap: number;
    titleBold: boolean;
  };
  title: string;
  author: string;
  filler: string;
  gridGap: number;
  rowGap: number;
  containerWidth: number;
  rows: RowData[];
  setTheme: (theme: Partial<AppState['theme']>) => void;
  setTitle: (title: string) => void;
  setAuthor: (author: string) => void;
  setFiller: (filler: string) => void;
  setGridGap: (gap: number) => void;
  setRowGap: (gap: number) => void;
  setContainerWidth: (width: number) => void;
  addRow: () => void;
  removeRow: (rowId: string) => void;
  toggleRowFillWidth: (rowId: string) => void;
  addItemToRow: (rowId: string) => void;
  removeItemFromRow: (rowId: string, itemId: string) => void;
  updateItem: (rowId: string, itemId: string, data: Partial<GridItem>) => void;
  addExtraLine: (rowId: string, itemId: string) => void;
  addExtraLineToAll: () => void;
  removeExtraLine: (rowId: string, itemId: string, lineId: string) => void;
  removeExtraLineIndexFromAll: (index: number) => void;
  updateExtraLine: (rowId: string, itemId: string, lineId: string, data: Partial<TextLine>) => void;
  updateExtraLineSizeGlobal: (index: number, size: number) => void;
  updateExtraLineColorGlobal: (index: number, color: string) => void;
  toggleExtraLineVisibilityGlobal: (index: number) => void;
  updateGridTitleSizeGlobal: (size: number) => void;
  updateGridSubtitleSizeGlobal: (size: number) => void;
  updateGridTitleColorGlobal: (color: string) => void;
  updateGridSubtitleColorGlobal: (color: string) => void;
}

const createEmptyItem = (): GridItem => ({
  id: generateId(),
  title: '格子标题',
  subtitle: '格子小字',
  content: '',
  flexGrow: false,
  textOffsetY: 0,
  extraLines: [],
});

export const useStore = create<AppState>()((set) => ({
  theme: {
    bgColor: '#000000',
    textColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 2,
    boxAspectRatio: '3/4',
    boxBgColor: '#ffffff',
    isTransparentBg: false,
    showGridFill: true,
    showBoxBorder: true,
    showGridTitle: true,
    showGridSubtitle: true,
    fontFamily: '"Noto Serif SC", serif',
    isDistressed: false,
    boxBaseWidth: 240,
    baseTitleSize: 30,
    baseSubtitleSize: 18,
    baseExtraLineSize: 14,
    titleSize: 60,
    subtitleSize: 22,
    textMarginTop: 8,
    titleSubtitleGap: 4,
    titleAuthorGap: 24,
    authorGridGap: 48,
    titleBold: true,
  },
  title: '大标题',
  author: '制表人：',
  filler: '填表人：',
  gridGap: 48,
  rowGap: 48,
  containerWidth: 1000,
  rows: [
    {
      id: generateId(),
      items: [
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
      ],
      fillWidth: false,
    }
  ],
  setTheme: (themeUpdate) =>
    set((state) => ({ theme: { ...state.theme, ...themeUpdate } })),
  setTitle: (title) => set({ title }),
  setAuthor: (author) => set({ author }),
  setFiller: (filler) => set({ filler }),
  setGridGap: (gridGap) => set({ gridGap }),
  setRowGap: (rowGap) => set({ rowGap }),
  setContainerWidth: (containerWidth) => set({ containerWidth }),
  addRow: () =>
    set((state) => {
      const lastRow = state.rows[state.rows.length - 1];
      const itemCount = lastRow ? lastRow.items.length : 1;
      const newItems = Array.from({ length: itemCount }, () => createEmptyItem());
      return {
        rows: [...state.rows, { id: generateId(), items: newItems, fillWidth: lastRow?.fillWidth || false }],
      };
    }),
  removeRow: (rowId) =>
    set((state) => ({
      rows: state.rows.filter((r) => r.id !== rowId),
    })),
  toggleRowFillWidth: (rowId) =>
    set((state) => ({
      rows: state.rows.map((r) => r.id === rowId ? { ...r, fillWidth: !r.fillWidth } : r),
    })),
  addItemToRow: (rowId) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId ? { ...r, items: [...r.items, createEmptyItem()] } : r
      ),
    })),
  removeItemFromRow: (rowId, itemId) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId ? { ...r, items: r.items.filter((i) => i.id !== itemId) } : r
      ),
    })),
  updateItem: (rowId, itemId, data) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              items: r.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
            }
          : r
      ),
    })),
  addExtraLine: (rowId, itemId) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              items: r.items.map((i) =>
                i.id === itemId
                  ? { ...i, extraLines: [...(i.extraLines || []), { id: generateId(), text: '附加文字' }] }
                  : i
              ),
            }
          : r
      ),
    })),
  addExtraLineToAll: () =>
    set((state) => ({
      rows: state.rows.map((r) => ({
        ...r,
        items: r.items.map((i) => ({
          ...i,
          extraLines: [...(i.extraLines || []), { id: generateId(), text: '统一描述', fontSize: state.theme.baseExtraLineSize }],
        })),
      })),
    })),
  removeExtraLine: (rowId, itemId, lineId) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              items: r.items.map((i) =>
                i.id === itemId
                  ? { ...i, extraLines: (i.extraLines || []).filter(l => l.id !== lineId) }
                  : i
              ),
            }
          : r
      ),
    })),
  removeExtraLineIndexFromAll: (index) =>
    set((state) => ({
      rows: state.rows.map((r) => ({
        ...r,
        items: r.items.map((i) => ({
          ...i,
          extraLines: (i.extraLines || []).filter((_, idx) => idx !== index),
        })),
      })),
    })),
  updateExtraLine: (rowId, itemId, lineId, data) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              items: r.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      extraLines: (i.extraLines || []).map((l) =>
                        l.id === lineId ? { ...l, ...data } : l
                      ),
                    }
                  : i
              ),
            }
          : r
      ),
    })),
  updateExtraLineSizeGlobal: (index, size) =>
    set((state) => ({
      rows: state.rows.map((r) => ({
        ...r,
        items: r.items.map((i) => ({
          ...i,
          extraLines: (i.extraLines || []).map((l, idx) => idx === index ? { ...l, fontSize: size } : l),
        })),
      })),
    })),
  updateExtraLineColorGlobal: (index, color) =>
    set((state) => ({
      rows: state.rows.map((r) => ({
        ...r,
        items: r.items.map((i) => ({
          ...i,
          extraLines: (i.extraLines || []).map((l, idx) => idx === index ? { ...l, color: color } : l),
        })),
      })),
    })),
  toggleExtraLineVisibilityGlobal: (index) =>
    set((state) => ({
      rows: state.rows.map((r) => ({
        ...r,
        items: r.items.map((i) => ({
          ...i,
          extraLines: (i.extraLines || []).map((l, idx) => idx === index ? { ...l, hidden: !l.hidden } : l),
        })),
      })),
    })),
  updateGridTitleSizeGlobal: (size) =>
    set((state) => ({
      theme: { ...state.theme, baseTitleSize: size },
      rows: state.rows.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, titleSize: size }))
      }))
    })),
  updateGridSubtitleSizeGlobal: (size) =>
    set((state) => ({
      theme: { ...state.theme, baseSubtitleSize: size },
      rows: state.rows.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, subtitleSize: size }))
      }))
    })),
  updateGridTitleColorGlobal: (color) =>
    set((state) => ({
      rows: state.rows.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, titleColor: color }))
      }))
    })),
  updateGridSubtitleColorGlobal: (color) =>
    set((state) => ({
      rows: state.rows.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, subtitleColor: color }))
      }))
    })),
}));
