/**
 * What the rivals shout at you. Keyed by rival name; "pass" when they overtake
 * you, "hit" when they get you with an item or a shove, "ouch" when you get them.
 */
type Lines = { pass: string[]; hit: string[]; ouch: string[] };

const TAUNTS: Record<string, Lines> = {
  Juancho: {
    pass: ["¡Permiso, que voy tarde!", "¡Taxi libre, pero no para usted!", "¡Nos vemos en la meta, parcero!"],
    hit: ["¡Eso le pasa por atravesado!", "¡Cóbrese y me da el cambio!"],
    ouch: ["¡Uy, qué fue eso, hermano!", "¡Me rayó el taxi!"],
  },
  "La Mona": {
    pass: ["¡Chao, pescao!", "¡Coja oficio!", "¡Ay, qué pena, voy de afán!"],
    hit: ["¡Sin llorar!", "¡Quién lo manda!"],
    ouch: ["¡Oigan a este!", "¡Atrevido!"],
  },
  "El Flaco": {
    pass: ["¡Hágale, que usted puede... verme pasar!", "¡Suave, suave!"],
    hit: ["¡De una!", "¡Tome pa\' que lleve!"],
    ouch: ["¡Ay, juemadre!", "¡Me descuadró!"],
  },
  "Doña Rosa": {
    pass: ["¡Con permiso, mijo!", "¡A mi edad y mire!", "¡Abríguese que hace viento!"],
    hit: ["¡Qué pena con usted, mijo!", "¡Eso es por no saludar!"],
    ouch: ["¡Ave María, pues!", "¡Respete a los mayores!"],
  },
  Pibe: {
    pass: ["¡Todo bien, todo bien!", "¡Tocala y pasala!", "¡Golazo de adelantamiento!"],
    hit: ["¡Falta! ...mentiras, siga, siga.", "¡Eso fue un túnel!"],
    ouch: ["¡Árbitro!", "¡Eso es tarjeta roja!"],
  },
  Nexi: {
    pass: ["Bip bop. Adelantamiento calculado.", "Probabilidad de que me alcance: 3%."],
    hit: ["Impacto confirmado. Lo siento. No lo siento.", "Actualizando su posición: peor."],
    ouch: ["Error 404: dignidad no encontrada.", "Recalculando... ¡auch!"],
  },
  Carmen: {
    pass: ["¡Quieto en primera!", "¡Wepa! ¡Ahí le voy!", "¡Sabrosura de curva!"],
    hit: ["¡Azúcar!", "¡Eso, pa\' que baile!"],
    ouch: ["¡Epa, epa!", "¡No sea tan confianzudo!"],
  },
};

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

export function taunt(name: string, kind: keyof Lines): string | null {
  const t = TAUNTS[name];
  return t ? pick(t[kind]) : null;
}

/** Tips shown under the start lights. */
export const TIPS = [
  "DRIFT: brake + steer through the corner, let go for a turbo",
  "REBUFO: sit right behind a rival to charge a slingshot boost",
  "PIRUETA: hit NITRO in the air for a trick and a landing boost",
  "JARS: each 🍯 makes you faster (max 10). A hit scatters three",
  "ROCKET START: hold accelerate just as the light goes green",
  "Last places get the best items: ⚡ Apagón, 🌟 Panela, 🚌 Chiva Express",
  "Look behind with B (or ATRÁS) before you drop a banana",
];
