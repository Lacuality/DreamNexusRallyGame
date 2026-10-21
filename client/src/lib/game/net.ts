import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../db";

/**
 * "Race with friends": a tiny room system on top of Supabase Realtime
 * (broadcast + presence). Without Supabase it falls back to the browser's
 * BroadcastChannel, which only connects tabs on the same device (handy for testing).
 */

export interface Peer {
  id: string;
  name: string;
  car: string;
  driver: string;
  paint: string;
  host: boolean;
}

export type NetMessage =
  | { t: "start"; circuitId: string; laps: number; at: number }
  | { t: "pos"; id: string; z: number; lat: number; y: number; speed: number }
  | { t: "finish"; id: string; time: number }
  | { t: "leave"; id: string };

type Listener = (m: NetMessage) => void;

export const myId = Math.random().toString(36).slice(2, 10);

export function makeRoomCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

class Room {
  code = "";
  me: Peer | null = null;
  peers = new Map<string, Peer>();
  private channel: RealtimeChannel | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();
  private peerListeners = new Set<() => void>();
  private heartbeat = 0;

  get connected() {
    return !!(this.channel || this.bc);
  }
  get online() {
    return !!supabase;
  }

  onMessage(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  onPeers(fn: () => void) {
    this.peerListeners.add(fn);
    return () => {
      this.peerListeners.delete(fn);
    };
  }
  private emitPeers() {
    this.peerListeners.forEach((f) => f());
  }
  private deliver(m: NetMessage) {
    if (m.t === "leave") {
      this.peers.delete(m.id);
      this.emitPeers();
    }
    this.listeners.forEach((f) => f(m));
  }

  async join(code: string, me: Peer) {
    await this.leave();
    this.code = code.toUpperCase();
    this.me = me;
    this.peers.clear();
    this.peers.set(me.id, me);

    if (supabase) {
      const ch = supabase.channel(`dnr-room-${this.code}`, {
        config: { broadcast: { self: false }, presence: { key: me.id } },
      });
      ch.on("broadcast", { event: "msg" }, ({ payload }) => this.deliver(payload as NetMessage));
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, Peer[]>;
        this.peers.clear();
        Object.values(state).forEach((arr) => arr.forEach((p) => this.peers.set(p.id, p)));
        if (this.me) this.peers.set(this.me.id, this.me);
        this.emitPeers();
      });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Could not connect to the room")), 8000);
        ch.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            await ch.track(me);
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timer);
            reject(new Error("Could not connect to the room"));
          }
        });
      });
      this.channel = ch;
    } else {
      // same-device fallback
      const bc = new BroadcastChannel(`dnr-room-${this.code}`);
      bc.onmessage = (ev) => {
        const d = ev.data;
        if (d?.kind === "hello" || d?.kind === "here") {
          this.peers.set(d.peer.id, d.peer);
          this.emitPeers();
          if (d.kind === "hello" && this.me) bc.postMessage({ kind: "here", peer: this.me });
        } else if (d?.kind === "msg") this.deliver(d.payload);
      };
      bc.postMessage({ kind: "hello", peer: me });
      this.heartbeat = window.setInterval(() => this.me && bc.postMessage({ kind: "here", peer: this.me }), 3000);
      this.bc = bc;
    }
    this.emitPeers();
  }

  send(m: NetMessage) {
    if (this.channel) this.channel.send({ type: "broadcast", event: "msg", payload: m });
    else if (this.bc) this.bc.postMessage({ kind: "msg", payload: m });
  }

  async leave() {
    if (this.me && this.connected) this.send({ t: "leave", id: this.me.id });
    clearInterval(this.heartbeat);
    if (this.channel) {
      await this.channel.untrack().catch(() => {});
      await supabase?.removeChannel(this.channel);
    }
    this.bc?.close();
    this.channel = null;
    this.bc = null;
    this.peers.clear();
    this.code = "";
    this.emitPeers();
  }

  isHost() {
    if (!this.me) return false;
    // the host is whoever created the room; if they leave, the first peer by id takes over
    const hosts = Array.from(this.peers.values()).filter((p) => p.host);
    if (hosts.length) return hosts.some((h) => h.id === this.me!.id);
    const ids = Array.from(this.peers.keys()).sort();
    return ids[0] === this.me.id;
  }
}

export const room = new Room();
