export const GAME_CONFIG = {
  LANE_WIDTH: 9,
  ROAD_SEGMENT_LENGTH: 10,
  MAX_SPEED_KMH: 200,
  MAX_SPEED_MS: 200 / 3.6,
  ACCEL_RATE: 45,
  BRAKE_RATE: 85,
  STEER_STRENGTH: 2.0,
  OFFROAD_DRAG: 0.985,
  CURVE_INTENSITY: 0.7,
  HILL_INTENSITY: 0.35,
  PICKUP_BURST: 12,
  AMBIENT_INTENSITY: 0.45,
  SUN_INTENSITY: 1.2,
  CRASH_SPEED_THRESHOLD: 120,
  CURVE_FREQUENCY_BASE: 0.12,
  CURVE_FREQUENCY_INCREASE: 0.015,
  OBSTACLE_DENSITY_BASE: 0.04,
  OBSTACLE_DENSITY_INCREASE: 0.008,
  DIFFICULTY_RAMP_INTERVAL: 35000,
  HIT_RADIUS: 2.0,
  COLLECTIBLE_SCORE: 50,
} as const;

export const DREAM_NEXUS_COLORS = {
  navy: "#0E1B24",
  cyan: "#24A0CE",
  warm: "#FDC6B5",
  white: "#FFFFFF",
  roadGray: "#3a3a3a",
  roadLine: "#FFD700",
} as const;

export interface CarConfig {
  id: string;
  name: string;
  model: string;
  maxSpeedKmh: number;
  acceleration: number;
  handling: number;
  durability: number;
  unlockDistance: number;
  description: string;
}

export const CARS: Record<string, CarConfig> = {
  "classic-rally": {
    id: "classic-rally",
    name: "Classic Rally",
    model: "/models/rally-car.glb",
    maxSpeedKmh: 200,
    acceleration: 1.0,
    handling: 1.0,
    durability: 1.0,
    unlockDistance: 0,
    description: "Balanced performance, perfect for beginners"
  },
  "willys-jeep": {
    id: "willys-jeep",
    name: "Willys Jeep",
    model: "/models/jeep-willys.glb",
    maxSpeedKmh: 180,
    acceleration: 0.85,
    handling: 1.3,
    durability: 1.4,
    unlockDistance: 5000,
    description: "Superior handling and durability"
  },
  "colombian-speedster": {
    id: "colombian-speedster",
    name: "Colombian Speedster",
    model: "/models/rally-car.glb",
    maxSpeedKmh: 240,
    acceleration: 1.4,
    handling: 0.9,
    durability: 0.8,
    unlockDistance: 15000,
    description: "Maximum speed, challenging handling"
  },
  "andes-climber": {
    id: "andes-climber",
    name: "Andes Climber",
    model: "/models/jeep-willys.glb",
    maxSpeedKmh: 190,
    acceleration: 1.1,
    handling: 1.2,
    durability: 1.5,
    unlockDistance: 25000,
    description: "Built for endurance and rough terrain"
  }
} as const;
