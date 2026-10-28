# PokéSurvivor Wiki

Website: https://pika28samson.github.io/pokesurvivor-wiki/

## Web interface

Current move-DPS benchmark uses three trials per move, with seeds 42, 43 and 44.
Each trial has 30 seconds of warm-up and 120 measured seconds at 60 Hz.
CSV scores aggregate damage and penalties over 360 measured seconds per move
(450 total simulated seconds including warm-ups). Reproduce with:
`node helpful_tools/swarm_simulator/run.cjs --neutral --trials 3 --duration 120 --warmup 30 --enemy-hp 100 --spawn-rate 15 --max-enemies 25`.

Damage calculation policy: Analytic, Serene Grace, Sheer Force, Poison Touch,
Rough Skin, Iron Barbs, Synchronize and Infiltrator receive no bonus in PokéSurvivor Wiki rankings, recommendations or previews. This includes any generic +8% type
passive attached to these abilities. Their status changes, retaliation and shield
effects are disabled in previews. Technician and other confirmed bonuses remain
enabled. The upstream game's ability definitions are unchanged.

Open `helpful_tools/index.html` in a browser. No server or install is required.
Keep it inside this repository so it can load the game files beside it.
The home page links to:

- `tm-finder.html`: daily TM partner search, now a dedicated subpage.
- `wiki.html`: the game wiki landing page.
- `moves.html`: all moves, searchable and filterable by type, category, coverage,
  family and upgrade stage; sortable by damage, damage score, baseline DPS, speed, area,
  cooldown, reach and count. Each move links to its full stage/evolution stats,
  description, special behaviours and actual in-game effect sprites.
- `simulation.html`: save named Pokémon/ability/four-move builds in the browser and compare their live canvas simulations side by side, with shared settings and JSON backup import/export.
- `pokemon.html`: searchable Pokémon catalogue with type, rarity and generation
  filters, stat sorting, sprites and individual detail pages containing stats,
  abilities, default starting move, natural move pool and additional TMs. Each
  detail page also suggests the top five four-move merged combinations.
- `mechanics.html`: searchable explanations of damage reduction, upgrade caps,
  Arceus's Judgment, evolution, physical/special scaling, abilities and the shop.

Move and Pokémon data load from the repository at page load. Mechanic articles
are curated from the implementation and link to their source files; review them
after game rule changes. No game saves are read or modified.

DPS baseline means damage per hit divided by cooldown, not actual combat DPS.
All damaging moves have integer area estimates. Projectile families sum their
circular projectile hitboxes; chains use maximum enemy count times mean normal
enemy hitbox area (equal weight per non-legendary species). Lines, circles and
explosions use their geometric footprints. Summed overlaps are not removed.
Status moves have no geometric area and zero simulated DPS at maximum stage.

Move scores import the exact **damage_score** from swarm_simulator/results/move-dps.csv.
The neutral benchmark uses 100 enemy HP, 15 spawns/second, a 25-enemy cap,
maxed/evolved moves and no other upgrades. Enemies that touch the player subtract
their remaining HP and are removed. Damage score = (raw damage - contact penalty)
/ measured seconds. Negative scores are valid. Warm-up damage and penalties are
excluded. Only maximum stages are measured; other stages show a dash.

After rerunning the benchmark, refresh the browser data snapshot with:

`node helpful_tools/import-move-dps.cjs`

The importer validates all 103 moves and matching CSV/JSON scores. The website
loads the generated move-dps-data.js; opening a page does not run the benchmark.
Combination estimates adjust raw damage for selected attacker/buff factors and
retain benchmark contact penalties unchanged. These are estimates, not merged
build simulations. Live canvases retain their own non-contact rules and actual
DPS counters. See swarm_simulator/README.md for all settings and output fields.

Typing coefficients are website-only comparison statistics, not official game
stats. For attack type `a`, `C(a) = sum_s p(s) * Types.mult(a, species[s].types)`.
The game function evaluates full dual typings using softened effectiveness and
the game's final 0.3–2.4 clamp. Coefficients retain full precision in calculations.

