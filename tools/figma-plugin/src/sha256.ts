// 피그마 플러그인 샌드박스에는 crypto.subtle과 TextEncoder가 없어 SHA-256과 UTF-8 인코딩을 직접 구현한다.

const ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
] as const;

/**
 * 바이트 배열의 SHA-256 해시를 소문자 16진수 문자열로 계산한다.
 * @param bytes 해시할 바이트
 * @returns 64자리 16진수 해시
 */
export function sha256Hex(bytes: Uint8Array): string {
  const hash = Uint32Array.from(INITIAL_HASH);
  const words = new Uint32Array(64);
  const padded = padMessage(bytes);
  const view = new DataView(padded.buffer);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      words[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = word(words, i - 15);
      const w2 = word(words, i - 2);
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      words[i] = (word(words, i - 16) + s0 + word(words, i - 7) + s1) >>> 0;
    }
    compress(hash, words);
  }

  return Array.from(hash, (value) => value.toString(16).padStart(8, '0')).join('');
}

/**
 * 문자열을 UTF-8 바이트로 바꾼다.
 * @param text 바꿀 문자열
 * @returns UTF-8 바이트
 */
export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * 메시지 끝에 1비트와 0, 비트 길이를 붙여 64바이트 배수로 만든다.
 * @param bytes 원본 메시지
 * @returns 패딩한 메시지
 */
function padMessage(bytes: Uint8Array): Uint8Array {
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  return padded;
}

/**
 * 64개 메시지 단어로 해시 상태를 한 블록만큼 갱신한다.
 * @param hash 갱신할 해시 상태(8개 단어)
 * @param words 이 블록의 메시지 스케줄(64개 단어)
 */
function compress(hash: Uint32Array, words: Uint32Array): void {
  let a = word(hash, 0);
  let b = word(hash, 1);
  let c = word(hash, 2);
  let d = word(hash, 3);
  let e = word(hash, 4);
  let f = word(hash, 5);
  let g = word(hash, 6);
  let h = word(hash, 7);

  for (let i = 0; i < 64; i += 1) {
    const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const choice = (e & f) ^ (~e & g);
    const temp1 = (h + s1 + choice + (ROUND_CONSTANTS[i] ?? 0) + word(words, i)) >>> 0;
    const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (s0 + majority) >>> 0;
    h = g;
    g = f;
    f = e;
    e = (d + temp1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) >>> 0;
  }

  [a, b, c, d, e, f, g, h].forEach((value, index) => {
    hash[index] = (word(hash, index) + value) >>> 0;
  });
}

/**
 * 32비트 값을 오른쪽으로 회전한다.
 * @param value 회전할 값
 * @param bits 회전할 비트 수
 * @returns 회전한 값
 */
function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * 배열의 단어를 읽는다. 범위 밖이면 0이다.
 * @param words 단어 배열
 * @param index 읽을 위치
 * @returns 그 위치의 단어
 */
function word(words: Uint32Array, index: number): number {
  return words[index] ?? 0;
}
