/**
 * Type definitions for qz-tray
 * QZ Tray doesn't have official TypeScript definitions
 */

declare module 'qz-tray' {
  export interface WebsocketsAPI {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  export interface PrintersAPI {
    find(query?: string): Promise<string[]>;
    getDefault(): Promise<string>;
  }

  export interface SecurityAPI {
    setCertificatePromise(callback: (resolve: (cert: string) => void) => void): void;
    setSignaturePromise(
      callback: (toSign: string) => (resolve: (signature: string) => void) => void
    ): void;
  }

  export interface APII {
    getVersion(): Promise<string>;
  }

  export interface Config {
    printer?: string;
    [key: string]: any;
  }

  export interface ConfigsAPI {
    create(printer: string | Config): Config;
  }

  export const websockets: WebsocketsAPI;
  export const printers: PrintersAPI;
  export const security: SecurityAPI;
  export const api: APII;
  export const configs: ConfigsAPI;

  export function print(
    config: Config,
    data: Array<{ type: string; data: string | any }>
  ): Promise<void>;

  const qz: {
    websockets: WebsocketsAPI;
    printers: PrintersAPI;
    security: SecurityAPI;
    api: APII;
    configs: ConfigsAPI;
    print: typeof print;
  };

  export default qz;
}
