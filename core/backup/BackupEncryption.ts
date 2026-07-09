export class BackupEncryption {
  private static getCrypto(): Crypto {
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error('Web Crypto API is not supported in this environment.');
    }
    return cryptoObj;
  }

  public static bufToHex(buf: Uint8Array): string {
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public static hexToBuf(hex: string): Uint8Array {
    const cleanHex = hex.replace(/[^a-f0-9]/gi, '');
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const buf = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return buf;
  }

  public static bufToBase64(buf: Uint8Array): string {
    let binary = '';
    const len = buf.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary);
  }

  public static base64ToBuf(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buf[i] = binary.charCodeAt(i);
    }
    return buf;
  }

  /**
   * Derive AES-GCM 256-bit key using PBKDF2
   */
  private static async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt compressed payload bytes using password
   */
  public static async encrypt(
    payload: Uint8Array,
    password: string,
    iterations = 100000
  ): Promise<{ ciphertext: string; salt: string; iv: string }> {
    const crypto = this.getCrypto();
    
    // Generate secure random salt (16 bytes) and IV (12 bytes for AES-GCM)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const aesKey = await this.deriveKey(password, salt, iterations);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      payload
    );

    return {
      ciphertext: this.bufToBase64(new Uint8Array(encryptedBuffer)),
      salt: this.bufToHex(salt),
      iv: this.bufToHex(iv),
    };
  }

  /**
   * Decrypt ciphertext string using password and cryptographic params
   */
  public static async decrypt(
    ciphertext: string,
    password: string,
    saltHex: string,
    ivHex: string,
    iterations: number
  ): Promise<Uint8Array> {
    const crypto = this.getCrypto();
    const salt = this.hexToBuf(saltHex);
    const iv = this.hexToBuf(ivHex);
    const ciphertextBytes = this.base64ToBuf(ciphertext);

    const aesKey = await this.deriveKey(password, salt, iterations);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        aesKey,
        ciphertextBytes
      );

      return new Uint8Array(decryptedBuffer);
    } catch (err) {
      throw new Error('Decryption failed. Please check if the password is correct or if the backup is corrupted.');
    }
  }
}