Species probabilities use a reproducible 0–30-minute solo potential-spawn model:
analytic expected tier-cast inclusion (including forced support/special picks),
the 10-to-3 age-based spawn-bag weights, half-second integration of the actual
spawn-rate function, sampled surge schedules, and the five no-repeat boss draws.
This is not an observed or universal enemy distribution. Hordes, summoner
offspring, thieves, optional rifts/Judgment and population/placement suppression
are excluded because their actual frequency depends on the run. Hidden Mechanics
explains the assumptions and lists all 18 coefficients and weighted type shares.

After updating the game's input data, regenerate the population snapshot with
`node helpful_tools/build-typing-model.cjs`. Tests verify input source hashes and
deterministic reproduction. The population snapshot and calculators are confined
to PokéSurvivor Wiki; no game source files are changed.

Combination settings default to including compatible TMs and requiring Harden.
All moves are level 5 and evolved if possible. Rankings default to CSV-based swarm DPS estimates, with an alternative ideal aggregate DPS ranking. They account
for Pokémon attack side, the single-type bonus, family-specific ideal hit rates,
and shared physical/special buff channels. The optimizer enumerates status
subsets (at most two), then uses exact best-first top-sum selection for damaging
moves, producing the top five under that additive model without enumerating all
four-move sets. Buff calculations sample 120 seconds after a 30-second warm-up.

The ability selector defaults to the Pokémon's first regular ability, with hidden
abilities and a no-ability comparison available. Rankings run the actual ability
start/out hooks on isolated models, including generic/+8% effects, attack changes,
critical chance, cooldowns and status cooldowns. Conditional ability controls cover
player/target HP, elapsed time, kills, slowing, Anger Point and item presence.
Weather defaults to the ability's summoned weather (otherwise clear), with a
manual override and the game's full-intensity weather multipliers. Hustle uses
expected random damage; Moody averages four states and Stance Change equal uptime.
Physical/special scaling and the 20% mono-type bonus remain separate factors and
are shown with each move's ability, critical and weather multipliers.

The UI documents exclusions: nature changes, equipment stats, run
upgrades, target-dependent DoT/Hex damage, misses, and competition between different
moves' persistent fields. These estimates do not predict measured single-target
DPS. Harden has zero direct DPS, but remains mandatory when its option is enabled.
CSV-based combination estimates divide imported DPS by its benchmark attack/mono-type/ability/critical/weather/cooldown factors before applying the current Pokemon and buff factors. They sum calibrated single-move values, not measured merged-build results. Typing coefficients are not applied to the CSV baseline.
DPS omits ordinary type effectiveness but includes the
weighted ability multiplier. Defensive/retaliation/one-off ability effects are
not assigned direct DPS. Game saves and game code are never modified.

Run `node --test helpful_tools/*.test.cjs` for the finder and wiki checks.

## Command line

Requires Node.js, with no extra packages. Run from the repository root:

```powershell
node helpful_tools/find_tm.cjs
node helpful_tools/find_tm.cjs "Shadow Ball"
node helpful_tools/find_tm.cjs "Draining Kiss" --date 2026-10-24
node helpful_tools/find_tm.cjs --list
```

Without a TM argument, the program asks for its name. Names are case insensitive;
spaces, hyphens and underscores are accepted (for example `shadow ball` or
`shadow-ball`). Use `--list` for all supported names.

The default is today's date in **Europe/Madrid**, matching the game's reset.
An optional `--date YYYY-MM-DD` checks another day.

The tool loads the repository's actual Pokemon data, move data and shop rules.
It assumes no Pokemon has learned any TMs and does not access your save.
It lists all species, including Pokemon you may not own.

If the requested TM is in the day's first seven slots, every partner keeps it
available. Base slot 8 can be replaced, so the tool checks which partners keep
that TM available too. Buying does not require the partner to learn it.
For TMs outside the base eight, results are the
partners whose fallback in slot 8 is exactly the requested TM. There may be no
matches. Changing partners does not reroll a species' result that day.

Run verification with `node --test helpful_tools/find_tm.test.cjs`.

Move catalogue defaults to the evolved / maximum available stage. Pokémon combination recommendations have collapsible Advanced Settings for the Pokémon's ability, required moves (Harden by default), allowed families (all by default), and ability conditions. Required moves must be available with the current TM setting and allowed families; invalid selections produce no recommendations. Up to four moves and two status moves can be required.

