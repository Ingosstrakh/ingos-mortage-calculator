const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// DOCX = ZIP архив. Читаем как ZIP вручную.
const dirs = fs.readdirSync('.');
const ibDir = dirs.find(d => d.includes('\u0418\u0411'));
const docxPath = path.join(ibDir, 'Znayu-chto-delat-v-PS-proekte.docx');
const buf = fs.readFileSync(docxPath);

console.log('DOCX size:', buf.length);

// ZIP local file header signature: PK\x03\x04
// Ищем все файлы в ZIP
const files = [];
let pos = 0;
while (pos < buf.length - 4) {
  if (buf[pos] === 0x50 && buf[pos+1] === 0x4B && buf[pos+2] === 0x03 && buf[pos+3] === 0x04) {
    const compression = buf.readUInt16LE(pos + 8);
    const compressedSize = buf.readUInt32LE(pos + 18);
    const uncompressedSize = buf.readUInt32LE(pos + 22);
    const fileNameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const fileName = buf.slice(pos + 30, pos + 30 + fileNameLen).toString('utf8');
    const dataStart = pos + 30 + fileNameLen + extraLen;
    
    files.push({ fileName, compression, compressedSize, uncompressedSize, dataStart });
    pos = dataStart + compressedSize;
  } else {
    pos++;
  }
}

console.log('Files in ZIP:', files.map(f => f.fileName));

// Ищем word/document.xml
const docFile = files.find(f => f.fileName === 'word/document.xml');
if (!docFile) {
  console.log('document.xml not found!');
  process.exit(1);
}

console.log('Found document.xml, compression:', docFile.compression, 'size:', docFile.compressedSize);

const compressedData = buf.slice(docFile.dataStart, docFile.dataStart + docFile.compressedSize);
let xmlContent;
if (docFile.compression === 8) {
  xmlContent = zlib.inflateRawSync(compressedData).toString('utf8');
} else {
  xmlContent = compressedData.toString('utf8');
}

// Извлекаем текст из XML — убираем теги
const text = xmlContent
  .replace(/<w:br[^>]*\/>/g, '\n')
  .replace(/<w:p[ >][^>]*>/g, '\n')
  .replace(/<\/w:p>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#x[0-9A-Fa-f]+;/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

fs.writeFileSync('docx_text.txt', text, 'utf8');
console.log('Text extracted, length:', text.length, 'chars');
console.log('\n=== PREVIEW (first 3000 chars) ===');
console.log(text.slice(0, 3000));
