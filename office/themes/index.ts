// Every scenery the office can be dressed in.
import type { SceneryId, Theme } from "../theme.ts";
import { ANNEX } from "./annex.ts";
import { BEACH } from "./beach.ts";
import { CABIN } from "./cabin.ts";
import { CAFE } from "./cafe.ts";
import { CLASSIC } from "./classic.ts";
import { HOME } from "./home.ts";
import { LAIR } from "./lair.ts";
import { NEON } from "./neon.ts";
import { REDWOODS } from "./redwoods.ts";
import { SCHOOL } from "./school.ts";
import { SKYLINE } from "./skyline.ts";
import { SPACESHIP } from "./spaceship.ts";
import { STARTUP } from "./startup.ts";

export const THEMES: Theme[] = [CLASSIC, NEON, REDWOODS, BEACH, SKYLINE, ANNEX, SCHOOL, STARTUP, CABIN, LAIR, SPACESHIP, CAFE, HOME];

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === (id as SceneryId)) ?? CLASSIC;
}
