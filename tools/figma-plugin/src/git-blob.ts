import { utf8Encode } from './utf8';

// 파일 내용의 git blob SHA-1을 플러그인에서 계산한다. 피그마 샌드박스에는 crypto.subtle이 없어 직접 구현한다.
// 저장소 트리의 blob SHA와 같으면 그 파일은 바뀌지 않은 것이라 올리지 않는다.

const INITIAL_HASH = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0] as const;

/**
 * 파일 내용의 git blob SHA-1(`blob <길이>\0<내용>`의 SHA-1)을 계산한다. `git hash-object`와 같은 값이다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param content 파일 내용
 * @returns 40자리 소문자 16진수
 */
export function gitBlobSha(content: Uint8Array): string {
  const header = utf8Encode(`blob ${String(content.length)}\0`);
  const bytes = new Uint8Array(header.length + content.length);
  bytes.set(header);
  bytes.set(content, header.length);
  return sha1Hex(bytes);
}

/**
 * 바이트 배열의 SHA-1 해시를 소문자 16진수로 계산한다.
 * @param bytes 해시할 바이트
 * @returns 40자리 16진수 해시
 */
export function sha1Hex(bytes: Uint8Array): string {
  const hash = Uint32Array.from(INITIAL_HASH);
  const words = new Uint32Array(80);
  const padded = padMessage(bytes);
  const view = new DataView(padded.buffer);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      words[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 80; i += 1) {
      words[i] = rotl(
        word(words, i - 3) ^ word(words, i - 8) ^ word(words, i - 14) ^ word(words, i - 16),
        1,
      );
    }
    compress(hash, words);
  }
  return Array.from(hash, (value) => value.toString(16).padStart(8, '0')).join('');
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
 * 80개 메시지 단어로 해시 상태를 한 블록만큼 갱신한다.
 * @param hash 갱신할 해시 상태(5개 단어)
 * @param words 이 블록의 메시지 스케줄(80개 단어)
 */
function compress(hash: Uint32Array, words: Uint32Array): void {
  let a = word(hash, 0);
  let b = word(hash, 1);
  let c = word(hash, 2);
  let d = word(hash, 3);
  let e = word(hash, 4);
  for (let i = 0; i < 80; i += 1) {
    let f: number;
    let k: number;
    if (i < 20) {
      f = (b & c) | (~b & d);
      k = 0x5a827999;
    } else if (i < 40) {
      f = b ^ c ^ d;
      k = 0x6ed9eba1;
    } else if (i < 60) {
      f = (b & c) | (b & d) | (c & d);
      k = 0x8f1bbcdc;
    } else {
      f = b ^ c ^ d;
      k = 0xca62c1d6;
    }
    const temp = (rotl(a, 5) + f + e + k + word(words, i)) >>> 0;
    e = d;
    d = c;
    c = rotl(b, 30);
    b = a;
    a = temp;
  }
  [a, b, c, d, e].forEach((value, index) => {
    hash[index] = (word(hash, index) + value) >>> 0;
  });
}

/**
 * 32비트 값을 왼쪽으로 회전한다.
 * @param value 회전할 값
 * @param bits 회전할 비트 수
 * @returns 회전한 값
 */
function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
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
