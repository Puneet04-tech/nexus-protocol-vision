export class BackupCompression {
  /**
   * Compress JSON string to Uint8Array using gzip, falling back to standard UTF-8 if not supported.
   */
  public static async compress(data: string): Promise<Uint8Array> {
    if (typeof globalThis.CompressionStream !== 'undefined') {
      try {
        const stream = new Blob([data]).stream();
        const compressionStream = stream.pipeThrough(new globalThis.CompressionStream('gzip'));
        const response = new Response(compressionStream);
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
      } catch (err) {
        console.warn('CompressionStream pipe failed, falling back to UTF-8 encoding:', err);
      }
    }
    return new TextEncoder().encode(data);
  }

  /**
   * Decompress Uint8Array to string, checking if data is gzipped or fallback UTF-8.
   */
  public static async decompress(data: Uint8Array): Promise<string> {
    // Gzip magic bytes are 0x1f, 0x8b
    const isGzipped = data.length > 2 && data[0] === 0x1f && data[1] === 0x8b;

    if (isGzipped && typeof globalThis.DecompressionStream !== 'undefined') {
      try {
        const stream = new Blob([data]).stream();
        const decompressionStream = stream.pipeThrough(new globalThis.DecompressionStream('gzip'));
        const response = new Response(decompressionStream);
        const buffer = await response.arrayBuffer();
        return new TextDecoder().decode(buffer);
      } catch (err) {
        console.warn('DecompressionStream failed, falling back to raw decoding:', err);
      }
    }
    return new TextDecoder().decode(data);
  }
}