Combination normal settings default to damage-score ranking, the higher base physical/special attack category (special on a tie), and ranged attacks. Both filters always allow status moves. Ability conditions default to 1,200 elapsed seconds and 1,000 kills.

Each recommended combination includes an isolated animated canvas preview using the actual game combat, projectile, sprite, and VFX modules. All four moves are maxed and evolved where available. The Pokémon and Substitute target are position-locked and invulnerable; the target uses subsitute.png above the player. Dash displacement, enemy knockback, incoming damage, and target death are disabled. Previews are visual only and never determine rankings. Previews play automatically without captions, controls, or scrollbars, load lazily, and pause when the page or preview is hidden. Trusted local game scripts run in separate unsandboxed frames so file-based sprite and script loading works.

Preview settings: Enemy layers (1–6) and enemies per layer (1–24), default one layer of eight. Rings start at 100 world pixels with 60-pixel spacing; enemies in each ring have equal angles and radius. Live DPS is measured from resolved hits plus burn and poison over the last 15 seconds of active playback, with the displayed value refreshed once per second; it resets when settings change and does not affect analytical rankings. Targets have neutral matchups and defence; poison uses 1,000 reference HP despite their immortality, with level-1 burn scaling. Selected ability start/outgoing hooks, critical chance, cooldowns and weather are applied; passive ability tick/contact damage is not included.

Enemy arc is a normal preview setting, default 360°, adjustable from 1–360°. Partial arcs are centred upward: 180° covers the top semicircle. Enemies are evenly spaced at the centres of equal arc segments, leaving half a spacing interval at each endpoint so near-full arcs do not crowd across the opening. Full circles avoid a duplicate endpoint. A single enemy stays at the top of its layer.

In stationary mode, enemy distance (25–400 px, default 100) sets the centre-to-centre radius of the first layer. Each additional layer remains 60 px farther out. Changing the distance immediately restarts previews and live DPS measurement.

Preview mode can switch between Stationary targets and Moving enemy swarm (default). Swarms reuse subsitute.png with health bars, spawn at random angles inside the selected arc, just beyond the camera view using the actual game spawn-ring formula, walk towards the stationary invulnerable Pokémon, and can be slowed, stunned, knocked back, and defeated. Targets default to 1,500 HP and random speed 45–65 world pixels/second; arrivals default to 35 per second, capped at layers × enemies per layer. The preview auto-targets nearby living enemies, counts defeats, and measures damage actually removed from enemy HP (excluding overkill). This is a neutral training swarm, not the game's timed wave population; rankings are still analytical.

All preview controls are under Canvas Settings. Swarm enemy HP is adjustable from 1 to 1,000,000, and spawn frequency from 0.1 to 100 enemies/second. Swarms start with one enemy and build up at the selected rate, up to the population limit. Spawn distance uses the game camera at normal zoom for the 480×340 preview: outerRadius() + random(10,70), with the game’s 0.9 vertical factor. Floating damage numbers use the game FX renderer in both modes.

Every preview also displays Average DPS / enemy: damage in the rolling 15-second window divided by the accumulated living-enemy seconds in that window. This equals total DPS divided by enemy count for stationary targets and accounts for changing swarm population. It includes all living spawned enemies, including those approaching from offscreen. Both DPS displays refresh once per second and reset on settings changes.

Current canvas defaults: Moving enemy swarm, 1,500 enemy HP and 35 spawns/second. Current CSV benchmark: `node helpful_tools/swarm_simulator/run.cjs --neutral --spawn-rate 15 --enemy-hp 100 --max-enemies 25`, then `node helpful_tools/import-move-dps.cjs`. Attack multipliers are both exactly 1, with no ability, mono-type bonus, items, weather, matchup bonus or non-move upgrades. Population is still capped at eight by the default layer settings.

Simulation page: builds are validated against the selected Pokémon’s natural moves, starter exception, compatible TMs and available abilities (including hidden abilities or none). One to four unique moves and at most two status moves are allowed. Builds and shared Canvas Settings persist under a dedicated localStorage key; game saves are not accessed. JSON exports provide portable backups, and imports merge with existing builds without overwriting name/ID collisions. Compare checkboxes control which builds run. Settings changes and Restart comparisons reset selected previews. A shared starting random seed is passed to each isolated canvas; different move effects can still change subsequent random events. Pokémon combination recommendations link to a prefilled draft, which is only saved when Save build is clicked.

