import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 9);

export interface TextLine {
  id: string;
  text: string;
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
  textOffsetY?: number; // Added to adjust text position individually
  flexGrow?: boolean;
  extraLines?: TextLine[];
  showSubtitle?: boolean;
}

export interface RowData {
  id: string;
  items: GridItem[];
}

interface AppState {
  theme: {
    bgColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number;
    boxAspectRatio: string;
    boxBgColor: string;
    fontFamily: string;
    isDistressed: boolean;
    boxBaseWidth: number;
    baseTitleSize: number;
    baseSubtitleSize: number;
    titleSize: number;
    subtitleSize: number;
    textMarginTop: number;
    titleSubtitleGap: number; // Added for gap between title and subtitle
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
  addItemToRow: (rowId: string) => void;
  removeItemFromRow: (rowId: string, itemId: string) => void;
  updateItem: (rowId: string, itemId: string, data: Partial<GridItem>) => void;
  addExtraLine: (rowId: string, itemId: string) => void;
  removeExtraLine: (rowId: string, itemId: string, lineId: string) => void;
  updateExtraLine: (rowId: string, itemId: string, lineId: string, text: string) => void;
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

export const useStore = create<AppState>((set) => ({
  theme: {
    bgColor: '#000000',
    textColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 2,
    boxAspectRatio: '3/4',
    boxBgColor: '#ffffff',
    fontFamily: '"QijiCombo", serif',
    isDistressed: false,
    boxBaseWidth: 240,
    baseTitleSize: 30,
    baseSubtitleSize: 18,
    titleSize: 60,
    subtitleSize: 22,
    textMarginTop: 8,
    titleSubtitleGap: 0,
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
      ]
    },
    {
      id: generateId(),
      items: [
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
        { id: generateId(), title: '格子标题', subtitle: '格子小字', content: '', flexGrow: false, textOffsetY: 0, extraLines: [] },
      ]
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
    set((state) => ({
      rows: [...state.rows, { id: generateId(), items: [createEmptyItem()] }],
    })),
  removeRow: (rowId) =>
    set((state) => ({
      rows: state.rows.filter((r) => r.id !== rowId),
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
  updateExtraLine: (rowId, itemId, lineId, text) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              items: r.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      extraLines: (i.extraLines || []).map(l => l.id === lineId ? { ...l, text } : l),
                    }
                  : i
              ),
            }
          : r
      ),
    })),
}));
