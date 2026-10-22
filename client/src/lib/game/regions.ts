import type { BiomeType } from "../track";

/** The regions of Colombia you drive through, for the map screen. */
export interface Region {
  biome: BiomeType;
  name: string;
  place: string;
  emoji: string;
  lon: number;
  lat: number;
  fact: string;
}

export const REGIONS: Region[] = [
  {
    biome: "coffee_hills",
    name: "Eje Cafetero",
    place: "Quindío · Salento & Valle de Cocora",
    emoji: "☕",
    lon: -75.57,
    lat: 4.64,
    fact: "Colombia's coffee triangle. The wax palm, Colombia's national tree, grows here and can reach about 60 m — the tallest palm on Earth.",
  },
  {
    biome: "andes_highland",
    name: "Páramo Andino",
    place: "Boyacá · Andes mountains",
    emoji: "🏔️",
    lon: -72.9,
    lat: 5.6,
    fact: "Páramos are high mountain wetlands that supply much of Colombia's water. Their frailejón plants grow only about 1 cm a year.",
  },
  {
    biome: "pueblo",
    name: "Guatapé",
    place: "Antioquia",
    emoji: "🏘️",
    lon: -75.16,
    lat: 6.23,
    fact: "Famous for zócalos — colourful painted panels at the base of every house — and El Peñol, a giant rock you climb by around 700 steps.",
  },
  {
    biome: "ciudad_perdida",
    name: "Ciudad Perdida",
    place: "Sierra Nevada de Santa Marta",
    emoji: "🗿",
    lon: -73.93,
    lat: 11.04,
    fact: "Teyuna, the 'Lost City', was built by the Tayrona around 800 AD — centuries before Machu Picchu. It takes a multi-day jungle trek to reach it.",
  },
  {
    biome: "comuna_13",
    name: "Comuna 13",
    place: "Medellín",
    emoji: "🎨",
    lon: -75.62,
    lat: 6.25,
    fact: "Once one of Medellín's toughest neighbourhoods, now famous for its street art, hip-hop and the outdoor escalators that opened in 2011.",
  },
  {
    biome: "tatacoa",
    name: "Desierto de la Tatacoa",
    place: "Huila",
    emoji: "🌵",
    lon: -75.17,
    lat: 3.23,
    fact: "Not really a desert but a dry tropical forest, with red and grey canyons and some of the clearest night skies in Colombia for stargazing.",
  },
  {
    biome: "cali",
    name: "Cali",
    place: "Valle del Cauca",
    emoji: "💃",
    lon: -76.53,
    lat: 3.45,
    fact: "Cali calls itself the world capital of salsa. The Cristo Rey statue watches over the city from the western hills, and El Gato del Río sits by the Cali River.",
  },
  {
    biome: "cartagena",
    name: "Cartagena de Indias",
    place: "Bolívar · Caribbean coast",
    emoji: "🏰",
    lon: -75.51,
    lat: 10.39,
    fact: "Its walled old city, forts and colourful balconies are a UNESCO World Heritage Site since 1984.",
  },
];

/**
 * A simplified outline of Colombia (lon, lat). Not survey-accurate —
 * just recognisable for the map screen.
 */
export const COLOMBIA_OUTLINE: [number, number][] = [
  [-77.4, 8.6], [-76.8, 8.9], [-76.2, 9.4], [-75.6, 10.4], [-75.2, 10.9], [-74.8, 11.0], [-74.2, 11.3],
  [-73.3, 11.3], [-72.6, 11.7], [-72.0, 12.2], [-71.6, 12.4], [-71.1, 12.0], [-71.3, 11.5], [-72.2, 11.0],
  [-72.9, 10.4], [-73.0, 9.3], [-72.7, 8.6], [-72.4, 8.0], [-72.0, 7.4], [-70.7, 7.0], [-69.4, 6.1],
  [-67.8, 6.2], [-67.4, 5.0], [-67.8, 4.0], [-67.3, 3.4], [-67.8, 2.8], [-67.2, 2.0], [-67.0, 1.2],
  [-69.5, 1.1], [-69.4, -1.1], [-69.9, -4.2], [-70.6, -3.8], [-71.7, -2.2], [-73.0, -2.5], [-73.6, -1.2],
  [-75.3, -0.1], [-76.3, 0.4], [-77.4, 0.4], [-78.8, 1.4], [-78.6, 2.3], [-77.5, 3.4], [-77.3, 4.0],
  [-77.4, 5.5], [-77.5, 6.7], [-77.9, 7.2], [-77.4, 8.6],
];

/** lon/lat -> map pixels for a map `w` wide. */
export function project(lon: number, lat: number, w: number): [number, number] {
  const k = w / 12.5;
  return [(lon + 79.5) * k, (12.9 - lat) * k];
}
export const MAP_ASPECT = 17.4 / 12.5; // height / width
