import { create } from 'zustand';

const STORAGE_KEY = 'oc-form-creator:auto-save:v1';
const HISTORY_LIMIT = 80;

const generateId = () => Math.random().toString(36).substring(2, 9);

export interface TextLine {
  id: string;
  text: string;
  color?: string;
  fontSize?: number | '';
  hidden?: boolean;
  spacing?: number | '';
}

export interface GridItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: number | '';
  subtitleSize?: number | '';
  titleSpacing?: number | '';
  subtitleSpacing?: number | '';
  textOffsetY?: number | '';
  flexGrow?: boolean;
  extraLines?: TextLine[];
  showSubtitle?: boolean;
}

export interface RowData {
  id: string;
  items: GridItem[];
  fillWidth?: boolean;
}

export interface AppDocument {
  theme: {
    bgColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number | '';
    boxAspectRatio: string;
    boxBgColor: string;
    isTransparentBg: boolean;
    showGridFill: boolean;
    showBoxBorder: boolean;
    showGridTitle: boolean;
    showGridSubtitle: boolean;
    fontFamily: string;
    isDistressed: boolean;
    boxBaseWidth: number | '';
    baseTitleSize: number | '';
    baseSubtitleSize: number | '';
    baseExtraLineSize: number | '';
    baseTitleSpacing: number | '';
    baseSubtitleSpacing: number | '';
    baseExtraLineSpacing: number | '';
    titleSize: number | '';
    authorFillerSize: number | '';
    titleAuthorGap: number | '';
    authorGridGap: number | '';
    titleBold: boolean;
    containerPadding: number | '';
    showGlobalSubtitle: boolean;
    globalSubtitleSize: number | '';
  };
  title: string;
  globalSubtitle: string;
  author: string;
  filler: string;
  gridGap: number | '';
  rowGap: number | '';
  rows: RowData[];
}

export interface AppState extends AppDocument {
  past: AppDocument[];
  future: AppDocument[];
  setTheme: (theme: Partial<AppDocument['theme']>) => void;
  setTitle: (title: string) => void;
  setGlobalSubtitle: (t: string) => void;
  setAuthor: (author: string) => void;
  setFiller: (filler: string) => void;
  setGridGap: (gap: number | '') => void;
  setRowGap: (gap: number | '') => void;
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
  updateExtraLineSizeGlobal: (index: number, size: number | '') => void;
  updateExtraLineColorGlobal: (index: number, color: string) => void;
  updateExtraLineSpacingGlobal: (index: number, spacing: number | '') => void;
  toggleExtraLineVisibilityGlobal: (index: number) => void;
  updateGridTitleSizeGlobal: (size: number | '') => void;
  updateGridSubtitleSizeGlobal: (size: number | '') => void;
  updateGridTitleColorGlobal: (color: string) => void;
  updateGridSubtitleColorGlobal: (color: string) => void;
  updateGridTitleSpacingGlobal: (spacing: number | '') => void;
  updateGridSubtitleSpacingGlobal: (spacing: number | '') => void;
  undo: () => void;
  redo: () => void;
}

const createEmptyItem = (): GridItem => ({
  id: generateId(),
  title: '格子标题',
  subtitle: '格子小字',
  subtitleColor: '#bbbbbb',
  content: '',
  flexGrow: false,
  textOffsetY: 0,
  extraLines: [],
});

const defaultDocument: AppDocument = {
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
    baseTitleSpacing: 8,
    baseSubtitleSpacing: 4,
    baseExtraLineSpacing: 4,
    titleSize: 60,
    authorFillerSize: 22,
    titleAuthorGap: 24,
    authorGridGap: 48,
    titleBold: true,
    containerPadding: 64,
    showGlobalSubtitle: false,
    globalSubtitleSize: 22,
  },
  title: '大标题',
  globalSubtitle: '',
  author: '制表人：',
  filler: '填表人：',
  gridGap: 48,
  rowGap: 48,
  rows: [
    {
      id: generateId(),
      items: [createEmptyItem(), createEmptyItem(), createEmptyItem()],
      fillWidth: false,
    },
  ],
};

const cloneDocument = (document: AppDocument): AppDocument => JSON.parse(JSON.stringify(document));

const pickDocument = (state: AppDocument): AppDocument => ({
  theme: cloneDocument(state).theme,
  title: state.title,
  globalSubtitle: state.globalSubtitle,
  author: state.author,
  filler: state.filler,
  gridGap: state.gridGap,
  rowGap: state.rowGap,
  rows: cloneDocument(state).rows,
});

const sameDocument = (a: AppDocument, b: AppDocument) => JSON.stringify(a) === JSON.stringify(b);

const normalizeDocument = (document: Partial<AppDocument>): AppDocument => ({
  ...defaultDocument,
  ...document,
  theme: {
    ...defaultDocument.theme,
    ...(document.theme ?? {}),
  },
  rows: Array.isArray(document.rows) && document.rows.length > 0 ? document.rows : defaultDocument.rows,
});

const loadSavedDocument = () => {
  if (typeof window === 'undefined') return cloneDocument(defaultDocument);
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneDocument(defaultDocument);
    const parsed = JSON.parse(saved) as Partial<AppDocument> & { document?: Partial<AppDocument> };
    return normalizeDocument(parsed.document ?? parsed);
  } catch {
    return cloneDocument(defaultDocument);
  }
};

const withHistory = (state: AppState, patch: Partial<AppDocument>) => {
  const current = pickDocument(state);
  const next = normalizeDocument({ ...current, ...patch });
  if (sameDocument(current, next)) return patch;

  return {
    ...patch,
    past: [...state.past, current].slice(-HISTORY_LIMIT),
    future: [],
  };
};

const initialDocument = loadSavedDocument();

