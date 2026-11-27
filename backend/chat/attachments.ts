import path from 'node:path';
import mammoth from 'mammoth';
import ExcelJS, { type CellValue } from 'exceljs-community';
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import { ApiError } from '../http';

export type ChatAttachment = {
  kind: 'image' | 'document';
  name: string;
  mimeType: string;
  preview?: string;
};

export type ProcessedChatAttachment = {
  attachment: ChatAttachment;
  extractedText?: string;
  modelPart?: { inlineData: { mimeType: string; data: string } };
};

// Giới hạn kích thước tệp, lượng văn bản trích xuất và phạm vi đọc của từng định dạng.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_TEXT = 160_000;
const MAX_RETRIEVED_TEXT = 28_000;
const MAX_PDF_PAGES = 60;
const MAX_SHEETS = 8;
const MAX_SHEET_ROWS = 800;
const MAX_SHEET_COLUMNS = 40;

const fileTypes: Record<string, { kind: ChatAttachment['kind']; mimeType: string }> = {
  '.png': { kind: 'image', mimeType: 'image/png' },
  '.jpg': { kind: 'image', mimeType: 'image/jpeg' },
  '.jpeg': { kind: 'image', mimeType: 'image/jpeg' },
  '.webp': { kind: 'image', mimeType: 'image/webp' },
  '.pdf': { kind: 'document', mimeType: 'application/pdf' },
  '.docx': { kind: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.xlsx': { kind: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

// Chỉ giữ tên tệp để hiển thị; loại bỏ đường dẫn và ký tự điều khiển do người dùng gửi lên.
function safeName(value: string) {
  const name = path.basename(value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
  return name || 'tep-dinh-kem';
}

function trimmedText(value: string) {
  const clean = value.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return '';
  return clean.length > MAX_DOCUMENT_TEXT
    ? `[Tài liệu vượt giới hạn trích xuất ${MAX_DOCUMENT_TEXT.toLocaleString('vi-VN')} ký tự; phần sau chưa được đọc.]\n\n${clean.slice(0, MAX_DOCUMENT_TEXT)}`
    : clean;
}

// Các từ quá chung không giúp xác định đoạn tài liệu liên quan đến câu hỏi.
const searchStopWords = new Set('va la cua cho trong voi nhung cac mot nay do kia gi nao hay giup toi ban doc phan tich giai thich noi dung tai lieu file sau day ve chi tiet tom tat tong hop toan bo bao cao ky'.split(' '));

function normalizedSearchText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('vi-VN');
}

function documentChunks(value: string, limit = 700) {
  const chunks: string[] = [];
  let current = '';
  for (const line of value.split(/\n+/).map(part => part.trim()).filter(Boolean)) {
    const pieces = line.length <= limit ? [line] : line.split(/(?<=[.!?;])\s+/u);
    for (const piece of pieces) {
      if (piece.length > limit) {
        if (current) chunks.push(current), current = '';
        let remaining = piece;
        while (remaining.length > limit) {
          const cut = remaining.lastIndexOf(' ', limit);
          const boundary = cut > limit * 0.6 ? cut : limit;
          chunks.push(remaining.slice(0, boundary));
          remaining = remaining.slice(boundary).trimStart();
        }
        current = remaining;
        continue;
      }
      if (current && current.length + piece.length + 1 > limit) chunks.push(current), current = '';
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Với tài liệu dài, chọn đoạn khớp từ khóa câu hỏi và đoạn kề bên trong giới hạn ngữ cảnh gửi AI.
export function selectRelevantDocumentText(value: string, question: string, maxChars = MAX_RETRIEVED_TEXT) {
  if (value.length <= maxChars) return value;
  const chunks = documentChunks(value);
  const terms = [...new Set(normalizedSearchText(question).split(/[^\p{L}\p{N}]+/u)
    .filter(term => term.length >= 2 && !searchStopWords.has(term)))];
  const normalizedChunks = chunks.map(normalizedSearchText);
  const weights = new Map(terms.map(term => [term, Math.log(1 + chunks.length / (1 + normalizedChunks.filter(chunk => chunk.includes(term)).length))]));
  const ranked = chunks.map((_, index) => {
    const matches = terms.reduce((score, term) => score + (normalizedChunks[index].includes(term) ? weights.get(term) || 0 : 0), 0);
    return { index, score: matches + (terms.length > 1 && normalizedChunks[index].includes(normalizedSearchText(question)) ? terms.length : 0) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = new Set<number>();

  // Nếu không có từ khớp, lấy mẫu rải đều; nếu có, giữ phần đầu và các đoạn liền kề kết quả tốt.
  if (!ranked.length) {
    const sampleCount = Math.max(1, Math.floor(maxChars / 1200));
    for (let index = 0; index < sampleCount; index++) selected.add(Math.round(index * (chunks.length - 1) / Math.max(1, sampleCount - 1)));
  } else {
    selected.add(0);
    for (const item of ranked) {
      selected.add(item.index);
      if (item.index > 0) selected.add(item.index - 1);
      if (item.index + 1 < chunks.length) selected.add(item.index + 1);
    }
  }
  const note = '[Tài liệu dài: các đoạn dưới đây được chọn theo câu hỏi; nội dung khác chưa được đưa vào ngữ cảnh. Hãy nêu trang hoặc dòng cần xem thêm nếu chưa đủ.]';
  const result: string[] = [note];
  let length = note.length;
  for (const index of [...selected].sort((a, b) => a - b)) {
    const chunk = chunks[index];
    if (!chunk || length + chunk.length + 2 > maxChars) continue;
    result.push(chunk);
    length += chunk.length + 2;
  }
  return result.join('\n\n');
}

// So chữ ký đầu tệp với phần mở rộng để chặn tệp giả dạng trước khi đưa vào bộ giải mã.
function assertSignature(extension: string, bytes: Buffer) {
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
  if (extension === '.pdf' && bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ApiError(415, 'Tệp không đúng định dạng PDF.');
  if (['.docx', '.xlsx'].includes(extension) && !isZip) throw new ApiError(415, 'Tệp Office không đúng định dạng hoặc bị hỏng.');
  if (extension === '.png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new ApiError(415, 'Ảnh PNG không hợp lệ.');
  if (['.jpg', '.jpeg'] .includes(extension) && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) throw new ApiError(415, 'Ảnh JPEG không hợp lệ.');
  if (extension === '.webp' && (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP')) throw new ApiError(415, 'Ảnh WebP không hợp lệ.');
}

// Đọc PDF theo trang, ghép ký tự theo tọa độ để giữ dòng và đánh dấu số trang khi trích dẫn.
async function parsePdf(bytes: Buffer) {
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: VerbosityLevel.ERRORS });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) throw new ApiError(413, `PDF vượt quá ${MAX_PDF_PAGES} trang.`);
    const pages: string[] = [];
    let pagesWithReadableText = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const positioned: Array<{ text: string; x: number; y: number }> = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str || !('transform' in item)) continue;
        positioned.push({ text: item.str, x: item.transform[4], y: item.transform[5] });
      }
      const lines = new Map<number, Array<{ text: string; x: number }>>();
      for (const item of positioned) {
        const y = Math.round(item.y / 2) * 2;
        const line = lines.get(y) || [];
        line.push(item);
        lines.set(y, line);
      }
      const line = [...lines.entries()].sort(([a], [b]) => b - a).map(([, items]) =>
        `[Trang ${pageNumber}] ${items.sort((a, b) => a.x - b.x).map(item => item.text).join(' ').replace(/\s+/g, ' ').trim()}`,
      ).filter(Boolean).join('\n');
      if (line.trim()) {
        pages.push(line);
        if (line.replace(/\[Trang \d+\]/g, '').trim().length >= 80) pagesWithReadableText++;
      }
      page.cleanup();
      if (pages.join('\n').length >= MAX_DOCUMENT_TEXT) break;
    }
    const text = trimmedText(pages.join('\n\n'));

    // PDF quét hoặc thiếu lớp chữ sẽ được gửi nguyên tệp để model đọc trực tiếp.
    const hasMostlyScannedPages = pagesWithReadableText < Math.ceil(pdf.numPages * 0.85);
    return { text, inspectDirectly: !text || hasMostlyScannedPages };
  } finally {
    await task.destroy();
  }
}

// DOCX được trích văn bản thô; đánh số đoạn để AI có thể chỉ ra vị trí trong câu trả lời.
async function parseWord(bytes: Buffer) {
  const result = await mammoth.extractRawText({ buffer: bytes });
  return trimmedText(result.value.split(/\n+/).map(paragraph => paragraph.trim()).filter(Boolean)
    .map((paragraph, index) => `[Đoạn ${index + 1}] ${paragraph}`).join('\n\n'));
}

// Chuyển các kiểu giá trị ô Excel (ngày, công thức, rich text, liên kết) thành văn bản.
function cellText(value: CellValue) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result != null) return cellText(value.result as CellValue);
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part: { text: string }) => part.text).join('');
    if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.text || value.hyperlink;
    return '';
  }
  return String(value);
}

