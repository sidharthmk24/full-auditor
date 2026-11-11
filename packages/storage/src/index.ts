import * as fs from 'fs';
import * as path from 'path';

export interface StorageAdapter {
  uploadFile(key: string, content: Buffer | string, mimeType: string): Promise<string>;
  getFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string = './uploads') {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(key: string, content: Buffer | string, mimeType: string): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    await fs.promises.writeFile(fullPath, data);
    return `/uploads/${key}`;
  }

  async getFile(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key);
    return await fs.promises.readFile(fullPath);
  }

  async deleteFile(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

