// Every scenery the office can be dressed in.
import type { SceneryId, Theme } from "../theme.ts";
import { ANNEX } from "./annex.ts";
import { BEACH } from "./beach.ts";
import { CLASSIC } from "./classic.ts";
import { LAIR } from "./lair.ts";
import { NEON } from "./neon.ts";
import { REDWOODS } from "./redwoods.ts";
import { SCHOOL } from "./school.ts";
import { SKYLINE } from "./skyline.ts";
import { SPACESHIP } from "./spaceship.ts";
import { STARTUP } from "./startup.ts";

export const THEMES: Theme[] = [CLASSIC, NEON, REDWOODS, BEACH, SKYLINE, ANNEX, SCHOOL, STARTUP, LAIR, SPACESHIP];

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === (id as SceneryId)) ?? CLASSIC;
}
