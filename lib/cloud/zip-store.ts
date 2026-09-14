import { Writable } from "node:stream";

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32Update(data: Uint8Array, prev = 0) {
  let c = (prev ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value, 0);
  return buf;
}

function u32(value: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value >>> 0, 0);
  return buf;
}

function sig(bytes: number[]) {
  return Buffer.from(bytes);
}

function dosDate(date: Date) {
  const time = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
  const day = (((date.getFullYear() - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
  return { time, day };
}

type Central = {
  name: Buffer;
  crc: number;
  size: number;
  offset: number;
  time: number;
  day: number;
};

/**
 * ZIP STORE (no compression) writer. Streams one file at a time so the
 * restore route never buffers a whole project.
 */
export class ZipStoreWriter {
  private offset = 0;
  private readonly centrals: Central[] = [];

  constructor(private readonly out: Writable) {}

  async addFile(archivePath: string, chunks: AsyncIterable<Uint8Array>, date = new Date()) {
    const name = Buffer.from(archivePath, "utf8");
    const { time, day } = dosDate(date);
    const localOffset = this.offset;
    const local = Buffer.concat([
      sig([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0x0808),
      u16(0),
      u16(time),
      u16(day),
      u32(0),
      u32(0),
      u32(0),
      u16(name.length),
      u16(0),
      name,
    ]);
    await this.write(local);
    let crc = 0;
    let size = 0;
    for await (const chunk of chunks) {
      const bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk);
      crc = crc32Update(bytes, crc);
      size += bytes.byteLength;
      await this.write(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    }
    const descriptor = Buffer.concat([
      sig([0x50, 0x4b, 0x07, 0x08]),
      u32(crc),
      u32(size),
      u32(size),
    ]);
    await this.write(descriptor);
    this.centrals.push({ name, crc, size, offset: localOffset, time, day });
  }

  async finish() {
    const centralStart = this.offset;
    for (const entry of this.centrals) {
      await this.write(Buffer.concat([
        sig([0x50, 0x4b, 0x01, 0x02]),
        u16(20),
        u16(20),
        u16(0x0808),
        u16(0),
        u16(entry.time),
        u16(entry.day),
        u32(entry.crc),
        u32(entry.size),
        u32(entry.size),
        u16(entry.name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(entry.offset),
        entry.name,
      ]));
    }
    const centralSize = this.offset - centralStart;
    await this.write(Buffer.concat([
      sig([0x50, 0x4b, 0x05, 0x06]),
      u16(0),
      u16(0),
      u16(this.centrals.length),
      u16(this.centrals.length),
      u32(centralSize),
      u32(centralStart),
      u16(0),
    ]));
  }

  private write(buf: Buffer) {
    this.offset += buf.length;
    return new Promise<void>((resolve, reject) => {
      this.out.write(buf, (error) => (error ? reject(error) : resolve()));
    });
  }
}