Each Pokémon combination recommendation has an Add to Simulation button. It opens the Simulation page, immediately saves the Pokémon, currently selected ability and four moves, and selects the saved build for comparison. Existing builds and canvas settings are retained. Identical Pokémon/ability/move sets reuse the saved build rather than duplicating it. Storage writes happen on the Simulation page so local-file browser storage works consistently.

Each move detail page includes a live single-move swarm simulation. The attacker is chosen from every eligible Pokémon (natural pool, starter exception and compatible TMs) by physical attack for physical moves or special attack for special moves, multiplied by 1.2 only for matching single-type users. Equal values use the lowest Pokédex number. Status moves use their relevant attack stat for attack buffs, otherwise the stronger stat; they deal no direct damage. The preview maxes/evolves only that move, has no ability, weather, items or run upgrades, and uses Hardy nature, neutral targets, 1,500 HP and 35 configured spawns/second with an eight-enemy cap. This live Pokémon-specific result is independent of the fixed neutral-attacker CSV value.

Build-comparison and recommendation canvases now default to 800 enemy HP, 15 spawns/second and a maximum of 20 living enemies. Max enemies is independent of stationary layer geometry and can be adjusted in Canvas Settings. Existing saved settings that exactly match the prior default HP/rate pair are migrated, while custom pairs are retained. Single-move pages remain at 200 HP; CSV benchmark results are unchanged.

Simulation builds now allow one to four unique moves (still at most two status moves). Save/load, import/export, build comparison and canvas playback support all four build sizes.

Current CSV benchmark uses the contact-penalized damage_score described above. It replaces the former raw-DPS score snapshot. Ordinary live preview defaults remain independent.

Canvas Settings on Pokémon recommendations and the Simulation page include Reset to defaults. Resetting preserves build selections/abilities and saved builds, restores canvas defaults, and restarts previews. Move-detail previews now read HP, spawn rate, maximum enemies, spawn arc, seed and contact-removal rule from the imported benchmark settings (currently 150 HP, 4/sec, 6 living enemies, contact penalties). They retain the strongest eligible Pokémon’s actual attack stats with no ability. Equal effective attack multipliers now prefer higher rarity, then lower Pokédex number.

Pokémon S–F ranking: `node helpful_tools/build-pokemon-rankings.cjs` generates pokemon-rankings.js using each Pokémon’s best estimated four-move damage score across all natural/compatible-TM moves and real regular/hidden abilities, with at most two status moves. Both attack categories and all families are eligible; The public Damage ranking requires Harden as one of the four moves for every Pokemon. Overall ranking independently compares Harden and no-Harden builds. Conditions are fixed to Hardy nature, full HP, no items/run upgrades, elapsed ability time 1,200 seconds, 1,000 kills, and ability-summoned weather. Tiers use competition-rank percentiles: S top 5%, A next 15%, B/C/D next 20% each, E next 15%, F bottom 5%. Equal scores share rank/tier. Pokémon cards show the grade and best score, catalogue filters/sorting support tiers/rank, and detail pages show the winning ability and combination. Grades reflect an additive offence estimate, not survival or measured merged-build output. Regenerate rankings after importing a new damage-score CSV or changing game/model data; source-hash tests detect stale snapshots.

English text coverage: english-text.js supplements the game’s English dictionary for all type-specific ability descriptions and generic secondary bonuses. PokéSurvivor Wiki pages load it after lang-en.js. Tests enumerate every Pokémon’s available ability effects, requiring English primary/secondary descriptions. Upstream game data and mechanics are unchanged.

Current simulation environments: the CSV benchmark and move-detail previews use 100 HP, 15 spawns/second and 25 maximum enemies, retaining the remaining-HP contact penalty. Recommendation/build previews default to 800 HP, 20 spawns/second and 30 maximum enemies. Reset buttons restore those values; untouched older build defaults migrate without changing saved builds or custom settings.

