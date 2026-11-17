// School: whether Peanut the class hamster is out of the cage (an Easter egg
// in eggs.ts lets him out; live.ts leaves the wheel empty meanwhile).
export const HAMSTER = { outAt: -1e9, back: 0 };

/** Peanut's out running round the school at time t. */
export function hamsterOut(t: number): boolean {
  return t >= HAMSTER.outAt && t < HAMSTER.outAt + HAMSTER.back;
}
