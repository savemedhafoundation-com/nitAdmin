import ReactQuill from 'react-quill-new'
import TableUp, {
  TableAlign,
  TableMenuContextmenu,
  TableResizeScale,
  TableSelection,
  blotName as tableUpBlotNames,
  defaultCustomSelect,
} from 'quill-table-up'

const { Quill } = ReactQuill
const quillFontWhitelist = [
  'Space Grotesk',
  'Fraunces',
  'Arial',
  'Calibri',
  'Segoe UI',
  'Cambria',
  'Georgia',
  'Garamond',
  'Helvetica',
  'Palatino Linotype',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Tahoma',
  'Arial Black',
  'Impact',
  'Courier New',
  'Lucida Console',
  'Comic Sans MS',
]

const tablePicker = { [TableUp.toolName]: [] }
const baseTableUpConfig = {
  customSelect: defaultCustomSelect,
  customBtn: true,
  fullSwitch: true,
  modules: [
    { module: TableSelection, options: { selectColor: 'rgba(5, 137, 243, 0.3)' } },
    { module: TableResizeScale, options: { blockSize: 12, offset: 6 } },
    { module: TableAlign },
    { module: TableMenuContextmenu, options: { tipText: true } },
  ],
}

if (Quill && typeof Quill.register === 'function') {
  if (!Quill.__NIT_FONT_STYLE_REGISTERED__) {
    const FontStyle = Quill.import('attributors/style/font')
    FontStyle.whitelist = quillFontWhitelist
    Quill.register(FontStyle, true)
    Quill.__NIT_FONT_STYLE_REGISTERED__ = true
  }

  if (!Quill.__NIT_TABLE_UP_REGISTERED__) {
    Quill.register({ [`modules/${TableUp.moduleName}`]: TableUp }, true)
    Quill.__NIT_TABLE_UP_REGISTERED__ = true
  }
}

export const quillModules = {
  toolbar: {
    container: [
      [{ font: [false, ...quillFontWhitelist] }, { size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [tablePicker],
      ['clean'],
    ],
  },
  table: false,
  keyboard: {
    bindings: TableUp.keyboradHandler,
  },
  [TableUp.moduleName]: baseTableUpConfig,
}

export const quillTableOnlyModules = {
  toolbar: {
    container: [[tablePicker], ['clean']],
  },
  table: false,
  keyboard: {
    bindings: TableUp.keyboradHandler,
  },
  [TableUp.moduleName]: baseTableUpConfig,
}

const commonFormats = [
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
]

export const quillFormats = [...commonFormats, ...Object.values(tableUpBlotNames)]
export const quillTableOnlyFormats = [...Object.values(tableUpBlotNames)]
