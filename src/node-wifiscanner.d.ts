declare module 'node-wifiscanner' {
  export interface wifiInfo {
    mac: string,
    ssid: string,
    channel: string,
    signal_level: number,
    security?: string
  }
  export function scan(callback: (error: Error|null, data: wifiInfo[]|null) => void): void;
}