import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { CARS, DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useRally } from "@/lib/stores/useRally";

interface CarModelProps {
  modelPath: string;
}

function CarModel({ modelPath }: CarModelProps) {
  const { scene } = useGLTF(modelPath);

  const carModel = useMemo(() => {
    const clonedScene = scene.clone();
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedScene;
  }, [scene]);

  return (
    <group scale={2.5} position={[0, -1, 0]}>
      <primitive object={carModel} />
    </group>
  );
}

export function CarSelector() {
  const { selectedCar, unlockedCars, totalCareerDistance, selectCar } = useRally();

  const carIds = Object.keys(CARS);
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, carIds.indexOf(selectedCar))
  );

  const currentCarId = carIds[currentIndex];
  const currentCar = CARS[currentCarId];
  const isUnlocked = unlockedCars.has(currentCarId);
  const isSelected = selectedCar === currentCarId;

  const distanceNeeded = Math.max(0, currentCar.unlockDistance - totalCareerDistance);
  const progressPercent = currentCar.unlockDistance > 0
    ? Math.min(100, (totalCareerDistance / currentCar.unlockDistance) * 100)
    : 100;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + carIds.length) % carIds.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % carIds.length);
  };

  const handleSelect = () => {
    if (isUnlocked) {
      selectCar(currentCarId);
    }
  };

  const getStatBarColor = (value: number) => {
    if (value >= 1.3) return "#00ff88";
    if (value >= 1.1) return "#44ff44";
    if (value >= 0.9) return "#ffaa00";
    return "#ff4444";
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(6px)",
        padding: "clamp(16px, 2vw, 24px)",
        borderRadius: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: "0.8em",
          fontFamily: "monospace",
          color: DREAM_NEXUS_COLORS.cyan,
          fontSize: "clamp(18px, 2.4vw, 24px)",
          textAlign: "center",
        }}
      >
        Select Your Car
      </h3>

      <div style={{ position: "relative", marginBottom: "16px" }}>
        <div
          style={{
            width: "100%",
            height: "clamp(180px, 24vh, 240px)",
            borderRadius: "10px",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.15)",
            position: "relative",
          }}
        >
          <Canvas camera={{ position: [4, 2, 4], fov: 50 }} shadows>
            <color attach="background" args={["#0E1B24"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
            <CarModel modelPath={currentCar.model} />
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={3}
              maxDistance={10}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>

          {!isUnlocked && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(4px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <Lock size={48} color={DREAM_NEXUS_COLORS.warm} />
              <div style={{ textAlign: "center", padding: "0 16px" }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: DREAM_NEXUS_COLORS.white,
                    marginBottom: "8px",
                  }}
                >
                  Locked
                </div>
                <div style={{ fontSize: "14px", color: DREAM_NEXUS_COLORS.warm }}>
                  {distanceNeeded > 0
                    ? `${distanceNeeded}m more to unlock`
                    : "Complete more races!"}
                </div>
                <div
                  style={{
                    width: "200px",
                    height: "8px",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "4px",
                    marginTop: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      background: DREAM_NEXUS_COLORS.cyan,
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {isSelected && isUnlocked && (
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: DREAM_NEXUS_COLORS.cyan,
                color: DREAM_NEXUS_COLORS.navy,
                padding: "6px 12px",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              SELECTED
            </div>
          )}
        </div>

        <button
          onClick={handlePrevious}
          style={{
            position: "absolute",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.7)",
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(36,160,206,0.8)";
            e.currentTarget.style.borderColor = DREAM_NEXUS_COLORS.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.7)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
          }}
        >
          <ChevronLeft size={24} color={DREAM_NEXUS_COLORS.white} />
        </button>

        <button
          onClick={handleNext}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.7)",
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(36,160,206,0.8)";
            e.currentTarget.style.borderColor = DREAM_NEXUS_COLORS.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.7)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
          }}
        >
          <ChevronRight size={24} color={DREAM_NEXUS_COLORS.white} />
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h4
          style={{
            margin: 0,
            marginBottom: "8px",
            fontFamily: "monospace",
            color: DREAM_NEXUS_COLORS.white,
            fontSize: "18px",
          }}
        >
          {currentCar.name}
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: DREAM_NEXUS_COLORS.warm,
            lineHeight: 1.4,
          }}
        >
          {currentCar.description}
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <StatBar
          label="Max Speed"
          value={currentCar.maxSpeedKmh}
          max={250}
          color={getStatBarColor(currentCar.maxSpeedKmh / 200)}
          unit="km/h"
        />
        <StatBar
          label="Acceleration"
          value={currentCar.acceleration}
          max={1.5}
          color={getStatBarColor(currentCar.acceleration)}
          isMultiplier
        />
        <StatBar
          label="Handling"
          value={currentCar.handling}
          max={1.5}
          color={getStatBarColor(currentCar.handling)}
          isMultiplier
        />
        <StatBar
          label="Durability"
          value={currentCar.durability}
          max={1.5}
          color={getStatBarColor(currentCar.durability)}
          isMultiplier
        />
      </div>

      {!isSelected && isUnlocked && (
        <button
          onClick={handleSelect}
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "16px",
            padding: "12px 24px",
            background: `linear-gradient(180deg, ${DREAM_NEXUS_COLORS.cyan}, #5dd6ff)`,
            color: DREAM_NEXUS_COLORS.navy,
            border: "0",
            borderRadius: 8,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(0,180,220,0.30)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,180,220,0.40)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,180,220,0.30)";
          }}
        >
          SELECT THIS CAR
        </button>
      )}
    </div>
  );
}

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
  isMultiplier?: boolean;
}

function StatBar({ label, value, max, color, unit, isMultiplier }: StatBarProps) {
  const percentage = (value / max) * 100;
  const displayValue = isMultiplier ? `${value.toFixed(1)}x` : `${Math.round(value)}${unit || ""}`;

  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: "14px",
        }}
      >
        <span style={{ color: DREAM_NEXUS_COLORS.white }}>{label}</span>
        <span style={{ color: DREAM_NEXUS_COLORS.cyan, fontWeight: 600 }}>
          {displayValue}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