export const useStore = create<AppState>()((set) => ({
  ...initialDocument,
  past: [],
  future: [],
  setTheme: (themeUpdate) =>
    set((state) => withHistory(state, { theme: { ...state.theme, ...themeUpdate } })),
  setTitle: (title) => set((state) => withHistory(state, { title })),
  setGlobalSubtitle: (globalSubtitle) => set((state) => withHistory(state, { globalSubtitle })),
  setAuthor: (author) => set((state) => withHistory(state, { author })),
  setFiller: (filler) => set((state) => withHistory(state, { filler })),
  setGridGap: (gridGap) => set((state) => withHistory(state, { gridGap })),
  setRowGap: (rowGap) => set((state) => withHistory(state, { rowGap })),
  addRow: () =>
    set((state) => {
      const lastRow = state.rows[state.rows.length - 1];
      const itemCount = lastRow ? lastRow.items.length : 1;
      const newItems = Array.from({ length: itemCount }, () => createEmptyItem());
      return withHistory(state, {
        rows: [...state.rows, { id: generateId(), items: newItems, fillWidth: lastRow?.fillWidth || false }],
      });
    }),
  removeRow: (rowId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.filter((r) => r.id !== rowId),
      }),
    ),
  toggleRowFillWidth: (rowId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => (r.id === rowId ? { ...r, fillWidth: !r.fillWidth } : r)),
      }),
    ),
  addItemToRow: (rowId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => (r.id === rowId ? { ...r, items: [...r.items, createEmptyItem()] } : r)),
      }),
    ),
  removeItemFromRow: (rowId, itemId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) =>
          r.id === rowId ? { ...r, items: r.items.filter((i) => i.id !== itemId) } : r,
        ),
      }),
    ),
  updateItem: (rowId, itemId, data) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                items: r.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
              }
            : r,
        ),
      }),
    ),
  addExtraLine: (rowId, itemId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                items: r.items.map((i) =>
                  i.id === itemId
                    ? { ...i, extraLines: [...(i.extraLines || []), { id: generateId(), text: '附加文字' }] }
                    : i,
                ),
              }
            : r,
        ),
      }),
    ),
  addExtraLineToAll: () =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: [
              ...(i.extraLines || []),
              {
                id: generateId(),
                text: '统一描述',
                fontSize: state.theme.baseExtraLineSize,
                spacing: state.theme.baseExtraLineSpacing,
              },
            ],
          })),
        })),
      }),
    ),
  removeExtraLine: (rowId, itemId, lineId) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                items: r.items.map((i) =>
                  i.id === itemId ? { ...i, extraLines: (i.extraLines || []).filter((l) => l.id !== lineId) } : i,
                ),
              }
            : r,
        ),
      }),
    ),
  removeExtraLineIndexFromAll: (index) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: (i.extraLines || []).filter((_, idx) => idx !== index),
          })),
        })),
      }),
    ),
  updateExtraLine: (rowId, itemId, lineId, data) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                items: r.items.map((i) =>
                  i.id === itemId
                    ? {
                        ...i,
                        extraLines: (i.extraLines || []).map((l) => (l.id === lineId ? { ...l, ...data } : l)),
                      }
                    : i,
                ),
              }
            : r,
        ),
      }),
    ),
  updateExtraLineSizeGlobal: (index, size) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: (i.extraLines || []).map((l, idx) => (idx === index ? { ...l, fontSize: size } : l)),
          })),
        })),
      }),
    ),
  updateExtraLineColorGlobal: (index, color) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: (i.extraLines || []).map((l, idx) => (idx === index ? { ...l, color } : l)),
          })),
        })),
      }),
    ),
  updateExtraLineSpacingGlobal: (index, spacing) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: (i.extraLines || []).map((l, idx) => (idx === index ? { ...l, spacing } : l)),
          })),
        })),
      }),
    ),
  toggleExtraLineVisibilityGlobal: (index) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            extraLines: (i.extraLines || []).map((l, idx) => (idx === index ? { ...l, hidden: !l.hidden } : l)),
          })),
        })),
      }),
    ),
  updateGridTitleSizeGlobal: (size) =>
    set((state) =>
      withHistory(state, {
        theme: { ...state.theme, baseTitleSize: size },
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, titleSize: size })),
        })),
      }),
    ),
  updateGridSubtitleSizeGlobal: (size) =>
    set((state) =>
      withHistory(state, {
        theme: { ...state.theme, baseSubtitleSize: size },
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, subtitleSize: size })),
        })),
      }),
    ),
  updateGridTitleColorGlobal: (color) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, titleColor: color })),
        })),
      }),
    ),
  updateGridSubtitleColorGlobal: (color) =>
    set((state) =>
      withHistory(state, {
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, subtitleColor: color })),
        })),
      }),
    ),
  updateGridTitleSpacingGlobal: (spacing) =>
    set((state) =>
      withHistory(state, {
        theme: { ...state.theme, baseTitleSpacing: spacing },
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, titleSpacing: spacing })),
        })),
      }),
    ),
  updateGridSubtitleSpacingGlobal: (spacing) =>
    set((state) =>
      withHistory(state, {
        theme: { ...state.theme, baseSubtitleSpacing: spacing },
        rows: state.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => ({ ...i, subtitleSpacing: spacing })),
        })),
      }),
    ),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return {};
      const current = pickDocument(state);
      return {
        ...cloneDocument(previous),
        past: state.past.slice(0, -1),
        future: [current, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return {};
      const current = pickDocument(state);
      return {
        ...cloneDocument(next),
        past: [...state.past, current].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }),
}));

if (typeof window !== 'undefined') {
  let saveTimer: number | undefined;
  useStore.subscribe((state) => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const document = pickDocument(state);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, document }));
    }, 250);
  });
}
