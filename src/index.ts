import * as wifi from 'node-wifiscanner';
import * as  mdns from 'mdns-js';
import * as arp from 'node-arp';
import uniqWith = require('lodash.uniqwith');
import isEqual = require('lodash.isequal');

const deviceMapping: DeviceMacMapping[] = require('../deviceMapping.json')

export interface DeviceInfo {
  id: string,
  mac: string,
  ip?: string,
  host?: string,
  ssid?: string
}

export interface MacRange {
  start: string,
  end: string
}

export interface DeviceMacMapping {
  id: string,
  mac: MacRange[]
}

export class MoleHole {
  private static async getMacFromIp(ip: string): Promise<string|null> {
    return new Promise((resolve: (value: string|null) => void) => {
      arp.getMAC(ip, (err, mac) => {
        if (err || !mac) {
          return resolve(null);
        }

        return resolve(mac.toUpperCase());
      });
    });
  }

  private static getDeviceIdFromMac(mac: string) {
    for (let mapping of deviceMapping) {
      const macList = mapping.mac;
      for (let macRange of macList) {
        if (macRange.start <= mac && macRange.end >= mac) {
          return mapping.id;
        }
      }
    }

    return null;
  }

  static async getDevicesFromAP() {
    return new Promise((resolve: (value: DeviceInfo[]) => void) => {
      const deviceList: DeviceInfo[] = [];

      wifi.scan((err, data) => {
        if (!err && data) {
          for (let ap of data) {
            const mac = ap.mac;
            if (!mac) {
              continue;
            }

            const deviceId = MoleHole.getDeviceIdFromMac(mac);
            if (deviceId) {
              deviceList.push({
                id: deviceId,
                mac: mac,
                ssid: ap.ssid
              });
            }
          }
        }

        return resolve(uniqWith(deviceList, isEqual));
      });
    });
  }

  static async getDevicesFromLAN(timeout = 10) {
    // We look for all SSH enabled devices here
    const browser = mdns.createBrowser(mdns.tcp('ssh'));
    timeout = isNaN(timeout) ? 10 : timeout;
    timeout = Math.round(timeout);
    timeout = timeout <= 0 ? 10 : timeout;

    return new Promise((resolve: (value: DeviceInfo[]) => void) => {
      const deviceList: DeviceInfo[] = [];
      setTimeout(() => {
        browser.stop();
        return resolve(uniqWith(deviceList, isEqual));
      }, timeout * 1000);

      browser.on('ready', () => {
        browser.discover();
      });
  
      browser.on('update', async (data) => {
        const addresses = data.addresses;
        for (let address of addresses) {
          const mac = await MoleHole.getMacFromIp(address);
          if (!mac) {
            continue;
          }

          const deviceId = MoleHole.getDeviceIdFromMac(mac);
          if (deviceId) {
            deviceList.push({
              id: deviceId,
              host: data.host,
              mac: mac,
              ip: address
            });
          }
        }
      });
    });
  }

  static async getDevices(timeout = 10) {
    const devicesFromLan = await MoleHole.getDevicesFromLAN(timeout);
    const devicesFromAP = await MoleHole.getDevicesFromAP();
    const devices = uniqWith(([] as DeviceInfo[]).concat(devicesFromLan,devicesFromAP), isEqual);
    return devices;
  }
}
