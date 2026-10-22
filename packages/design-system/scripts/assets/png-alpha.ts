import { crc32, deflateSync, inflateSync } from 'node:zlib';

// 이미지 칠 층의 불투명도를 이미지에 미리 넣는다. CSS 배경 층에는 층마다 불투명도를 줄 수 없기 때문이다.
// 피그마가 내보낸 PNG(RGBA 8비트, 비월 없음)만 다룬다. 그 밖의 형식은 실패해 이 코드를 넓히게 한다.

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BYTES_PER_PIXEL = 4;
// 색 정보에 영향을 주는 보조 청크는 그대로 옮긴다.
const keptChunks = new Set(['iCCP', 'sRGB', 'gAMA', 'cHRM']);

type Chunk = { type: string; data: Buffer };

/**
 * PNG의 알파를 배율만큼 줄인 PNG를 만든다(불투명도 층을 이미지에 넣는다).
 * @codocs [[피그마 일치 검사:자산]]
 * @param png 원본 PNG(RGBA 8비트, 비월 없음)
 * @param factor 알파 배율(0~1)
 * @param name 오류 메시지에 쓸 이름
 * @returns 새 PNG
 */
export function scalePngAlpha(png: Buffer, factor: number, name: string): Buffer {
  const chunks = readChunks(png, name);
  const header = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  if (header === undefined) {
    throw new Error(`[assets] ${name}: IHDR가 없다.`);
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [depth, colorType, , , interlace] = [
    header[8],
    header[9],
    header[10],
    header[11],
    header[12],
  ];
  if (depth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`[assets] ${name}: RGBA 8비트 비월 없는 PNG만 불투명도를 넣을 수 있다.`);
  }
  const compressed = Buffer.concat(
    chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data),
  );
  const pixels = unfilter(inflateSync(compressed), width, height);
  for (let index = 3; index < pixels.length; index += BYTES_PER_PIXEL) {
    pixels[index] = Math.round((pixels[index] ?? 0) * factor);
  }
  const stride = width * BYTES_PER_PIXEL;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }
  const kept = chunks.filter((chunk) => keptChunks.has(chunk.type));
  return Buffer.concat([
    signature,
    writeChunk({ type: 'IHDR', data: header }),
    ...kept.map(writeChunk),
    writeChunk({ type: 'IDAT', data: deflateSync(raw, { level: 9 }) }),
    writeChunk({ type: 'IEND', data: Buffer.alloc(0) }),
  ]);
}

/**
 * PNG 청크를 읽는다.
 * @param png PNG
 * @param name 오류 메시지에 쓸 이름
 * @returns 청크 목록
 */
function readChunks(png: Buffer, name: string): Chunk[] {
  if (!png.subarray(0, signature.length).equals(signature)) {
    throw new Error(`[assets] ${name}: PNG가 아니다.`);
  }
  const chunks: Chunk[] = [];
  for (let offset = signature.length; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, data: png.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
  }
  return chunks;
}

/**
 * 청크 하나를 쓴다.
 * @param chunk 청크
 * @returns 길이·종류·내용·CRC
 */
function writeChunk(chunk: Chunk): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(chunk.data.length, 0);
  head.write(chunk.type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), chunk.data])), 0);
  return Buffer.concat([head, chunk.data, tail]);
}

/**
 * 줄마다 필터를 풀어 RGBA 픽셀 배열을 만든다.
 * @param data 압축을 푼 IDAT
 * @param width 너비
 * @param height 높이
 * @returns 픽셀(줄마다 이어 붙임)
 */
function unfilter(data: Buffer, width: number, height: number): Buffer {
  const stride = width * BYTES_PER_PIXEL;
  const out = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = data[row * (stride + 1)];
    for (let column = 0; column < stride; column += 1) {
      const value = data[row * (stride + 1) + 1 + column] ?? 0;
      const left =
        column >= BYTES_PER_PIXEL ? (out[row * stride + column - BYTES_PER_PIXEL] ?? 0) : 0;
      const up = row > 0 ? (out[(row - 1) * stride + column] ?? 0) : 0;
      const upLeft =
        row > 0 && column >= BYTES_PER_PIXEL
          ? (out[(row - 1) * stride + column - BYTES_PER_PIXEL] ?? 0)
          : 0;
      out[row * stride + column] = (value + predictor(filter, left, up, upLeft)) & 0xff;
    }
  }
  return out;
}

/**
 * PNG 필터 예측값을 구한다.
 * @param filter 필터 종류(0~4)
 * @param left 왼쪽 바이트
 * @param up 위 바이트
 * @param upLeft 왼쪽 위 바이트
 * @returns 예측값
 */
function predictor(filter: number | undefined, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4: {
      const estimate = left + up - upLeft;
      const toLeft = Math.abs(estimate - left);
      const toUp = Math.abs(estimate - up);
      const toUpLeft = Math.abs(estimate - upLeft);
      if (toLeft <= toUp && toLeft <= toUpLeft) {
        return left;
      }
      return toUp <= toUpLeft ? up : upLeft;
    }
    default:
      throw new Error(`[assets] 알 수 없는 PNG 필터 ${String(filter)}`);
  }
}