// Duyệt từng trang tính, giới hạn số dòng/cột và gắn địa chỉ ô cho dữ liệu gửi vào model.
async function parseExcel(bytes: Buffer) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
  await workbook.xlsx.load(Buffer.from(arrayBuffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const output: string[] = [];
  let outputLength = 0;
  const append = (line: string) => {
    output.push(line);
    outputLength += line.length + 1;
    return outputLength >= MAX_DOCUMENT_TEXT;
  };
  const columnName = (column: number) => {
    let value = column;
    let name = '';
    while (value > 0) {
      value--;
      name = String.fromCharCode(65 + (value % 26)) + name;
      value = Math.floor(value / 26);
    }
    return name;
  };
  for (const sheet of workbook.worksheets.slice(0, MAX_SHEETS)) {
    append(`Trang tính: ${sheet.name} (tham chiếu ô theo cột và số dòng)`);
    const rowLimit = Math.min(sheet.rowCount, MAX_SHEET_ROWS);
    for (let rowNumber = 1; rowNumber <= rowLimit; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const values: string[] = [];
      const colLimit = Math.min(Math.max(row.cellCount, 1), MAX_SHEET_COLUMNS);
      for (let column = 1; column <= colLimit; column++) {
        const value = cellText(row.getCell(column).value).trim();
        if (value) values.push(`${columnName(column)}${rowNumber}=${value}`);
      }
      if (values.length && append(`[${sheet.name}!${rowNumber}] ${values.join(' | ')}`)) return trimmedText(output.join('\n'));
    }
    if (sheet.rowCount > rowLimit) append(`[${sheet.name}] Đã đọc ${rowLimit} dòng đầu trong tổng số ${sheet.rowCount} dòng.`);
    if (outputLength >= MAX_DOCUMENT_TEXT) return trimmedText(output.join('\n'));
  }
  return trimmedText(output.join('\n'));
}

// Điểm vào chung: xác thực tệp, chuẩn hóa ảnh hoặc trích văn bản tài liệu cho luồng chat.
export async function processChatAttachment(file: Blob & { name?: string }) : Promise<ProcessedChatAttachment> {
  const name = safeName(file.name || 'tep-dinh-kem');
  const extension = path.extname(name).toLowerCase();
  const type = fileTypes[extension];
  if (!type) throw new ApiError(415, 'Hỗ trợ ảnh PNG/JPG/WEBP, tài liệu PDF/DOCX và bảng tính XLSX.');
  if (file.size > (type.kind === 'image' ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES)) {
    throw new ApiError(413, type.kind === 'image' ? 'Ảnh vượt 2 MiB.' : 'Tài liệu vượt 8 MiB.');
  }
  if (file.size === 0) throw new ApiError(400, 'Tệp đính kèm đang trống.');
  if (file.type && file.type !== type.mimeType && file.type !== 'application/octet-stream') throw new ApiError(415, 'Loại tệp không khớp với phần mở rộng.');
  const bytes = Buffer.from(await file.arrayBuffer());
  assertSignature(extension, bytes);

  // Ảnh được xoay/thu nhỏ để gửi AI; bản xem trước nhỏ hơn được trả về giao diện chat.
  if (type.kind === 'image') {
    let image: Buffer;
    try {
      const meta = await sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' }).metadata();
      if (`image/${meta.format}` !== type.mimeType) throw new ApiError(415, 'Nội dung ảnh không khớp định dạng.');
      image = await sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(422, 'Không đọc được ảnh hoặc ảnh quá nhiều điểm ảnh.');
    }
    const preview = await sharp(image).resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 62 }).toBuffer();
    return {
      attachment: { kind: 'image', name, mimeType: 'image/jpeg', preview: `data:image/jpeg;base64,${preview.toString('base64')}` },
      modelPart: { inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } },
    };
  }

  try {
    // PDF có chữ dùng văn bản trích xuất; PDF quét có thể kèm bản gốc để model đọc trực tiếp.
    if (extension === '.pdf') {
      const parsed = await parsePdf(bytes);
      return {
        attachment: { kind: 'document', name, mimeType: type.mimeType },
        ...(parsed.text ? { extractedText: parsed.text } : {}),
        ...(parsed.inspectDirectly ? { modelPart: { inlineData: { mimeType: 'application/pdf', data: bytes.toString('base64') } } } : {}),
      };
    }

    // DOCX/XLSX được chuyển thành văn bản trước khi đưa vào câu hỏi.
    const extractedText = extension === '.docx' ? await parseWord(bytes) : await parseExcel(bytes);
    if (!extractedText) throw new ApiError(422, 'Không trích xuất được văn bản từ tệp. Hãy kiểm tra tệp có dữ liệu và không bị khóa mật khẩu.');
    return { attachment: { kind: 'document', name, mimeType: type.mimeType }, extractedText };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (extension === '.pdf' && /password/i.test(String((error as Error)?.name || '') + ' ' + String((error as Error)?.message || ''))) {
      throw new ApiError(422, 'PDF đang được bảo vệ bằng mật khẩu. Hãy mở khóa rồi tải tệp lên lại.');
    }
    throw new ApiError(422, 'Không đọc được tài liệu. Tệp có thể bị hỏng, mã hóa hoặc không đúng định dạng.');
  }
}
