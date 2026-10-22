import { useEffect, useState } from "react";
import { Users, Copy, Play, LogOut, Wifi } from "lucide-react";
import { room, makeRoomCode, myId, type Peer } from "@/lib/game/net";
import { CIRCUITS, circuitById } from "@/lib/game/circuits";
import { driverById, carById } from "@/lib/game/garage";
import { useProfile } from "@/lib/stores/useProfile";
import { useRally } from "@/lib/stores/useRally";
import { MenuShell, Card } from "./MenuShell";
import { CircuitThumb } from "./CircuitSelect";
import { BigButton, UI } from "../gameUi";

/** Race with friends: create or join a room with a 4-letter code. */
export function OnlineLobby({ onClose }: { onClose: () => void }) {
  const playerName = useRally((s) => s.playerName);
  const profile = useProfile();
  const [code, setCode] = useState(room.code);
  const [joinCode, setJoinCode] = useState("");
  const [peers, setPeers] = useState<Peer[]>(Array.from(room.peers.values()));
  const [circuit, setCircuit] = useState("tocancipa");
  const [battle, setBattle] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => room.onPeers(() => setPeers(Array.from(room.peers.values()))), []);

  const me = (host: boolean): Peer => ({
    id: myId,
    name: playerName || "Racer",
    car: profile.car,
    driver: profile.driver,
    paint: profile.paint,
    host,
  });

  const join = async (c: string, host: boolean) => {
    setBusy(true);
    setError("");
    try {
      await room.join(c, me(host));
      setCode(room.code);
    } catch (e: any) {
      setError(e?.message || "Could not connect");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    const def = circuitById(circuit);
    room.send({ t: "start", circuitId: def.id, laps: def.laps, at: Date.now(), battle });
    useRally.getState().start({ mode: "online", circuitId: def.id, laps: def.laps, room: room.code, battle });
  };

  const isHost = room.isHost();

  return (
    <MenuShell title="👥 Race with Friends" onClose={onClose}>
      {!playerName && <p style={{ color: UI.warm, fontWeight: 800 }}>Tip: tap your name at the top-left of the start screen so friends know who you are.</p>}
      {!room.online && (
        <p style={{ fontWeight: 800, opacity: 0.85, display: "flex", gap: 8, alignItems: "center" }}>
          <Wifi size={16} style={{ flexShrink: 0 }} /> Online database not connected — rooms only work between tabs on this device.
        </p>
      )}

      {!code ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          <Card>
            <div style={{ fontFamily: UI.display, fontSize: 20, marginBottom: 8 }}>Create a room</div>
            <p style={{ margin: "0 0 10px", fontWeight: 700 }}>You get a code to send to your friends (WhatsApp it!). Everyone races the same circuit live.</p>
            <BigButton onClick={() => join(makeRoomCode(), true)} disabled={busy} color={UI.gold} style={{ width: "100%" }}>
              CREATE ROOM
            </BigButton>
          </Card>
          <Card>
            <div style={{ fontFamily: UI.display, fontSize: 20, marginBottom: 8 }}>Join a room</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
                placeholder="CODE"
                aria-label="Room code"
                size={4}
                autoCapitalize="characters"
                autoComplete="off"
                style={{
                  flex: 1,
                  width: "100%",
                  minWidth: 0,
                  minHeight: 60,
                  fontFamily: UI.display,
                  fontSize: 28,
                  letterSpacing: "0.3em",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.1)",
                  border: `3px solid ${UI.cyanBright}`,
                  borderRadius: 16,
                  color: UI.white,
                }}
              />
              <BigButton onClick={() => join(joinCode, false)} disabled={busy || joinCode.length !== 4} color={UI.cyanBright}>
                JOIN
              </BigButton>
            </div>
          </Card>
          {error && <p style={{ color: UI.red, fontWeight: 800 }}>{error}</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          <Card active>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: UI.warm }}>ROOM CODE</div>
                <div style={{ fontFamily: UI.display, fontSize: 44, letterSpacing: "0.2em", color: UI.gold }}>{code}</div>
              </div>
              <BigButton
                onClick={() => {
                  const text = `Race me in Dream Nexus Rally! Room code: ${code} — https://lacuality.github.io/DreamNexusRallyGame/`;
                  if (navigator.share) navigator.share({ text }).catch(() => {});
                  else navigator.clipboard?.writeText(text);
                }}
                color={UI.cyanBright}
                style={{ fontSize: 16 }}
              >
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Copy size={18} /> SHARE
                </span>
              </BigButton>
              <BigButton onClick={() => room.leave().then(() => setCode(""))} color={UI.warm} style={{ fontSize: 16 }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <LogOut size={18} /> LEAVE
                </span>
              </BigButton>
            </div>
          </Card>

          <Card>
            <div style={{ fontFamily: UI.display, fontSize: 18, display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Users size={20} /> Racers ({peers.length})
            </div>
            {peers.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800, padding: "4px 0" }}>
                <span style={{ fontSize: 24 }}>{driverById(p.driver).emoji}</span>
                <span style={{ flex: 1 }}>
                  {p.name} {p.id === myId && "(you)"} {p.host && "👑"}
                </span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>{carById(p.car).name}</span>
              </div>
            ))}
            {peers.length < 2 && <div style={{ opacity: 0.7, fontWeight: 700 }}>Waiting for friends to join…</div>}
          </Card>

          {isHost ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {[
                  { on: false, icon: "🏁", title: "Carrera", text: "Clean racing. Fastest driver wins." },
                  { on: true, icon: "🥑", title: "Rally Loco", text: "Power-ups on! Avocados, bananas, voladores…" },
                ].map((o) => (
                  <Card key={o.title} active={battle === o.on} onClick={() => setBattle(o.on)} style={{ padding: 10 }}>
                    <div style={{ fontFamily: UI.display, fontSize: 18 }}>
                      {o.icon} {o.title}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{o.text}</div>
                  </Card>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                {CIRCUITS.map((c) => (
                  <Card key={c.id} active={circuit === c.id} onClick={() => setCircuit(c.id)} style={{ padding: 8, textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <CircuitThumb c={c} size={70} />
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 13, marginTop: 4 }}>{c.name}</div>
                  </Card>
                ))}
              </div>
              <BigButton onClick={start} color={UI.gold}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <Play size={24} fill="currentColor" /> {battle ? "START RALLY LOCO" : "START RACE FOR EVERYONE"}
                </span>
              </BigButton>
            </>
          ) : (
            <p style={{ textAlign: "center", fontWeight: 800 }}>The host 👑 picks the circuit and starts the race. Get ready!</p>
          )}
        </div>
      )}
    </MenuShell>
  );
}
