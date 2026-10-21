import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Lock, Check } from "lucide-react";
import { ShowcaseCar } from "../../game/Car";
import { CARS, DRIVERS, PAINTS, isUnlocked, type CarId, type DriverId, type PaintId } from "@/lib/game/garage";
import { useProfile } from "@/lib/stores/useProfile";
import { useAchievements } from "@/lib/stores/useAchievements";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { MenuShell, Card, StatBar } from "./MenuShell";
import { BigButton, UI } from "../gameUi";
import { isTouchDevice } from "@/lib/input";

function Turntable({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => ref.current && (ref.current.rotation.y += dt * 0.6));
  return <group ref={ref}>{children}</group>;
}

function Preview({ car, paint, driver }: { car: CarId; paint: PaintId; driver: DriverId }) {
  const touch = isTouchDevice();
  return (
    <div style={{ height: touch ? 200 : 260, borderRadius: 18, overflow: "hidden", background: "linear-gradient(#3d9be0,#bfe6f5)", marginBottom: 12 }}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [5.5, 3.2, 6.5], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 1, 0)}>
        <hemisphereLight intensity={0.9} color="#ffffff" groundColor="#4f9a3c" />
        <directionalLight position={[5, 8, 5]} intensity={1.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5, 40]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
        <Turntable>
          <ShowcaseCar car={car} paint={paint} driver={driver} />
        </Turntable>
      </Canvas>
    </div>
  );
}

/** Pick your driver, car and paint job. */
export function Garage({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const unlockedIds = useAchievements((s) => s.unlockedAchievements);
  const achievements = useAchievements((s) => s.achievements);
  const playerName = useRally((s) => s.playerName);
  const [tab, setTab] = useState<"drivers" | "cars" | "paint">("drivers");
  const [peek, setPeek] = useState<{ car?: CarId; driver?: DriverId; paint?: PaintId }>({});

  // let online achievements unlock drivers too
  useEffect(() => {
    if (playerName) useAchievements.getState().loadPlayerStats(playerName);
    useAchievements.getState().loadAchievements();
  }, [playerName]);
  useEffect(() => {
    const names = achievements.filter((a) => unlockedIds.has(a.id)).map((a) => a.name);
    profile.setOnlineAchievements(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements, unlockedIds]);

  const prog = profile.progressNow();
  const show = { car: peek.car ?? profile.car, driver: peek.driver ?? profile.driver, paint: peek.paint ?? profile.paint };

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => {
        audioManager.playClick();
        setTab(id);
      }}
      style={{
        flex: 1,
        fontFamily: UI.display,
        fontSize: 16,
        padding: "12px 6px",
        borderRadius: 14,
        border: `3px solid ${tab === id ? UI.gold : "rgba(95,216,255,0.4)"}`,
        background: tab === id ? "rgba(255,210,63,0.2)" : "rgba(14,27,36,0.7)",
        color: tab === id ? UI.gold : UI.white,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <MenuShell title="🏁 Garage" onClose={onClose}>
      <Preview car={show.car} paint={show.paint} driver={show.driver} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabBtn("drivers", "🐾 Drivers")}
        {tabBtn("cars", "🚗 Cars")}
        {tabBtn("paint", "🎨 Paint")}
      </div>

      {tab === "drivers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {DRIVERS.map((d) => {
            const ok = isUnlocked(d.unlock, prog);
            const active = profile.driver === d.id;
            return (
              <Card
                key={d.id}
                active={active}
                locked={!ok}
                onClick={() => {
                  setPeek({ driver: d.id });
                  if (ok) {
                    audioManager.playPickup(2);
                    profile.select({ driver: d.id });
                  }
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 40, filter: ok ? "none" : "grayscale(1)" }}>{d.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: UI.display, fontSize: 17, color: active ? UI.gold : UI.white }}>{d.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{d.species}</div>
                  </div>
                  {active ? <Check color={UI.gold} strokeWidth={3} /> : !ok ? <Lock size={20} /> : null}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{d.perk}</div>
                {!ok && d.unlock && <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6, color: UI.warm }}>🔒 {d.unlock.label}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "cars" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
          {CARS.map((c) => {
            const owned = profile.ownedCars.includes(c.id);
            const active = profile.car === c.id;
            const canBuy = profile.wallet >= c.price;
            return (
              <Card key={c.id} active={active} locked={!owned} onClick={() => setPeek({ car: c.id })}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: UI.display, fontSize: 18, flex: 1, color: active ? UI.gold : UI.white }}>{c.name}</div>
                  {active && <Check color={UI.gold} strokeWidth={3} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 8px", opacity: 0.9 }}>{c.desc}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  <StatBar label="Speed" value={c.stats.top} />
                  <StatBar label="Accel" value={c.stats.accel} />
                  <StatBar label="Handling" value={c.stats.handling} />
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{"❤️".repeat(c.stats.hearts)} hearts</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  {owned ? (
                    !active && (
                      <BigButton
                        onClick={() => {
                          profile.select({ car: c.id });
                          setPeek({});
                        }}
                        color={UI.cyanBright}
                        style={{ width: "100%", fontSize: 16, minHeight: 44, padding: "8px 12px" }}
                      >
                        DRIVE IT
                      </BigButton>
                    )
                  ) : (
                    <BigButton
                      onClick={() => {
                        if (profile.buyCar(c.id)) {
                          audioManager.playMilestone();
                          setPeek({});
                        }
                      }}
                      disabled={!canBuy}
                      color={UI.gold}
                      style={{ width: "100%", fontSize: 16, minHeight: 44, padding: "8px 12px" }}
                    >
                      BUY · 🍯 {c.price.toLocaleString()}
                    </BigButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "paint" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {PAINTS.map((p) => {
            const ok = isUnlocked(p.unlock, prog);
            const active = profile.paint === p.id;
            return (
              <Card
                key={p.id}
                active={active}
                locked={!ok}
                onClick={() => {
                  setPeek({ paint: p.id });
                  if (ok) {
                    audioManager.playClick();
                    profile.select({ paint: p.id });
                  }
                }}
              >
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {[p.main, p.accent, p.trim].map((col) => (
                    <div key={col} style={{ flex: 1, height: 26, borderRadius: 8, background: col, border: "2px solid rgba(255,255,255,0.3)" }} />
                  ))}
                </div>
                <div style={{ fontFamily: UI.display, fontSize: 15, color: active ? UI.gold : UI.white }}>{p.name}</div>
                {!ok && p.unlock && <div style={{ fontSize: 12, fontWeight: 800, color: UI.warm }}>🔒 {p.unlock.label}</div>}
              </Card>
            );
          })}
        </div>
      )}
      <p style={{ textAlign: "center", opacity: 0.75, fontWeight: 700, marginTop: 14 }}>
        Earn 🍯 arequipe jars in every race. Drivers unlock with achievements, paint jobs by visiting regions.
      </p>
    </MenuShell>
  );
}