Pokémon now have four rankings. Damage ranking is the original best-move/ability score. Health score is game HP divided by the mean physical/special damage multiplier from Stats.taken (50/50 neutral incoming damage; no abilities, items or buffs). Speed score is base in-game movement speed, excluding abilities, items and buffs. Overall score is the weighted average of build damage (65%), build health (25%) and speed (10%) rank positions, choosing the better Harden/no-Harden build for every Pokemon; lower is better, and overall positions/tiers are assigned from that average. Cards and detail pages show all four, and the catalogue supports sorting and tier filtering for each. Highest first shows the best rank for every ranking, while Lowest first reverses it.

Recommendation ability default: on initial page load, compare the #1 estimated damage score for every actual regular/hidden ability under the initial recommendation filters and conditions, then select the highest. Ties retain the earlier ability slot. Manual ability changes remain selected when other settings change; the no-ability option is a comparison choice rather than an automatic default when real abilities exist.

Overall build selection: compare a Harden-required and Harden-excluded build for every Pokemon. Both use 65% damage rank, 25% health rank and 10% speed rank. No-Harden health is 65% of actual effective HP, ranked against the unchanged public health table (the temporary rank is not shown). Candidate damage scores are ranked against the unchanged public damage table. Pick the lower weighted score, preferring Harden on ties. Store the winner separately from public component rankings; show it under Best damage build, use its Harden requirement for recommendation defaults, and retain the Damage Reduction reminder for no-Harden winners.

Each Pokemon Best damage build includes a live canvas of the overall-winning build. It shares all Canvas Settings with recommendations (including reset), while retaining the ranked moves, ability and fixed ranking conditions. Recommendation ability/filter changes do not replace the ranked build.

No-Harden eligibility: only evaluate no-Harden overall builds when actual effective HP (before the no-Harden 65% adjustment) is at least 130. Below 130 HP, require Harden. Public component ranking rules remain unchanged.

Attack style filters treat both melee-family and spin-family moves as Melee in the move catalogue, TM finder and combination recommendations. This grouping does not change actual game ability rules or defensive bonuses.

Best move combinations remembers disabled move families in browser localStorage across Pokemon pages and reloads. Unseen families retain their saved choice; new families are enabled by default. Canvas Reset does not clear these preferences. Blocked or malformed storage falls back safely to all families enabled.

Melee attack style now includes melee, aura, dash, orbit, shove, spin, mine and trail families. All other damaging families are ranged; buffs remain status moves.

## Phone installation and ability reference

The wiki is a standalone PWA under `helpful_tools/`; its manifest and service worker use relative URLs for GitHub Pages project hosting. Open the published HTTPS site, then install using the Android browser menu or Safari’s Share → Add to Home Screen. The homepage also offers an install button when the browser supports it. Installation requires deployment; these local changes do not publish anything.

The service worker uses network-first caching for visited resources, with a clear offline fallback for pages not yet visited. It does not pre-download all game assets. Bump its cache version when changing the shell. The wiki worker only controls the wiki directory.

`abilities.html` lists the complete ability catalogue and its current Pokémon holders. Descriptions and move matches follow this game’s `ability-fx.js`, not main-series mechanics. Named move lists span all move stages and do not imply holder learnability. Technician uses original base hit damage <=12; Skill Link uses current stage count/bounce. Custom effects and the additional primary-type passive are listed separately.

Check the feature with `node --test helpful_tools/abilities.test.cjs`. Build to a fresh optional output directory with `node helpful_tools/build-site.cjs . <output-directory>`.

## Shared search, gacha and items

`navigation.cjs` owns the shared Reference / Tools / Mechanics navigation and global search header. Run `node helpful_tools/navigation.cjs` after changing it to refresh local HTML; deployment applies it automatically. Search loads its index on demand, supports accented or plain names and dex numbers, and links directly to Pokémon, moves, abilities, mechanic sections and items. The full search page adds category filters. Press `/` to focus search or Escape to close suggestions.

`build-reference-data.cjs` generates `search-index.json` and `reference-provenance.json` from the actual game sources. Run `node helpful_tools/build-reference-data.cjs` for local development. Deployment regenerates both against its pinned upstream checkout, including SHA-256 source fingerprints.

