// ============================================
// Voice of Gudalur — Peer-to-Peer Alert Relay
// Open-source mesh sync for zero-connectivity areas
// Uses: Web Bluetooth API + WiFi Direct (where available)
// ============================================

import { gudalurDB, OfflineSighting } from '../lib/db';

export interface PeerDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'wifi_direct' | 'unknown';
  lastSeen: number;
  rssi?: number;
}

export interface RelayMessage {
  type: 'sighting_alert' | 'sync_request' | 'sync_response' | 'ping';
  payload: any;
  senderId: string;
  senderName: string;
  timestamp: number;
  ttl: number;
  messageId: string;
}

export interface SyncPayload {
  sightings: OfflineSighting[];
  lastSyncTimestamp: number;
}

function getDeviceId(): string {
  let id = localStorage.getItem('vog_device_id');
  if (!id) {
    id = `vog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('vog_device_id', id);
  }
  return id;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isWiFiDirectSupported(): boolean {
  return typeof navigator !== 'undefined' && 'connection' in navigator;
}



// ═══ BLUETOOTH LOW ENERGY (BLE) SYNC ═══

export class BLEPeerSync {
  private device: any = null;
  private server: any = null;
  private isAdvertising: boolean = false;
  private messageHandlers: ((msg: RelayMessage) => void)[] = [];

  static SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
  static CHARACTERISTIC_UUID = '00002a29-0000-1000-8000-00805f9b34fb';

  async startAdvertising(deviceName: string = 'VOG_Peer'): Promise<boolean> {
    if (!isBluetoothSupported()) return false;
    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLEPeerSync.SERVICE_UUID],
      });
      this.server = await this.device.gatt?.connect();
      this.isAdvertising = true;
      console.log('[BLE] Peer sync advertising started');
      return true;
    } catch (err) {
      console.warn('[BLE] Failed to start advertising:', err);
      return false;
    }
  }

  async scanForPeers(): Promise<PeerDevice[]> {
    if (!isBluetoothSupported()) return [];
    const peers: PeerDevice[] = [];
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLEPeerSync.SERVICE_UUID],
      });
      if (device) {
        peers.push({ id: device.id, name: device.name || 'Unknown VOG Device', type: 'bluetooth', lastSeen: Date.now() });
      }
    } catch { /* scan cancelled */ }
    return peers;
  }

  async sendMessage(message: RelayMessage): Promise<boolean> {
    if (!this.server) return false;
    try {
      const service = await this.server.getPrimaryService(BLEPeerSync.SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLEPeerSync.CHARACTERISTIC_UUID);
      const data = JSON.stringify(message);
      const chunks = this.chunkData(new TextEncoder().encode(data), 500);
      for (const chunk of chunks) { await characteristic.writeValue(chunk); }
      return true;
    } catch { return false; }
  }

  onMessage(handler: (msg: RelayMessage) => void): void { this.messageHandlers.push(handler); }

  async stop(): Promise<void> {
    if (this.device?.gatt?.connected) { await this.device.gatt.disconnect(); }
    this.isAdvertising = false;
  }

  private chunkData(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += chunkSize) { chunks.push(data.slice(i, i + chunkSize)); }
    return chunks;
  }
}

// ═══ LOCAL NETWORK SYNC (WiFi Direct / LAN) ═══

export class LocalNetworkSync {
  private ws: WebSocket | null = null;
  private messageHandlers: ((msg: RelayMessage) => void)[] = [];

  async connectToLocalServer(wsUrl: string): Promise<boolean> {
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { console.log('[LocalNet] Connected'); this.sendPing(); };
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as RelayMessage;
        this.handleIncomingMessage(message);
      };
      return true;
    } catch { return false; }
  }

  async broadcast(message: Omit<RelayMessage, 'messageId' | 'timestamp'>): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const fullMessage: RelayMessage = { ...message, messageId: generateMessageId(), timestamp: Date.now() };
    try { this.ws.send(JSON.stringify(fullMessage)); return true; } catch { return false; }
  }

  private handleIncomingMessage(message: RelayMessage): void {
    if (message.ttl > 0) { message.ttl--; this.broadcast(message); }
    this.messageHandlers.forEach(handler => handler(message));
  }

  private sendPing(): void {
    this.broadcast({ type: 'ping', payload: { deviceId: getDeviceId() }, senderId: getDeviceId(), senderName: 'VOG_User', ttl: 3 });
  }

  onMessage(handler: (msg: RelayMessage) => void): void { this.messageHandlers.push(handler); }
  disconnect(): void { this.ws?.close(); this.ws = null; }
}

// ═══ SYNC MANAGER ═══

export class PeerSyncManager {
  private bleSync: BLEPeerSync;
  private localSync: LocalNetworkSync;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.bleSync = new BLEPeerSync();
    this.localSync = new LocalNetworkSync();
    this.setupMessageHandlers();
  }

  async initialize(): Promise<{ ble: boolean; local: boolean }> {
    const ble = isBluetoothSupported();
    const local = isWiFiDirectSupported();
    if (ble) await this.bleSync.startAdvertising();
    if (local) await this.localSync.connectToLocalServer('ws://192.168.49.1:8080');
    return { ble, local };
  }

  async broadcastAlert(sighting: OfflineSighting): Promise<void> {
    const message: Omit<RelayMessage, 'messageId' | 'timestamp'> = {
      type: 'sighting_alert', payload: sighting, senderId: getDeviceId(), senderName: 'VOG_User', ttl: 3,
    };
    await this.localSync.broadcast(message);
    await this.bleSync.sendMessage({ ...message, messageId: generateMessageId(), timestamp: Date.now() });
  }

  async requestSync(): Promise<void> {
    const lastSync = await this.getLastSyncTime();
    const message: Omit<RelayMessage, 'messageId' | 'timestamp'> = {
      type: 'sync_request', payload: { lastSyncTimestamp: lastSync }, senderId: getDeviceId(), senderName: 'VOG_User', ttl: 2,
    };
    await this.localSync.broadcast(message);
  }

  private async handleSyncRequest(payload: { lastSyncTimestamp: number }): Promise<void> {
    const unsynced = await gudalurDB.offlineSightings.where('timestamp').above(payload.lastSyncTimestamp).toArray();
    if (unsynced.length > 0) {
      await this.localSync.broadcast({ type: 'sync_response', payload: { sightings: unsynced }, senderId: getDeviceId(), senderName: 'VOG_User', ttl: 2 });
    }
  }

  private async handleSyncResponse(payload: SyncPayload): Promise<void> {
    for (const sighting of payload.sightings) {
      const existing = await gudalurDB.offlineSightings.where('timestamp').equals(sighting.timestamp).first();
      if (!existing) {
        await gudalurDB.offlineSightings.add(sighting);
        window.dispatchEvent(new CustomEvent('vog-peer-sync', { detail: sighting }));
      }
    }
  }

  private setupMessageHandlers(): void {
    this.localSync.onMessage(async (msg) => {
      switch (msg.type) {
        case 'sighting_alert':
          await gudalurDB.offlineSightings.add(msg.payload);
          window.dispatchEvent(new CustomEvent('vog-peer-alert', { detail: msg.payload }));
          break;
        case 'sync_request': await this.handleSyncRequest(msg.payload); break;
        case 'sync_response': await this.handleSyncResponse(msg.payload); break;
      }
    });
    this.bleSync.onMessage(async (msg) => { await this.localSync.broadcast(msg); });
  }

  private async getLastSyncTime(): Promise<number> {
    const meta = await gudalurDB.userDrafts.where('formType').equals('registration').first();
    return meta?.lastModified || 0;
  }

  startPeriodicSync(intervalMs: number = 60000): void {
    this.syncInterval = setInterval(async () => { await this.requestSync(); }, intervalMs);
  }

  stopPeriodicSync(): void { if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; } }
  async dispose(): Promise<void> { this.stopPeriodicSync(); await this.bleSync.stop(); this.localSync.disconnect(); }
}

let peerSyncManager: PeerSyncManager | null = null;
export function getPeerSyncManager(): PeerSyncManager {
  if (!peerSyncManager) peerSyncManager = new PeerSyncManager();
  return peerSyncManager;
}
export async function initializePeerSync(): Promise<{ ble: boolean; local: boolean }> {
  return await getPeerSyncManager().initialize();
}
