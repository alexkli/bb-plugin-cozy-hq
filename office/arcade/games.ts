// The games on the arcade cabinet, in the order the picker lists them.

import { BUGS_GAME } from "./bugs.ts";
import { INBOX } from "./inbox.ts";
import type { Game, Play } from "./kit.ts";
import { NOODLE } from "./noodle.ts";
import { RALLY } from "./rally.ts";

export const GAMES: Game<Play>[] = [NOODLE, INBOX, RALLY, BUGS_GAME];
