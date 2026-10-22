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
      length: 1300,
      curves: [
        [12, 2, 0],
        [6, 3, 1.1],
        [2.5, 5, 2.4],
      ],
      hills: [
        [1.2, 1, 0.3],
        [0.6, 3, 1.7],
      ],
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
      length: 1100,
      curves: [
        [8, 3, 0.5],
        [2.5, 5, 0],
        [0.8, 7, 1.3],
      ],
      hills: [
        [2.2, 2, 0],
        [0.8, 5, 1],
      ],
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
      length: 1500,
      curves: [
        [16, 2, 0.8],
        [5, 4, 0.2],
      ],
      hills: [
        [3, 2, 0.6],
        [1, 6, 2],
      ],
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
      length: 1200,
      curves: [
        [10, 3, 0],
        [4, 4, 1.4],
        [0.8, 9, 0.7],
      ],
      hills: [[0.5, 2, 0]],
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
      length: 1350,
      curves: [
        [13, 2, 1.2],
        [5, 4, 0.6],
        [2, 6, 2.2],
      ],
      hills: [
        [1.5, 2, 0.4],
        [0.6, 4, 1.9],
      ],
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
      length: 1250,
      curves: [
        [11, 2, 2],
        [7, 4, 0.4],
        [3, 6, 1.9],
      ],
      hills: [
        [3.5, 1, 0],
        [1.5, 3, 1],
      ],
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
] as const;
