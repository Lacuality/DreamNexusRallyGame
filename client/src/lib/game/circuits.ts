import type { BiomeType, CircuitShape } from "../track";

/** Closed-loop race tracks around Colombia. */
export interface Circuit {
  id: string;
  name: string;
  place: string;
  biome: BiomeType;
  laps: number;
  shape: CircuitShape;
  blurb: string;
  night?: boolean;
}

export const CIRCUITS: Circuit[] = [
  {
    id: "tocancipa",
    name: "Autódromo de Tocancipá",
    place: "Cundinamarca, near Bogotá",
    biome: "andes_highland",
    laps: 3,
    blurb: "Colombia's classic race track on the high plains outside Bogotá. Fast and flowing.",
    shape: {
      loop: [[0, -90, 0], [0, 0, 0], [0, 150, 0], [0, 280, 1], [-30, 360, 2], [-100, 390, 3], [-160, 350, 3], [-170, 270, 2], [-130, 210, 1], [-175, 150, 0], [-215, 80, 0], [-200, 0, 0], [-150, -60, 0], [-70, -110, 0]],
    },
  },
  {
    id: "guatape",
    name: "Circuito de Guatapé",
    place: "Antioquia",
    biome: "pueblo",
    laps: 3,
    blurb: "A tight street race between the zócalo houses of Colombia's most colourful town.",
    shape: {
      loop: [[0, -80, 0], [0, 0, 0], [0, 110, 1], [-15, 190, 2], [-80, 230, 3], [-150, 200, 3], [-150, 130, 2], [-100, 100, 2], [-70, 40, 1], [-120, 0, 1], [-200, 10, 1], [-250, -50, 0], [-220, -130, 0], [-150, -150, 1], [-90, -120, 2], [-40, -110, 1]],
    },
  },
  {
    id: "tatacoa",
    name: "Gran Premio Tatacoa",
    place: "Huila",
    biome: "tatacoa",
    laps: 3,
    blurb: "Long desert sweepers through red canyons. Flat out under the stars' observatory.",
    shape: {
      loop: [[0, -120, 0], [0, 0, 0], [0, 200, 2], [-20, 340, 4], [-90, 420, 5], [-200, 400, 4], [-260, 300, 3], [-230, 200, 2], [-150, 160, 1], [-130, 80, 0], [-200, 0, 0], [-260, -80, 1], [-200, -170, 2], [-90, -170, 1]],
    },
  },
  {
    id: "cartagena",
    name: "Cartagena Murallas",
    place: "Bolívar, Caribbean coast",
    biome: "cartagena",
    laps: 3,
    blurb: "A seaside street circuit along the old city walls. Watch the chicanes!",
    shape: {
      loop: [[0, -80, 0], [0, 0, 0], [0, 120, 0], [10, 180, 0], [-10, 240, 0], [0, 300, 0], [-50, 340, 0], [-110, 320, 0], [-130, 260, 0], [-120, 200, 0], [-150, 150, 0], [-180, 100, 0], [-170, 40, 0], [-200, -20, 0], [-170, -80, 0], [-100, -110, 0], [-40, -100, 0]],
    },
  },
  {
    id: "cali",
    name: "Sucursal del Cielo",
    place: "Cali, Valle del Cauca",
    biome: "cali",
    laps: 3,
    blurb: "Salsa on the radio, sugar cane in the fields and Cristo Rey on the hill. ¡Oiga, mire, vea!",
    shape: {
      loop: [[0, -100, 0], [0, 0, 0], [0, 130, 1], [-40, 220, 3], [-120, 240, 4], [-170, 190, 3], [-160, 120, 2], [-110, 90, 1], [-120, 30, 1], [-180, 0, 2], [-230, -50, 3], [-210, -130, 2], [-140, -170, 1], [-60, -150, 0]],
    },
  },
  {
    id: "nexus",
    name: "Nexus Neon Night",
    place: "Medellín · Dream Nexus Arena",
    biome: "comuna_13",
    laps: 3,
    night: true,
    blurb: "Dream Nexus' night race through Comuna 13: neon, graffiti and synthwave.",
    shape: {
      loop: [[0, -100, 0], [0, 0, 0], [0, 120, 3], [-10, 210, 7], [-80, 260, 9], [-160, 230, 8], [-190, 150, 6], [-150, 90, 4], [-80, 80, 3], [-60, 20, 2], [-110, -30, 3], [-190, -30, 5], [-240, -110, 4], [-190, -190, 2], [-90, -180, 0]],
    },
  },
];

export const circuitById = (id: string) => CIRCUITS.find((c) => c.id === id) ?? CIRCUITS[0];

/** Fun rival names, each with a driver + car + paint. */
export const RIVALS = [
  { name: "Juancho", driver: "jaguar", car: "taxi", paint: "tricolor", skill: 1.0 },
  { name: "La Mona", driver: "tucan", car: "rally7", paint: "caribe", skill: 0.97 },
  { name: "El Flaco", driver: "condor", car: "cuatro", paint: "cafe", skill: 0.94 },
  { name: "Doña Rosa", driver: "oso", car: "willys", paint: "esmeralda", skill: 0.95 },
  { name: "Pibe", driver: "titi", car: "dn", paint: "rosaNeon", skill: 0.99 },
  { name: "Nexi", driver: "nexi", car: "chiva", paint: "dn", skill: 0.96 },
  { name: "Carmen", driver: "rana", car: "cuatro", paint: "tricolor", skill: 0.98 },
] as const;
