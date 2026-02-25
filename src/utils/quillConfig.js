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

if (Quill && typeof Quill.register === 'function' && !Quill.__NIT_TABLE_UP_REGISTERED__) {
  Quill.register({ [`modules/${TableUp.moduleName}`]: TableUp }, true)
  Quill.__NIT_TABLE_UP_REGISTERED__ = true
}

export const quillModules = {
  toolbar: {
    container: [
      [{ size: ['small', false, 'large', 'huge'] }],
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
