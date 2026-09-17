/** QR encoder for TOTP enrollment URIs. Byte mode, ECC M. Adapted from Project Nayuki (MIT). */

const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const ECC_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

function rsMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number) {
  const result = Array.from({ length: degree - 1 }, () => 0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 2);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]) {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= rsMultiply(coef, factor);
    });
  }
  return result;
}

function rawModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number) {
  return Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[version]! * ECC_BLOCKS[version]!;
}

function alignmentPositions(version: number, size: number) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function addEcc(data: number[], version: number) {
  const numBlocks = ECC_BLOCKS[version]!;
  const blockEccLen = ECC_PER_BLOCK[version]!;
  const rawCodewords = Math.floor(rawModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const blocks: number[][] = [];
  const rsDiv = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function maskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return (x * y) % 2 + (x * y) % 3 === 0;
    case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
    default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
  }
}

function penaltyScore(modules: boolean[][]) {
  const size = modules.length;
  let result = 0;
  const finderPenalty = (runHistory: number[]) => {
    const n = runHistory[1];
    const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
    return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
  };
  const addHistory = (run: number, history: number[]) => {
    if (history[0] === 0) run += size;
    history.pop();
    history.unshift(run);
  };
  for (let y = 0; y < size; y += 1) {
    let runColor = false;
    let runX = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x += 1) {
      if (modules[y][x] === runColor) {
        runX += 1;
        if (runX === 5) result += 3;
        else if (runX > 5) result += 1;
      } else {
        addHistory(runX, runHistory);
        if (!runColor) result += finderPenalty(runHistory) * 40;
        runColor = modules[y][x];
        runX = 1;
      }
    }
    addHistory(runX, runHistory);
    result += finderPenalty(runHistory) * 40;
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = false;
    let runY = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y += 1) {
      if (modules[y][x] === runColor) {
        runY += 1;
        if (runY === 5) result += 3;
        else if (runY > 5) result += 1;
      } else {
        addHistory(runY, runHistory);
        if (!runColor) result += finderPenalty(runHistory) * 40;
        runColor = modules[y][x];
        runY = 1;
      }
    }
    addHistory(runY, runHistory);
    result += finderPenalty(runHistory) * 40;
  }
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) result += 3;
    }
  }
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * 10;
  return result;
}

export function encodeQrModules(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));
  const countBits = (version: number) => (version <= 9 ? 8 : 16);
  const neededBits = (version: number) => 4 + countBits(version) + bytes.length * 8 + 4;
  let version = 1;
  while (version <= 10 && neededBits(version) > dataCodewords(version) * 8) version += 1;
  if (version > 10) throw new Error("Enrollment QR is too large.");

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  const align = alignmentPositions(version, size);
  for (let i = 0; i < align.length; i += 1) {
    for (let j = 0; j < align.length; j += 1) {
      if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
      const ax = align[i]!;
      const ay = align[j]!;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormat = (mask: number) => {
    const data = (0b00 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, Boolean((bits >> i) & 1));
    setFunction(8, 7, Boolean((bits >> 6) & 1));
    setFunction(8, 8, Boolean((bits >> 7) & 1));
    setFunction(7, 8, Boolean((bits >> 8) & 1));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, Boolean((bits >> i) & 1));
    for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, Boolean((bits >> i) & 1));
    for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, Boolean((bits >> i) & 1));
    setFunction(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = Boolean((bits >> i) & 1);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }

  const capacity = dataCodewords(version) * 8;
  const bb: number[] = [];
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) bb.push((val >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, countBits(version));
  for (const byte of bytes) append(byte, 8);
  append(0, Math.min(4, capacity - bb.length));
  while (bb.length % 8 !== 0) bb.push(0);
  const padBytes = [0xec, 0x11];
  let pad = 0;
  const data: number[] = [];
  for (let i = 0; i < bb.length; i += 8) data.push(Number.parseInt(bb.slice(i, i + 8).join(""), 2));
  while (data.length < dataCodewords(version)) data.push(padBytes[pad++ % 2]!);

  const codewords = addEcc(data, version);
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bit < codewords.length * 8) {
          modules[y][x] = Boolean((codewords[bit >>> 3]! >>> (7 - (bit & 7))) & 1);
          bit += 1;
        }
      }
    }
  }
  if (bit !== codewords.length * 8) {
    throw new Error(`QR bit placement mismatch: placed ${bit} of ${codewords.length * 8} (v${version})`);
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!isFunction[y][x] && maskBit(mask, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  let bestMask = 0;
  let minPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask);
    drawFormat(mask);
    const score = penaltyScore(modules);
    if (score < minPenalty) {
      bestMask = mask;
      minPenalty = score;
    }
    applyMask(mask);
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return modules.map((row) => row.map((cell) => (cell ? 1 : 0)));
}

export function otpAuthQrSvg(value: string) {
  const grid = encodeQrModules(value);
  const size = grid.length;
  const quiet = 4;
  const scale = 8;
  const dim = (size + quiet * 2) * scale;
  const rects: string[] = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) continue;
      rects.push(`<rect x="${(c + quiet) * scale}" y="${(r + quiet) * scale}" width="${scale}" height="${scale}" fill="#000000"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${rects.join("")}</svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`;
}

export function qrImageSrc(qrCode: string) {
  const value = qrCode.trim();
  if (!value) return "";
  if (value.startsWith("data:")) return value;
  if (value.includes("<svg")) return svgToDataUri(value);
  return value;
}
