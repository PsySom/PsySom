/**
 * IdeaFlow 3.0 Buffer Utilities
 * Handles robust encoding/decoding for Unicode strings and binary data.
 */

/**
 * Encodes a string to Base64 while safely handling UTF-8 characters (e.g., Russian, Emojis).
 * Prevents "InvalidCharacterError" on Unicode by using TextEncoder.
 */
export const safeBase64Encode = (str: string): string => {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Base64 Encoding Error:", e);
    return "";
  }
};

/**
 * Converts an ArrayBuffer to a Base64 string.
 * Optimized for binary payloads like audio PCM data.
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Downsamples audio from a source sample rate (e.g. 44.1k, 48k) to 16000Hz.
 * Gemini Live API requires 16kHz mono PCM.
 */
export const downsampleTo16k = (buffer: Float32Array, sampleRate: number): Int16Array => {
  if (sampleRate === 16000) {
    return convertFloat32ToInt16(buffer);
  }
  
  const compression = sampleRate / 16000;
  const length = Math.floor(buffer.length / compression);
  const result = new Int16Array(length);
  
  for (let i = 0; i < length; i++) {
    // Decimation with clipping protection
    const val = buffer[Math.floor(i * compression)];
    result[i] = Math.max(-1, Math.min(1, val)) * 0x7FFF;
  }
  
  return result;
};

/**
 * Converts Float32 audio samples to Int16 PCM.
 */
const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    const val = buffer[l];
    buf[l] = Math.max(-1, Math.min(1, val)) * 0x7FFF;
  }
  return buf;
};
