declare module 'node-arp' {
  export function getMAC(ipaddress: string, cb: (err: Error|null, mac: string|null) => void): void;
}
