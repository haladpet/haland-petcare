declare module 'xlsx' {
  export interface WorkSheet {
    [key: string]: unknown
  }
  export interface WorkBook {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }
  export interface CellObject {
    v: unknown
    w?: string
    t?: string
    f?: string
    r?: string
    h?: string
    c?: unknown
    z?: string
  }
  export interface CellAddress {
    c: number
    r: number
  }
  export const utils: {
    sheet_to_json<T = unknown>(worksheet: WorkSheet, opts?: unknown): T[]
    json_to_sheet<T = unknown>(data: T[]): WorkSheet
    aoa_to_sheet(data: unknown[][]): WorkSheet
    book_new(): WorkBook
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name?: string): void
    book_set_sheet_name(workbook: WorkBook, name: string, index: number): void
    decode_range(range: string): { s: CellAddress; e: CellAddress }
    encode_range(s: CellAddress, e: CellAddress): string
    decode_cell(cell: string): CellAddress
    encode_cell(cell: CellAddress): string
  }
  export function writeFile(workbook: WorkBook, filename: string, opts?: unknown): void
  export function readFile(filename: string, opts?: unknown): WorkBook
  export function read(data: unknown, opts?: unknown): WorkBook
  export const version: string
}

declare module 'jspdf' {
  class jsPDF {
    constructor(options?: { orientation?: string; unit?: string; format?: string })
    setFontSize(size: number): void
    text(text: string, x: number, y: number, options?: unknown): void
    addPage(): void
    save(filename: string): void
    setFont(fontName: string): void
    getFontSize(): number
    internal: {
      pageSize: {
        width: number
        height: number
      }
    }
  }
  export default jsPDF
}