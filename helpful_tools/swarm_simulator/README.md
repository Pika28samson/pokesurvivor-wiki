# Standalone move damage-score simulator

Run from the repository folder with Node.js 18+ (no browser, server or packages required):

```powershell
node helpful_tools/swarm_simulator/run.cjs --neutral --enemy-hp 100 --spawn-rate 15 --max-enemies 25
node helpful_tools/import-move-dps.cjs
```

The first command simulates every move separately and writes `results/move-dps.csv` and `results/move-dps.json`. The second refreshes the website's score snapshot. Existing output files are replaced after a successful run. Use `--help` for all options, `--list` for move IDs, `--moves ember,harden` for a subset, and `--out PATH` for a different output directory.

## Benchmark rules

- Enemy HP: **100**. Configured arrivals: **15 per second**. At most **25 living enemies**; arrivals pause at the cap.
- Enemies spawn offscreen using the game camera rule and walk towards a stationary, invulnerable player.
- On player contact, an enemy's **remaining HP is subtracted** from the running damage total and that enemy is removed. This is not counted as a kill. An already killed enemy incurs no penalty. Contact is checked as enemies reach the player, before that frame's attacks, and again after combat effects that can move enemies.
- With `--neutral`, physical and special attack are exactly ×1, with no mono-type bonus, ability, items, weather, matchup bonuses or other upgrades. Nature is Hardy. The Pokémon's sprite/collision geometry remains the default Pikachu geometry.
- Each move is maxed and evolved where available. Status moves are included; they have no raw damage but can receive negative scores from contact penalties.
- **30 seconds warm-up**, then **120 measured seconds**, **60 simulation updates/second**, **seed 42**, one trial per move. Warm-up damage and penalties are excluded.
- The shared preview combat engine runs headlessly. Other website canvases keep their existing rules; the contact-penalty option is enabled only for this benchmark.

## Output fields

```text
total_damage = raw_damage - contact_penalty
damage_score = total_damage / measured seconds
raw_dps = raw_damage / measured seconds
```

The former `total_dps` column is now **`damage_score`**. Scores can be negative and are not clamped to zero. CSV values display two decimals; JSON retains full precision and individual trial results.

`contact_penalty` is the sum of remaining HP at contact; `contact_removals` counts those enemies. `kills` counts only enemies defeated by damage. Raw HP damage excludes overkill. Damage taken by the player is not simulated.

`average_dps_per_enemy` remains raw damage divided by accumulated living-enemy seconds, including offscreen arrivals. `average_damage_score_per_enemy` uses net damage after penalties with the same denominator. The JSON's final-15-second DPS metrics are raw live-preview metrics, not penalized scores.

Multiple trials use consecutive seeds. Aggregated scores divide pooled net damage by pooled measured time; per-enemy metrics use pooled enemy exposure. Every move gets the same seed set, though its effects can change subsequent random events.

## Configuration

`--enemy-hp`, `--spawn-rate`, `--max-enemies`, `--arc`, `--duration`, `--warmup`, `--fps`, `--seed` and `--trials` adjust the benchmark. `--no-contact-penalty` disables the contact rule for a raw-DPS reference run. Without `--neutral`, `--pokemon`, `--ability`, `--weather`, `--elapsed` and `--kills` control the original Pokémon-specific preview conditions. Layer/distance layout options do not determine this swarm's population or spawn distance.

This is a neutral training swarm, not the full game's timed wave population. It uses game combat/projectile code and the preview's movement/status rules. Passive ability tick/contact damage remains excluded. Burn uses the preview's level-1 scaling, and poison uses configured maximum HP. The JSON report records settings, metric definitions, source hashes and limitations.

Website move scores import `damage_score` exactly at the measured maximum stage. Combination estimates scale the raw damage component for the chosen Pokémon and buffs while retaining the benchmark contact penalty; they do not measure a merged build. Live canvas DPS is separate.

```powershell
node --test helpful_tools/swarm_simulator/run.test.cjs
```
