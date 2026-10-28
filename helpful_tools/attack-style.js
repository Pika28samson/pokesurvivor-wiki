'use strict';
// Helpful Tools attack-style grouping; close-range and placed-effect families are melee regardless of damage category.
G.moveAttackStyle = move => move.kind === 'buff' ? 'status' : ['melee','aura','dash','orbit','shove','spin','mine','trail'].includes(move.kind) ? 'melee' : 'ranged';
