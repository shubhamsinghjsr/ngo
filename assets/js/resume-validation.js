'use strict';

// Preliminary browser validation only. A real upload service must repeat all
// validation server-side and scan files before authenticated staff access.
window.ResumeValidation = (() => {
  const types = {
    pdf: ['application/pdf'],
    doc: ['application/msword'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  const failure = message => ({ valid: false, message });

  function isWordPackage(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = offset => view.getUint16(offset, true);
    const u32 = offset => view.getUint32(offset, true);
    let end = -1;
    // Locate a complete ZIP end record; reject split/ZIP64 archives.
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
      if (u32(offset) === 0x06054b50 && offset + 22 + u16(offset + 20) === bytes.length) { end = offset; break; }
    }
    if (end < 0 || u16(end + 4) || u16(end + 6)) return false;
    const count = u16(end + 10);
    const directorySize = u32(end + 12);
    const directoryStart = u32(end + 16);
    if (!count || count > 1024 || count !== u16(end + 8) || directoryStart + directorySize !== end) return false;
    const names = new Set();
    let offset = directoryStart;
    let expandedSize = 0;
    for (let entry = 0; entry < count; entry++) {
      if (offset + 46 > end || u32(offset) !== 0x02014b50) return false;
      const flags = u16(offset + 8), method = u16(offset + 10);
      const compressed = u32(offset + 20), expanded = u32(offset + 24);
      const nameLength = u16(offset + 28), extraLength = u16(offset + 30), commentLength = u16(offset + 32);
      const localOffset = u32(offset + 42);
      const next = offset + 46 + nameLength + extraLength + commentLength;
      if (next > end || (flags & 1) || ![0, 8].includes(method)) return false;
      const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      if (!name || /^[\\/]|^[a-z]:/i.test(name) || name.split(/[\\/]/).includes('..') || names.has(name) || /vbaProject\.bin$/i.test(name)) return false;
      if (localOffset + 30 > directoryStart || u32(localOffset) !== 0x04034b50) return false;
      const localNameLength = u16(localOffset + 26), localExtraLength = u16(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      if (dataStart + compressed > directoryStart || u16(localOffset + 8) !== method) return false;
      const localName = new TextDecoder().decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength));
      if (localName !== name || (u16(localOffset + 6) & 1)) return false;
      expandedSize += expanded;
      if (expandedSize > 25 * 1024 * 1024 || (expanded && !compressed) || expanded > compressed * 200 + 1024) return false;
      names.add(name); offset = next;
    }
    return offset === end && ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'].every(name => names.has(name));
  }

  async function check(file, maximum = 5 * 1024 * 1024) {
    if (!file) return failure('Please select a resume.');
    if (!file.size) return failure('The selected file is empty. Please choose a valid resume.');
    if (file.size > maximum) return failure('Resume is too large. Maximum file size is 5 MB.');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!types[extension]) return failure('Only PDF, DOC and DOCX resumes are allowed.');
    if (file.type && file.type !== 'application/octet-stream' && !types[extension].includes(file.type.toLowerCase())) {
      return failure('The file type does not match its extension. Please select a valid document.');
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let valid = false;
      if (extension === 'pdf') {
        const header = new TextDecoder('ascii').decode(bytes.subarray(0, 8));
        const trailer = new TextDecoder('ascii').decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
        valid = /^%PDF-\d\.\d/.test(header) && /%%EOF\s*$/.test(trailer);
      } else if (extension === 'doc') {
        const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
        if (bytes.length >= 1024 && signature.every((value, index) => bytes[index] === value)) {
          const header = new DataView(bytes.buffer);
          const version = header.getUint16(26, true), shift = header.getUint16(30, true);
          valid = header.getUint16(28, true) === 0xfffe
            && ((version === 3 && shift === 9) || (version === 4 && shift === 12))
            && header.getUint16(32, true) === 6 && bytes.length % (2 ** shift) === 0
            && new TextDecoder('utf-16le').decode(bytes).includes('WordDocument');
        }
      } else {
        valid = bytes.length >= 22 && isWordPackage(bytes);
      }
      return valid ? { valid: true, message: 'Resume format and size checked. File remains in your browser; it has not been uploaded.' }
        : failure('This file does not look like a supported document, or its Word archive is unsafe. Choose a valid PDF, DOC or DOCX.');
    } catch {
      return failure('The resume could not be read. Please choose the file again.');
    }
  }
  return Object.freeze({ check });
})();
