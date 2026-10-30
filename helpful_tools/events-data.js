'use strict';
(function(root){const data={
  "sourceCommit": "12977c611201ed43ee46d892145e8d1450fa9173",
  "sourceHash": "8b788093828e46a5900a8a2d76bd4c334e027ce9bad0ea4e6c965cbd9a69877f",
  "events": [
    {
      "id": "halloween",
      "name": "Halloween: Spectral Night",
      "url": "halloween.html",
      "start": "2026-10-29T23:00:00Z",
      "end": "2026-11-02T23:00:00Z",
      "timeZone": "Europe/Madrid",
      "summary": "Collect candy, unlock permanent witch costumes, explore three spooky biomes and face the great Gengar."
    }
  ],
  "costumes": [
    {
      "id": "bruja-pikachu",
      "dex": 25,
      "name": "Witch Pikachu",
      "obtainable": true,
      "event": "halloween",
      "price": 300,
      "frame": {
        "w": 56,
        "h": 72,
        "n": 6,
        "r": 8
      },
      "shiny": true
    },
    {
      "id": "bruja-gengar",
      "dex": 94,
      "name": "Witch Gengar",
      "obtainable": true,
      "event": "halloween",
      "price": 300,
      "frame": {
        "w": 48,
        "h": 56,
        "n": 8,
        "r": 8
      },
      "shiny": true
    },
    {
      "id": "bruja-umbreon",
      "dex": 197,
      "name": "Witch Umbreon",
      "obtainable": true,
      "event": "halloween",
      "price": 300,
      "frame": {
        "w": 40,
        "h": 64,
        "n": 14,
        "r": 8
      },
      "shiny": true
    },
    {
      "id": "hat",
      "dex": 352,
      "name": "Witch Kecleon",
      "obtainable": false,
      "event": "halloween",
      "price": null,
      "frame": {
        "w": 48,
        "h": 64,
        "n": 4,
        "r": 8
      },
      "shiny": true
    }
  ],
  "gachaPool": [
    {
      "dex": 92,
      "name": "Gastly",
      "rarity": 1,
      "types": [
        "ghost",
        "poison"
      ],
      "frame": {
        "w": 48,
        "h": 56,
        "n": 6,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 23.5,
        "ay": 31.5
      }
    },
    {
      "dex": 93,
      "name": "Haunter",
      "rarity": 2,
      "types": [
        "ghost",
        "poison"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 4,
        "r": 8,
        "d": [
          14,
          8,
          14,
          8
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 94,
      "name": "Gengar",
      "rarity": 4,
      "types": [
        "ghost",
        "poison"
      ],
      "frame": {
        "w": 32,
        "h": 40,
        "n": 8,
        "r": 8,
        "d": [
          40,
          4,
          3,
          3,
          3,
          3,
          3,
          4
        ],
        "ax": 15.5,
        "ay": 23.5
      }
    },
    {
      "dex": 200,
      "name": "Misdreavus",
      "rarity": 3,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 48,
        "n": 8,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 11.5,
        "ay": 27.5
      }
    },
    {
      "dex": 292,
      "name": "Shedinja",
      "rarity": 1,
      "types": [
        "bug",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 12,
        "r": 8,
        "d": [
          8,
          4,
          4,
          4,
          4,
          8,
          8,
          4,
          4,
          4,
          4,
          8
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 302,
      "name": "Sableye",
      "rarity": 2,
      "types": [
        "dark",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 40,
        "n": 2,
        "r": 8,
        "d": [
          40,
          12
        ],
        "ax": 15.5,
        "ay": 23.5
      }
    },
    {
      "dex": 353,
      "name": "Shuppet",
      "rarity": 1,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 48,
        "n": 6,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 11.5,
        "ay": 27.5
      }
    },
    {
      "dex": 354,
      "name": "Banette",
      "rarity": 3,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 9,
        "r": 8,
        "d": [
          40,
          1,
          2,
          4,
          4,
          4,
          4,
          2,
          1
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 355,
      "name": "Duskull",
      "rarity": 1,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 6,
        "r": 8,
        "d": [
          24,
          8,
          8,
          24,
          8,
          8
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 356,
      "name": "Dusclops",
      "rarity": 3,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 4,
        "r": 8,
        "d": [
          40,
          8,
          12,
          8
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 425,
      "name": "Drifloon",
      "rarity": 2,
      "types": [
        "ghost",
        "flying"
      ],
      "frame": {
        "w": 24,
        "h": 64,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 11.5,
        "ay": 35.5
      }
    },
    {
      "dex": 426,
      "name": "Drifblim",
      "rarity": 4,
      "types": [
        "ghost",
        "flying"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 12,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 429,
      "name": "Mismagius",
      "rarity": 4,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 64,
        "n": 8,
        "r": 8,
        "d": [
          6,
          4,
          4,
          6,
          6,
          4,
          4,
          6
        ],
        "ax": 15.5,
        "ay": 35.5
      }
    },
    {
      "dex": 442,
      "name": "Spiritomb",
      "rarity": 3,
      "types": [
        "ghost",
        "dark"
      ],
      "frame": {
        "w": 32,
        "h": 40,
        "n": 3,
        "r": 8,
        "d": [
          8,
          8,
          8
        ],
        "ax": 15.5,
        "ay": 23.5
      }
    },
    {
      "dex": 477,
      "name": "Dusknoir",
      "rarity": 4,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 48,
        "h": 80,
        "n": 13,
        "r": 8,
        "d": [
          8,
          8,
          10,
          10,
          8,
          7,
          12,
          10,
          10,
          9,
          8,
          8,
          8
        ],
        "ax": 23.5,
        "ay": 43.5
      }
    },
    {
      "dex": 478,
      "name": "Froslass",
      "rarity": 3,
      "types": [
        "ice",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 14,
        "r": 8,
        "d": [
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6,
          6
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 479,
      "name": "Rotom",
      "rarity": 3,
      "types": [
        "electric",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 48,
        "n": 8,
        "r": 8,
        "d": [
          6,
          4,
          4,
          5,
          6,
          5,
          4,
          4
        ],
        "ax": 11.5,
        "ay": 27.5
      }
    },
    {
      "dex": 487,
      "name": "Giratina",
      "rarity": 5,
      "types": [
        "ghost",
        "dragon"
      ],
      "frame": {
        "w": 56,
        "h": 80,
        "n": 2,
        "r": 8,
        "d": [
          60,
          40
        ],
        "ax": 27.5,
        "ay": 43.5
      }
    },
    {
      "dex": 562,
      "name": "Yamask",
      "rarity": 1,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 563,
      "name": "Cofagrigus",
      "rarity": 3,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 4,
        "r": 8,
        "d": [
          15,
          15,
          15,
          15
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 607,
      "name": "Litwick",
      "rarity": 1,
      "types": [
        "ghost",
        "fire"
      ],
      "frame": {
        "w": 24,
        "h": 32,
        "n": 4,
        "r": 8,
        "d": [
          12,
          12,
          12,
          12
        ],
        "ax": 11.5,
        "ay": 19.5
      }
    },
    {
      "dex": 608,
      "name": "Lampent",
      "rarity": 2,
      "types": [
        "ghost",
        "fire"
      ],
      "frame": {
        "w": 32,
        "h": 40,
        "n": 8,
        "r": 8,
        "d": [
          8,
          8,
          8,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 15.5,
        "ay": 23.5
      }
    },
    {
      "dex": 609,
      "name": "Chandelure",
      "rarity": 4,
      "types": [
        "ghost",
        "fire"
      ],
      "frame": {
        "w": 40,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          6,
          6,
          6,
          12,
          8,
          8,
          8,
          8
        ],
        "ax": 19.5,
        "ay": 31.5
      }
    },
    {
      "dex": 622,
      "name": "Golett",
      "rarity": 1,
      "types": [
        "ground",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 5,
        "r": 8,
        "d": [
          56,
          2,
          6,
          2,
          20
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 623,
      "name": "Golurk",
      "rarity": 3,
      "types": [
        "ground",
        "ghost"
      ],
      "frame": {
        "w": 48,
        "h": 72,
        "n": 4,
        "r": 8,
        "d": [
          50,
          9,
          18,
          9
        ],
        "ax": 23.5,
        "ay": 39.5
      }
    },
    {
      "dex": 679,
      "name": "Honedge",
      "rarity": 2,
      "types": [
        "steel",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 680,
      "name": "Doublade",
      "rarity": 3,
      "types": [
        "steel",
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 681,
      "name": "Aegislash",
      "rarity": 4,
      "types": [
        "steel",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          12,
          10,
          9,
          9,
          12,
          10,
          9,
          9
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 708,
      "name": "Phantump",
      "rarity": 1,
      "types": [
        "ghost",
        "grass"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 6,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 709,
      "name": "Trevenant",
      "rarity": 3,
      "types": [
        "ghost",
        "grass"
      ],
      "frame": {
        "w": 40,
        "h": 56,
        "n": 10,
        "r": 8,
        "d": [
          40,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          12
        ],
        "ax": 19.5,
        "ay": 31.5
      }
    },
    {
      "dex": 710,
      "name": "Pumpkaboo",
      "rarity": 2,
      "types": [
        "ghost",
        "grass"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          8,
          6,
          6,
          6,
          8,
          6,
          6,
          6
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 711,
      "name": "Gourgeist",
      "rarity": 3,
      "types": [
        "ghost",
        "grass"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          12,
          12,
          12,
          12,
          12,
          12,
          12,
          12
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 720,
      "name": "Hoopa",
      "rarity": 5,
      "types": [
        "psychic",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 16,
        "r": 8,
        "d": [
          4,
          4,
          4,
          4,
          4,
          4,
          4,
          4,
          6,
          6,
          6,
          6,
          8,
          8,
          8,
          8
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 724,
      "name": "Decidueye",
      "rarity": 4,
      "types": [
        "grass",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 10,
        "r": 8,
        "d": [
          40,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          12
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 769,
      "name": "Sandygast",
      "rarity": 2,
      "types": [
        "ghost",
        "ground"
      ],
      "frame": {
        "w": 24,
        "h": 24,
        "n": 2,
        "r": 8,
        "d": [
          16,
          16
        ],
        "ax": 11.5,
        "ay": 15.5
      }
    },
    {
      "dex": 770,
      "name": "Palossand",
      "rarity": 3,
      "types": [
        "ghost",
        "ground"
      ],
      "frame": {
        "w": 40,
        "h": 32,
        "n": 4,
        "r": 8,
        "d": [
          30,
          16,
          12,
          16
        ],
        "ax": 19.5,
        "ay": 19.5
      }
    },
    {
      "dex": 778,
      "name": "Mimikyu",
      "rarity": 3,
      "types": [
        "ghost",
        "fairy"
      ],
      "frame": {
        "w": 32,
        "h": 48,
        "n": 4,
        "r": 8,
        "d": [
          40,
          6,
          6,
          6
        ],
        "ax": 15.5,
        "ay": 27.5
      }
    },
    {
      "dex": 781,
      "name": "Dhelmise",
      "rarity": 4,
      "types": [
        "ghost",
        "grass"
      ],
      "frame": {
        "w": 48,
        "h": 96,
        "n": 8,
        "r": 8,
        "d": [
          12,
          10,
          9,
          9,
          12,
          10,
          9,
          9
        ],
        "ax": 23.5,
        "ay": 51.5
      }
    },
    {
      "dex": 792,
      "name": "Lunala",
      "rarity": 5,
      "types": [
        "psychic",
        "ghost"
      ],
      "frame": {
        "w": 80,
        "h": 96,
        "n": 4,
        "r": 8,
        "d": [
          12,
          14,
          12,
          14
        ],
        "ax": 39.5,
        "ay": 51.5
      }
    },
    {
      "dex": 802,
      "name": "Marshadow",
      "rarity": 5,
      "types": [
        "fighting",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 40,
        "n": 7,
        "r": 8,
        "d": [
          6,
          6,
          6,
          6,
          6,
          6,
          6
        ],
        "ax": 11.5,
        "ay": 23.5
      }
    },
    {
      "dex": 806,
      "name": "Blacephalon",
      "rarity": 4,
      "types": [
        "fire",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 10,
        "r": 8,
        "d": [
          60,
          8,
          4,
          4,
          4,
          4,
          4,
          4,
          4,
          8
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    },
    {
      "dex": 854,
      "name": "Sinistea",
      "rarity": 1,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 40,
        "n": 8,
        "r": 8,
        "d": [
          10,
          10,
          6,
          6,
          10,
          10,
          6,
          6
        ],
        "ax": 11.5,
        "ay": 23.5
      }
    },
    {
      "dex": 855,
      "name": "Polteageist",
      "rarity": 4,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 40,
        "n": 5,
        "r": 8,
        "d": [
          14,
          18,
          14,
          18,
          14
        ],
        "ax": 11.5,
        "ay": 23.5
      }
    },
    {
      "dex": 864,
      "name": "Cursola",
      "rarity": 4,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 56,
        "n": 4,
        "r": 8,
        "d": [
          14,
          10,
          14,
          10
        ],
        "ax": 19.5,
        "ay": 31.5
      }
    },
    {
      "dex": 867,
      "name": "Runerigus",
      "rarity": 3,
      "types": [
        "ground",
        "ghost"
      ],
      "frame": {
        "w": 64,
        "h": 48,
        "n": 3,
        "r": 8,
        "d": [
          12,
          12,
          12
        ],
        "ax": 31.5,
        "ay": 27.5
      }
    },
    {
      "dex": 885,
      "name": "Dreepy",
      "rarity": 1,
      "types": [
        "dragon",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 40,
        "n": 8,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 11.5,
        "ay": 23.5
      }
    },
    {
      "dex": 886,
      "name": "Drakloak",
      "rarity": 3,
      "types": [
        "dragon",
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 8,
        "r": 8,
        "d": [
          6,
          6,
          6,
          12,
          8,
          8,
          8,
          8
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 887,
      "name": "Dragapult",
      "rarity": 5,
      "types": [
        "dragon",
        "ghost"
      ],
      "frame": {
        "w": 48,
        "h": 72,
        "n": 4,
        "r": 8,
        "d": [
          14,
          8,
          14,
          8
        ],
        "ax": 23.5,
        "ay": 39.5
      }
    },
    {
      "dex": 897,
      "name": "Spectrier",
      "rarity": 5,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 56,
        "n": 14,
        "r": 8,
        "d": [
          60,
          10,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          10
        ],
        "ax": 19.5,
        "ay": 31.5
      }
    },
    {
      "dex": 902,
      "name": "Basculegion",
      "rarity": 4,
      "types": [
        "water",
        "ghost"
      ],
      "frame": {
        "w": 56,
        "h": 72,
        "n": 6,
        "r": 8,
        "d": [
          12,
          12,
          12,
          12,
          12,
          12
        ],
        "ax": 27.5,
        "ay": 39.5
      }
    },
    {
      "dex": 911,
      "name": "Skeledirge",
      "rarity": 4,
      "types": [
        "fire",
        "ghost"
      ],
      "frame": {
        "w": 48,
        "h": 56,
        "n": 14,
        "r": 8,
        "d": [
          60,
          10,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          2,
          10
        ],
        "ax": 23.5,
        "ay": 31.5
      }
    },
    {
      "dex": 937,
      "name": "Ceruledge",
      "rarity": 4,
      "types": [
        "fire",
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 56,
        "n": 15,
        "r": 8,
        "d": [
          5,
          5,
          5,
          5,
          5,
          5,
          5,
          5,
          5,
          5,
          2,
          3,
          4,
          3,
          2
        ],
        "ax": 15.5,
        "ay": 31.5
      }
    },
    {
      "dex": 946,
      "name": "Bramblin",
      "rarity": 1,
      "types": [
        "grass",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 32,
        "n": 6,
        "r": 8,
        "d": [
          50,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 11.5,
        "ay": 19.5
      }
    },
    {
      "dex": 971,
      "name": "Greavard",
      "rarity": 1,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 32,
        "h": 32,
        "n": 4,
        "r": 8,
        "d": [
          12,
          16,
          12,
          16
        ],
        "ax": 15.5,
        "ay": 19.5
      }
    },
    {
      "dex": 972,
      "name": "Houndstone",
      "rarity": 3,
      "types": [
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 4,
        "r": 8,
        "d": [
          12,
          16,
          12,
          16
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 979,
      "name": "Annihilape",
      "rarity": 4,
      "types": [
        "fighting",
        "ghost"
      ],
      "frame": {
        "w": 48,
        "h": 72,
        "n": 3,
        "r": 8,
        "d": [
          12,
          12,
          12
        ],
        "ax": 23.5,
        "ay": 39.5
      }
    },
    {
      "dex": 987,
      "name": "Melenaleteo",
      "rarity": 4,
      "types": [
        "ghost",
        "fairy"
      ],
      "frame": {
        "w": 40,
        "h": 64,
        "n": 8,
        "r": 8,
        "d": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "ax": 19.5,
        "ay": 35.5
      }
    },
    {
      "dex": 1000,
      "name": "Gholdengo",
      "rarity": 4,
      "types": [
        "steel",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 64,
        "n": 7,
        "r": 8,
        "d": [
          40,
          1,
          2,
          4,
          2,
          2,
          1
        ],
        "ax": 11.5,
        "ay": 35.5
      }
    },
    {
      "dex": 1012,
      "name": "Poltchageist",
      "rarity": 1,
      "types": [
        "grass",
        "ghost"
      ],
      "frame": {
        "w": 40,
        "h": 48,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 19.5,
        "ay": 27.5
      }
    },
    {
      "dex": 1013,
      "name": "Sinistcha",
      "rarity": 4,
      "types": [
        "grass",
        "ghost"
      ],
      "frame": {
        "w": 24,
        "h": 56,
        "n": 8,
        "r": 8,
        "d": [
          10,
          8,
          8,
          8,
          10,
          8,
          8,
          8
        ],
        "ax": 11.5,
        "ay": 31.5
      }
    }
  ]
};if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.WikiEvents=data;})(typeof window!=='undefined'?window:globalThis);
