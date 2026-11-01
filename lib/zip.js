const zlib = require('zlib');

// A small ZIP writer, enough for the brand kit download. Images are already compressed,
// so they are stored as-is; text is deflated.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Entries carry a fixed date so the archive is identical from build to build.
function dosDateTime(date) {
    const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
    const day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
    return { time, day };
}

/**
 * @param {{ name: string, data: Buffer }[]} files - paths inside the archive, with their contents
 * @param {Date} date - modification date for every entry
 */
function createZip(files, date) {
    const { time, day } = dosDateTime(date);
    const local = [];
    const central = [];
    let offset = 0;

    for (const { name, data } of files) {
        const nameBuffer = Buffer.from(name, 'utf8');
        const deflate = /\.(txt|svg|md)$/i.test(name);
        const body = deflate ? zlib.deflateRawSync(data, { level: 9 }) : data;
        const crc = crc32(data);

        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034B50, 0);
        header.writeUInt16LE(20, 4);              // version needed
        header.writeUInt16LE(0x0800, 6);          // UTF-8 names
        header.writeUInt16LE(deflate ? 8 : 0, 8); // method
        header.writeUInt16LE(time, 10);
        header.writeUInt16LE(day, 12);
        header.writeUInt32LE(crc, 14);
        header.writeUInt32LE(body.length, 18);
        header.writeUInt32LE(data.length, 22);
        header.writeUInt16LE(nameBuffer.length, 26);
        local.push(header, nameBuffer, body);

        const entry = Buffer.alloc(46);
        entry.writeUInt32LE(0x02014B50, 0);
        entry.writeUInt16LE(20, 4);               // version made by
        entry.writeUInt16LE(20, 6);
        entry.writeUInt16LE(0x0800, 8);
        entry.writeUInt16LE(deflate ? 8 : 0, 10);
        entry.writeUInt16LE(time, 12);
        entry.writeUInt16LE(day, 14);
        entry.writeUInt32LE(crc, 16);
        entry.writeUInt32LE(body.length, 20);
        entry.writeUInt32LE(data.length, 24);
        entry.writeUInt16LE(nameBuffer.length, 28);
        entry.writeUInt32LE(offset, 42);
        central.push(entry, nameBuffer);

        offset += header.length + nameBuffer.length + body.length;
    }

    const centralSize = central.reduce((sum, buffer) => sum + buffer.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054B50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...local, ...central, end]);
}

module.exports = { createZip };