`gacha-model.js` tracks probability mass over pity counters and the current ten-pull's 4★+ flag, using `G.Gacha` rates and pools directly. It includes the 70th-pull pity, tenth-result guarantee, hundred-pull grouping, missing-rarity fallback and 1% / 2% shiny rates. It computes at-least-one probabilities and complete-ten-pull thresholds for 50%, 90% and 99%, up to 20,000 pulls. Shiny duplicate redirection and unlocking the Charm mid-budget depend on unimported collection state and are explicitly excluded; a normal target accepts either form. No save or account is accessed.

`items.html` / `items.js` cover all 11 held items and six Mystery Dungeon orbs, searchable by name and effect and filterable by kind or effect category. Drop notes include chest XP-drop side effects. Runtime sources are linked on each entry.

Ability holder lists show all three slots and initial probabilities before capsules. Hidden is 5% where present; normal slots share the remainder, or a sole normal slot receives it all. The combined filters support custom effects, any type passive, passive-only effects, normal slots and hidden slots.

Validation: `node --test helpful_tools/reference-features.test.cjs helpful_tools/abilities.test.cjs`. This includes an independent ten-pull formula, pity boundaries, all banner pools, a 12,000-run seeded comparison with actual game pulls, slot probabilities, search coverage and item/orb completeness. Shared search assets are included in service-worker cache v2.

### Local search and target lookup

Search now lazy-loads `search-index.js` (generated alongside the JSON index), so it works from `file://` previews without JSON fetch permissions. Its URL resolves relative to the search script and failed loads can be retried. Service-worker cache v3 includes the script index.

The gacha target lookup searches names or exact dex numbers across every banner, including zero-padded numbers and `#` prefixes. Selecting a suggestion updates the banner and target. The pity counter remains user-entered because each banner has its own counter; the lookup reminds users to check it after switching.

Held-item and orb headings include the game's own pixel-art sprites even while collapsed. The reference generator exports all 17 SVGs directly from `js/ui/icons.js` into `item-sprites/`, using `orb:<id>` palettes for orbs. Tests compare every generated sprite to its source definition.

### Live ability effects and compact pages

The requested introductory and repeated explanatory paragraphs have been removed from Pokémon details, abilities, items, gacha and simulation pages. Saved builds is an initially open native disclosure (`sim-saved-section`); its import/export, editing and comparison controls remain available when expanded.

Live Pokémon and saved-build previews now opt into full game ability profiles, including hit/status flags, contact reactions, kill hooks and timed hooks. They use a finite, isolated ability-condition state while the training actor remains invulnerable and stationary. Contact effects use the game's per-enemy contact cooldown; ability damage uses a baseline player level of 1. Loot hooks are harmless no-ops in training. None excludes all ability effects.

Automatic weather summoning is suppressed in live previews, including Drought, Drizzle, Sand Stream, Snow Warning and Orichalcum Pulse. Manually selected weather still applies. Single-move previews force ability and weather to none, so move pages remain ability-free. Ranking and combination-estimate policies are unchanged; their excluded effects should not be confused with the live preview's runtime effects.

## Phone layout

Screens up to 650px wide use `mobile.css` and the reversible `mobile-ui.js` presentation layer. At 651px and above the original desktop DOM and styles remain in use. Desktop screenshot baselines and layout measurements were checked on all 13 pages; resizing back from phone width also restores the original order and controls.

The phone header is 56px tall with expandable navigation/search. Pokémon pages use Overview / Builds / Moves / Abilities tabs, key stat cards, a recommended-build summary and ranking cards. Move tables become searchable cards; reference tables use labelled rows. Secondary filters and detailed mechanics collapse into disclosures. Item and ability references retain their original interactive filters and sprites. Native validation opens any collapsed options containing an invalid field.

Training iframes receive `data-mobile-src` on phones and do not load until Play simulation is expanded. Closing a preview stops it. Desktop preview loading remains unchanged. Deep links reveal the relevant tab/disclosure, and the presentation layer observes generated results so filtering and saved-build updates keep working. No game mechanics or ranking calculations are changed by the mobile layer.

Run `node --test helpful_tools/mobile-layout.test.cjs` with Playwright and Chrome available; `WIKI_BROWSER_CHANNEL` can select another Playwright browser channel. The tests cover desktop restoration, the breakpoint, tabs, deferred previews, search, filtering, gacha and deep links. The service-worker shell includes the new mobile assets in cache v4.
