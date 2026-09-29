import { placeDefense } from './defense';
import { exampleInsideZone, exampleJetSweep, exampleSmash, draw, type Rel } from './examples';
import { ballXFor, round } from './field';
import { CUSTOM_FORMATION } from './formations';
import { newId } from './ids';
import { createPlay, getPlayer, keepInBounds, movePlayer, updatePlayer } from './play';
import type { DefenseId, FormationId, Level, Play, Player, PlayerShape, Side } from './types';

/**
 * Ready-made plays coaches start from: personnel groupings, scout looks, pass and run concepts,
 * special teams, 12-man and flag. Every template is built from play data by these functions.
 */
export type TemplateCategory =
  'personnel' | 'scout' | 'pass' | 'run' | 'special' | 'twelve' | 'flag';

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; blurb: string }[] = [
  {
    id: 'personnel',
    label: 'Personnel (O & D)',
    blurb: 'Offensive and defensive groupings, color-coded by position.',
  },
  {
    id: 'scout',
    label: 'Scout (O & D)',
    blurb: 'Offense and defense together, ready for scout cards.',
  },
  { id: 'pass', label: 'Pass Game', blurb: 'Common pass concepts drawn on their formations.' },
  { id: 'run', label: 'Run Game', blurb: 'Common run schemes with blocking.' },
  {
    id: 'special',
    label: 'Special Teams',
    blurb: 'Punt, punt return, kickoff, kick return and field goal units.',
  },
  {
    id: 'twelve',
    label: '12-Man',
    blurb: 'Canadian football: 12 players on a 65-yard-wide field.',
  },
  { id: 'flag', label: 'Flag', blurb: '5v5 flag football on a 30-yard-wide field.' },
];

export interface PlayTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** Library folder it is saved to. */
  folder: 'Offense' | 'Defense' | 'Special teams';
  build: () => Play;
}

/** Position colors used by the personnel templates. */
export const POSITION_COLORS = {
  WR: '#2563eb',
  TE: '#16a34a',
  RB: '#eab308',
  FB: '#dc2626',
  DL: '#dc2626',
  LB: '#b45309',
  DB: '#2563eb',
} as const;

// ---------- helpers ----------

const PASS_PRO: Rel[] = [[0, -1]];
const OL_IDS = ['lt', 'lg', 'c', 'rg', 'rt'];

function base(
  formation: FormationId,
  name: string,
  level: Level = 'hs',
  defense?: DefenseId,
): Play {
  const play = createPlay({ formation, name, level });
  return defense ? placeDefense(play, defense) : play;
}

function routes(play: Play, list: [id: string, rel: Rel[]][]): Play {
  return list.reduce((p, [id, rel]) => draw(p, id, 'route', rel), play);
}

function blocks(play: Play, list: [id: string, rel: Rel[]][]): Play {
  return list.reduce((p, [id, rel]) => draw(p, id, 'block', rel), play);
}

function passPro(play: Play, extra: string[] = []): Play {
  return blocks(
    play,
    [...OL_IDS, ...extra].map((id) => [id, PASS_PRO]),
  );
}

function colorPlayers(play: Play, colors: Record<string, string>): Play {
  return Object.entries(colors).reduce((p, [id, color]) => updatePlayer(p, id, { color }), play);
}

/** Color defenders by position group (line, backers, backs) from their ids. */
function colorDefense(play: Play): Play {
  return {
    ...play,
    players: play.players.map((p) => {
      if (p.side !== 'defense') return p;
      const group = /^(de|dt|nt)/.test(p.id) ? 'DL' : /^(lb|olb|ilb)/.test(p.id) ? 'LB' : 'DB';
      return { ...p, color: POSITION_COLORS[group] };
    }),
  };
}

function curve(play: Play, playerId: string): Play {
  return {
    ...play,
    lines: play.lines.map((l) =>
      l.playerId === playerId && l.type === 'route' ? { ...l, curved: true } : l,
    ),
  };
}

type Spot = [side: Side, id: string, label: string, dx: number, y: number, shape?: PlayerShape];

/** A play not based on a formation (special teams). */
function customPlay(name: string, spots: Spot[], level: Level = 'hs'): Play {
  const ballX = ballXFor(level, 'middle');
  const players: Player[] = spots.map(([side, id, label, dx, y, shape]) => ({
    id,
    side,
    label,
    shape: shape ?? (side === 'offense' ? 'circle' : 'letter'),
    x: round(ballX + dx),
    y,
  }));
  return keepInBounds({
    id: newId('play'),
    name,
    level,
    ballOn: 'middle',
    ballX,
    formation: CUSTOM_FORMATION,
    showDefense: spots.some(([side]) => side === 'defense'),
    players,
    lines: [],
  });
}

const fresh = (play: Play): Play => ({ ...play, id: newId('play') });

// ---------- personnel ----------

const WR = POSITION_COLORS.WR;
const TE = POSITION_COLORS.TE;
const RB = POSITION_COLORS.RB;
const FB = POSITION_COLORS.FB;

const personnel: PlayTemplate[] = [
  {
    id: 'p-10',
    name: '10 personnel',
    category: 'personnel',
    folder: 'Offense',
    description: '1 back, 0 tight ends, 4 receivers (Doubles).',
    build: () =>
      colorPlayers(base('doubles', '10 personnel'), { x: WR, h: WR, y: WR, z: WR, f: RB }),
  },
  {
    id: 'p-11',
    name: '11 personnel',
    category: 'personnel',
    folder: 'Offense',
    description: '1 back, 1 tight end, 3 receivers (Trey).',
    build: () =>
      colorPlayers(base('trey-rt', '11 personnel'), { x: WR, h: WR, z: WR, y: TE, f: RB }),
  },
  {
    id: 'p-12',
    name: '12 personnel',
    category: 'personnel',
    folder: 'Offense',
    description: '1 back, 2 tight ends, 2 receivers (Ace).',
    build: () => colorPlayers(base('ace', '12 personnel'), { x: WR, z: WR, y: TE, h: TE, f: RB }),
  },
  {
    id: 'p-21',
    name: '21 personnel',
    category: 'personnel',
    folder: 'Offense',
    description: '2 backs, 1 tight end, 2 receivers (I-formation).',
    build: () => colorPlayers(base('i-rt', '21 personnel'), { x: WR, z: WR, y: TE, h: FB, f: RB }),
  },
  {
    id: 'p-22',
    name: '22 personnel',
    category: 'personnel',
    folder: 'Offense',
    description: '2 backs, 2 tight ends, 1 receiver (Heavy I).',
    build: () => {
      let play = base('i-rt', '22 personnel');
      play = movePlayer(play, 'x', { x: play.ballX - 16, y: -2 });
      play = movePlayer(play, 'z', { x: play.ballX - 6, y: -1 });
      play = updatePlayer(play, 'z', { label: 'H' });
      return colorPlayers(play, { x: WR, z: TE, y: TE, h: FB, f: RB });
    },
  },
  ...(
    [
      ['p-43', 'Base 4-3', '43-cover2', 'doubles', '4 linemen, 3 linebackers, 4 defensive backs.'],
      ['p-34', 'Base 3-4', '34-cover3', 'pro-rt', '3 linemen, 4 linebackers, 4 defensive backs.'],
      [
        'p-nickel',
        'Nickel 4-2-5',
        '425-cover1',
        'trey-rt',
        '5 defensive backs for 3-receiver sets.',
      ],
      ['p-dime', 'Dime 4-1-6', '416-cover4', 'empty-3x2', '6 defensive backs for passing downs.'],
      [
        'p-goal',
        'Goal line 6-2',
        '62-goalline',
        'power-i',
        '6 linemen and 2 backers for short yardage.',
      ],
    ] as const
  ).map(([id, name, front, formation, description]): PlayTemplate => ({
    id,
    name,
    category: 'personnel',
    folder: 'Defense',
    description: `${description} Linemen red, backers brown, backs blue.`,
    build: () => colorDefense(base(formation, name, 'hs', front)),
  })),
];

// ---------- scout ----------

const scoutLooks: [id: string, formation: FormationId, front: DefenseId, name: string][] = [
  ['s-trips-43', 'trips-rt', '43-cover2', 'Trips Rt vs 4-3 Cover 2'],
  ['s-doubles-34', 'doubles', '34-cover3', 'Doubles vs 3-4 Cover 3'],
  ['s-empty-nickel', 'empty-3x2', '425-cover1', 'Empty 3x2 vs Nickel Cover 1'],
  ['s-bunch-dime', 'bunch-rt', '416-cover4', 'Bunch Rt vs Dime Quarters'],
  ['s-i-43', 'i-rt', '43-cover2', 'I-Rt vs 4-3'],
  ['s-pistol-nickel', 'pistol', '425-cover1', 'Pistol vs Nickel'],
  ['s-wingt-goal', 'wing-t', '62-goalline', 'Wing-T vs 6-2 Goal line'],
];

const scout: PlayTemplate[] = scoutLooks.map(([id, formation, front, name]) => ({
  id,
  name,
  category: 'scout',
  folder: 'Defense',
  description: 'Offense and defense lined up together, no assignments drawn.',
  build: () => base(formation, name, 'hs', front),
}));

// ---------- pass game ----------

const pass: PlayTemplate[] = [
  {
    id: 'pass-smash',
    name: 'Smash',
    category: 'pass',
    folder: 'Offense',
    description: 'Hitch under a corner route on both sides (Doubles).',
    build: () => fresh({ ...exampleSmash(), name: 'Doubles Smash' }),
  },
  {
    id: 'pass-verts',
    name: 'Four Verticals',
    category: 'pass',
    folder: 'Offense',
    description: 'Four receivers stretch the field; back checks down (Doubles).',
    build: () =>
      passPro(
        routes(base('doubles', 'Doubles Four Verts'), [
          ['x', [[0, 18]]],
          ['h', [[0, 6], [1.5, 18]]],
          ['y', [[0, 6], [-1.5, 18]]],
          ['z', [[0, 18]]],
          ['f', [[3, 1], [5, 4]]],
        ]),
      ),
  },
  {
    id: 'pass-mesh',
    name: 'Mesh',
    category: 'pass',
    folder: 'Offense',
    description: 'Two shallow crossers rub underneath a dig and a post (Doubles).',
    build: () =>
      passPro(
        routes(base('doubles', 'Doubles Mesh'), [
          ['h', [[3, 2], [20, 2.5]]],
          ['y', [[-3, 3], [-20, 3.5]]],
          ['x', [[0, 12], [8, 12]]],
          ['z', [[0, 10], [-5, 17]]],
          ['f', [[-4, 1], [-8, 5]]],
        ]),
      ),
  },
  {
    id: 'pass-stick',
    name: 'Stick',
    category: 'pass',
    folder: 'Offense',
    description: 'Stick at 6, flat and fade to the trips side (Trips Right).',
    build: () =>
      passPro(
        routes(base('trips-rt', 'Trips Stick'), [
          ['y', [[0, 6], [1.5, 6]]],
          ['h', [[2, 1], [7, 2]]],
          ['z', [[1, 6], [1, 18]]],
          ['x', [[0, 3], [4, 7]]],
          ['f', [[-3, 1], [-6, 2]]],
        ]),
      ),
  },
  {
    id: 'pass-flood',
    name: 'Flood (Sail)',
    category: 'pass',
    folder: 'Offense',
    description: 'Go, deep out and flat stretch one side (Trips Right).',
    build: () =>
      passPro(
        routes(base('trips-rt', 'Trips Flood'), [
          ['z', [[0, 18]]],
          ['h', [[0, 10], [5, 12]]],
          ['y', [[3, 1], [9, 2]]],
          ['x', [[0, 12], [9, 12]]],
        ]),
        ['f'],
      ),
  },
  {
    id: 'pass-ycross',
    name: 'Y-Cross',
    category: 'pass',
    folder: 'Offense',
    description: 'Tight end crosses deep under a post, with a curl and a checkdown (Trey).',
    build: () =>
      passPro(
        routes(base('trey-rt', 'Trey Y-Cross'), [
          ['y', [[0, 6], [-6, 10], [-18, 14]]],
          ['z', [[0, 10], [-4, 16]]],
          ['h', [[0, 5], [3, 6]]],
          ['x', [[0, 14], [1, 12]]],
          ['f', [[-3, 2], [-2, 4]]],
        ]),
      ),
  },
  {
    id: 'pass-slant-flat',
    name: 'Slant-Flat',
    category: 'pass',
    folder: 'Offense',
    description: 'Quick game: slant outside, flat inside, both sides (Doubles).',
    build: () =>
      passPro(
        routes(base('doubles', 'Doubles Slant-Flat'), [
          ['x', [[0, 3], [4, 7]]],
          ['h', [[-3, 1], [-7, 2]]],
          ['z', [[0, 3], [-4, 7]]],
          ['y', [[3, 1], [7, 2]]],
        ]),
        ['f'],
      ),
  },
  {
    id: 'pass-curl-flat',
    name: 'Curl-Flat',
    category: 'pass',
    folder: 'Offense',
    description: 'Curl at 12 over a flat route, both sides (Doubles).',
    build: () =>
      passPro(
        routes(base('doubles', 'Doubles Curl-Flat'), [
          ['x', [[0, 12], [1, 10.5]]],
          ['h', [[-3, 1], [-7, 2]]],
          ['z', [[0, 12], [-1, 10.5]]],
          ['y', [[3, 1], [7, 2]]],
        ]),
        ['f'],
      ),
  },
  {
    id: 'pass-bubble',
    name: 'Bubble Screen',
    category: 'pass',
    folder: 'Offense',
    description: 'Slot bubbles behind the line; outside receivers block (Trips Right).',
    build: () => {
      let play = base('trips-rt', 'Trips Bubble', 'hs', '43-cover2');
      play = curve(
        routes(play, [
          ['h', [[-1, -1.5], [3, -1.5], [6, 0]]],
        ]),
        'h',
      );
      const cb = getPlayer(play, 'cb-r')!;
      const nb = getPlayer(play, 'lb-s')!;
      play = blocks(play, [
        ['z', [[cb.x - getPlayer(play, 'z')!.x, cb.y - getPlayer(play, 'z')!.y]]],
        ['y', [[nb.x - getPlayer(play, 'y')!.x, nb.y - getPlayer(play, 'y')!.y]]],
      ]);
      return passPro(play);
    },
  },
];

// ---------- run game ----------

const run: PlayTemplate[] = [
  {
    id: 'run-iz',
    name: 'Inside Zone',
    category: 'run',
    folder: 'Offense',
    description: 'Line steps playside together; back reads the first down lineman (I-Right).',
    build: () => fresh({ ...exampleInsideZone(), name: 'I-Rt Inside Zone' }),
  },
  {
    id: 'run-oz',
    name: 'Outside Zone',
    category: 'run',
    folder: 'Offense',
    description: 'Everyone reaches playside; back aims outside the tight end (Pistol).',
    build: () => {
      const play = blocks(base('pistol', 'Pistol Outside Zone'), [
        ...OL_IDS.map((id): [string, Rel[]] => [
          id,
          [[1.5, 0.5], [2.5, 1.5]],
        ]),
        ['y', [[1.5, 0.5], [3, 1.5]]],
        ['z', [[-1, 6]]],
        ['h', [[3, 1], [6, 6]]],
      ]);
      return curve(
        routes(play, [
          ['f', [[3, 2], [9, 5], [11, 10]]],
        ]),
        'f',
      );
    },
  },
  {
    id: 'run-power',
    name: 'Power',
    category: 'run',
    folder: 'Offense',
    description:
      'Down blocks, fullback kicks out, backside guard pulls through the hole (I-Right).',
    build: () => {
      let play = blocks(base('i-rt', 'I-Rt Power'), [
        ['rt', [[-1, 1.5]]],
        ['rg', [[-1, 1.5]]],
        ['c', [[-1, 1.5]]],
        ['lt', [[-0.5, 1.5]]],
        ['y', [[-1.2, 1.5]]],
        ['h', [[7, 1]]],
        ['lg', [[0.5, -1], [5.5, -1], [7, 2.5]]],
      ]);
      play = routes(play, [
        ['f', [[1, 2], [5, 6], [6, 11]]],
      ]);
      return routes(play, [
        ['x', [[0, 8], [-1, 9]]],
        ['z', [[0, 10]]],
      ]);
    },
  },
  {
    id: 'run-counter',
    name: 'Counter (GT)',
    category: 'run',
    folder: 'Offense',
    description: 'Back steps away, then follows the pulling guard and tackle (Ace).',
    build: () => {
      let play = blocks(base('ace', 'Ace Counter GT'), [
        ['rt', [[-1, 1.5]]],
        ['rg', [[-1, 1.5]]],
        ['c', [[-1, 1.5]]],
        ['y', [[-1.2, 1.5]]],
        ['h', [[-1, 1.5]]],
        ['lg', [[0.5, -1.5], [6, -1.5], [8, 1]]],
        ['lt', [[0.5, -2.5], [7, -2.5], [9, 3]]],
      ]);
      play = routes(play, [
        ['f', [[-1.5, 0.5], [2, 3], [7, 7], [8, 12]]],
      ]);
      return curve(play, 'f');
    },
  },
  {
    id: 'run-iso',
    name: 'Iso',
    category: 'run',
    folder: 'Offense',
    description: 'Fullback isolates the linebacker; tailback follows him in (I-Right).',
    build: () => {
      let play = base('i-rt', 'I-Rt Iso', 'hs', '43-cover2');
      const mike = getPlayer(play, 'lb-m')!;
      const fb = getPlayer(play, 'h')!;
      play = blocks(play, [
        ['lt', [[0.5, 2]]],
        ['lg', [[0.5, 2]]],
        ['c', [[-0.5, 2]]],
        ['rg', [[0.5, 2]]],
        ['rt', [[0.5, 2]]],
        ['y', [[0.5, 2]]],
        ['h', [[mike.x - fb.x, mike.y - fb.y]]],
      ]);
      return routes(play, [
        ['f', [[1, 3], [1.5, 10]]],
      ]);
    },
  },
  {
    id: 'run-toss',
    name: 'Toss Sweep',
    category: 'run',
    folder: 'Offense',
    description: 'Line reaches, fullback leads outside, tailback bounces to the edge (I-Right).',
    build: () => {
      let play = blocks(base('i-rt', 'I-Rt Toss'), [
        ...OL_IDS.map((id): [string, Rel[]] => [id, [[2, 1]]]),
        ['y', [[2, 1.5]]],
        ['h', [[7, 2], [9, 5]]],
        ['z', [[-1, 6]]],
      ]);
      play = routes(play, [
        ['f', [[6, 0], [12, 3], [13, 11]]],
      ]);
      return curve(play, 'f');
    },
  },
  {
    id: 'run-jet',
    name: 'Jet Sweep',
    category: 'run',
    folder: 'Offense',
    description: 'Receiver in full-speed motion takes the handoff to the edge (Trips Right).',
    build: () => fresh({ ...exampleJetSweep(), name: 'Trips Jet Sweep' }),
  },
];

// ---------- special teams ----------

const PUNT_TEAM: Spot[] = [
  ['offense', 'ls', 'LS', 0, -1, 'square'],
  ['offense', 'g-l', 'G', -2, -1],
  ['offense', 'g-r', 'G', 2, -1],
  ['offense', 't-l', 'T', -4, -1],
  ['offense', 't-r', 'T', 4, -1],
  ['offense', 'w-l', 'W', -5.5, -2.5],
  ['offense', 'w-r', 'W', 5.5, -2.5],
  ['offense', 'gun-l', 'GL', -20, -1],
  ['offense', 'gun-r', 'GR', 20, -1],
  ['offense', 'pp', 'PP', -1.5, -7],
  ['offense', 'p', 'P', 0, -14],
];

const FG_TEAM: Spot[] = [
  ['offense', 'ls', 'LS', 0, -1, 'square'],
  ['offense', 'g-l', 'G', -1.5, -1],
  ['offense', 'g-r', 'G', 1.5, -1],
  ['offense', 't-l', 'T', -3, -1],
  ['offense', 't-r', 'T', 3, -1],
  ['offense', 'e-l', 'E', -4.5, -1],
  ['offense', 'e-r', 'E', 4.5, -1],
  ['offense', 'w-l', 'W', -5.5, -2],
  ['offense', 'w-r', 'W', 5.5, -2],
  ['offense', 'h', 'H', 0, -7],
  ['offense', 'k', 'K', -1.5, -9.5],
];

const special: PlayTemplate[] = [
  {
    id: 'st-punt',
    name: 'Spread Punt',
    category: 'special',
    folder: 'Special teams',
    description: 'Long snapper, guards, tackles and wings protect; gunners release to cover.',
    build: () => {
      let play = customPlay('Spread Punt', PUNT_TEAM);
      play = routes(play, [
        ['gun-l', [[2, 20]]],
        ['gun-r', [[-2, 20]]],
      ]);
      return blocks(play, [
        ...['ls', 'g-l', 'g-r', 't-l', 't-r'].map((id): [string, Rel[]] => [id, [[0, -1]]]),
        ['w-l', [[-0.5, -1]]],
        ['w-r', [[0.5, -1]]],
      ]);
    },
  },
  {
    id: 'st-punt-return',
    name: 'Punt Return',
    category: 'special',
    folder: 'Special teams',
    description: 'Two jammers on each gunner, five at the line, a returner and a safety deep.',
    build: () => {
      const returnTeam: Spot[] = [
        ['defense', 'j1', 'J', -21, 1],
        ['defense', 'j2', 'J', -19, 3],
        ['defense', 'j3', 'J', 19, 3],
        ['defense', 'j4', 'J', 21, 1],
        ['defense', 'r1', '1', -4, 1],
        ['defense', 'r2', '2', -2, 1],
        ['defense', 'r3', '3', 0.5, 1],
        ['defense', 'r4', '4', 2.5, 1],
        ['defense', 'r5', '5', 4.5, 1],
        ['defense', 'up', 'U', 0, 12],
        ['defense', 'pr', 'R', 0, 22],
      ];
      return customPlay('Punt Return', [...PUNT_TEAM, ...returnTeam]);
    },
  },
  {
    id: 'st-kickoff',
    name: 'Kickoff',
    category: 'special',
    folder: 'Special teams',
    description: 'Five on each side of the kicker, each covering his own lane.',
    build: () => {
      const lanes = [-23, -18, -13, -8, -4, 4, 8, 13, 18, 23];
      const spots: Spot[] = lanes.map((dx, i) => [
        'offense',
        `k${i + 1}`,
        i < 5 ? `L${5 - i}` : `R${i - 4}`,
        dx,
        -1,
      ]);
      let play = customPlay('Kickoff', [...spots, ['offense', 'k', 'K', -1, -6]]);
      play = routes(
        play,
        lanes.map((dx, i): [string, Rel[]] => [`k${i + 1}`, [[-dx * 0.25, 20]]]),
      );
      return routes(play, [
        ['k', [[1, 5], [1, 14]]],
      ]);
    },
  },
  {
    id: 'st-kick-return',
    name: 'Kickoff Return',
    category: 'special',
    folder: 'Special teams',
    description: 'Front five and middle four set a wall up the middle for the returner.',
    build: () => {
      const returnTeam: Spot[] = [
        ['offense', 'f1', '1', -14, -1],
        ['offense', 'f2', '2', -6, -1],
        ['offense', 'f3', '3', 0, -1],
        ['offense', 'f4', '4', 6, -1],
        ['offense', 'f5', '5', 14, -1],
        ['offense', 'm1', '6', -12, -8],
        ['offense', 'm2', '7', -4, -8],
        ['offense', 'm3', '8', 4, -8],
        ['offense', 'm4', '9', 12, -8],
        ['offense', 'up', 'U', 0, -12],
        ['offense', 'kr', 'R', 0, -15],
      ];
      const kickTeam: Spot[] = [-23, -18, -13, -8, -4, 4, 8, 13, 18, 23].map((dx, i): Spot => [
        'defense',
        `c${i + 1}`,
        'X',
        dx,
        11,
      ]);
      let play = customPlay('Kickoff Return', [
        ...returnTeam,
        ...kickTeam,
        ['defense', 'k', 'K', -1, 16],
      ]);
      play = blocks(play, [
        ['f1', [[2, 8]]],
        ['f2', [[1, 8]]],
        ['f3', [[0, 8]]],
        ['f4', [[-1, 8]]],
        ['f5', [[-2, 8]]],
        ['m1', [[5, 12]]],
        ['m2', [[1, 12]]],
        ['m3', [[-1, 12]]],
        ['m4', [[-5, 12]]],
        ['up', [[0, 9]]],
      ]);
      return routes(play, [
        ['kr', [[0, 10], [1, 22]]],
      ]);
    },
  },
  {
    id: 'st-fg',
    name: 'Field Goal / PAT',
    category: 'special',
    folder: 'Special teams',
    description: 'Tight splits, wings outside the ends, holder at 7, kicker offset.',
    build: () =>
      blocks(customPlay('Field Goal', FG_TEAM), [
        ...['ls', 'g-l', 'g-r', 't-l', 't-r', 'e-l', 'e-r'].map((id): [string, Rel[]] => [
          id,
          [[0, -0.8]],
        ]),
        ['w-l', [[0.3, -1]]],
        ['w-r', [[-0.3, -1]]],
      ]),
  },
  {
    id: 'st-fg-block',
    name: 'Field Goal Block',
    category: 'special',
    folder: 'Special teams',
    description:
      'Nine rush from the line; edges come off the corner at the spot. Two stay back for fakes.',
    build: () => {
      const blockTeam: Spot[] = [
        ['defense', 'b1', 'E', -7, 1],
        ['defense', 'b2', 'T', -4, 1],
        ['defense', 'b3', 'T', -2, 1],
        ['defense', 'b4', 'N', -0.6, 1],
        ['defense', 'b5', 'N', 0.9, 1],
        ['defense', 'b6', 'T', 2.5, 1],
        ['defense', 'b7', 'T', 4, 1],
        ['defense', 'b8', 'E', 7, 1],
        ['defense', 'b9', 'L', 3, 3],
        ['defense', 's1', 'S', -10, 7],
        ['defense', 's2', 'S', 10, 7],
      ];
      const play = customPlay('Field Goal Block', [...FG_TEAM, ...blockTeam]);
      const holder = getPlayer(play, 'h')!;
      return routes(play, [
        ['b1', [[holder.x - getPlayer(play, 'b1')!.x, holder.y - 1]]],
        ['b8', [[holder.x - getPlayer(play, 'b8')!.x, holder.y - 1]]],
      ]);
    },
  },
];

// ---------- 12-man ----------

const twelve: PlayTemplate[] = [
  {
    id: '12-spread-look',
    name: '12-man Spread vs 4-3',
    category: 'twelve',
    folder: 'Defense',
    description: 'Five receivers against four down, three backers, halfbacks over the slots.',
    build: () => base('cfl-spread', '12-man Spread vs 4-3', 'cfl', 'cfl-43'),
  },
  {
    id: '12-flood',
    name: '12-man Trips Flood',
    category: 'twelve',
    folder: 'Offense',
    description: 'Go, deep out and flat to the trips side on the wide field.',
    build: () =>
      passPro(
        routes(base('cfl-trips', '12-man Trips Flood', 'cfl'), [
          ['z', [[0, 18]]],
          ['h', [[0, 10], [6, 12]]],
          ['y', [[3, 1], [10, 2]]],
          ['x', [[0, 12], [10, 12]]],
          ['a', [[0, 14], [-3, 18]]],
        ]),
        ['f'],
      ),
  },
  {
    id: '12-waggle',
    name: '12-man Waggle Motion',
    category: 'twelve',
    folder: 'Offense',
    description:
      'Canadian rules let backs move forward before the snap: slotback waggles into his route.',
    build: () => {
      let play = base('cfl-spread', '12-man Waggle', 'cfl');
      play = draw(play, 'a', 'motion', [[5, 0.8]]);
      play = routes(play, [
        ['a', [[2, 8], [8, 14]]],
        ['h', [[0, 12], [-2, 18]]],
        ['x', [[0, 5], [-1, 4]]],
        ['y', [[0, 10], [-6, 12]]],
        ['z', [[0, 18]]],
      ]);
      return passPro(play, ['f']);
    },
  },
  {
    id: '12-iz',
    name: '12-man Inside Zone',
    category: 'twelve',
    folder: 'Offense',
    description: 'Zone run from the Pro set with a tight end.',
    build: () => {
      const play = blocks(base('cfl-pro', '12-man Inside Zone', 'cfl'), [
        ...OL_IDS.map((id): [string, Rel[]] => [id, [[0.8, 2]]]),
        ['y', [[0.8, 2]]],
      ]);
      return routes(play, [
        ['f', [[1.5, 3], [1.5, 9]]],
      ]);
    },
  },
];

// ---------- flag ----------

const flag: PlayTemplate[] = [
  {
    id: 'flag-mesh',
    name: 'Flag Mesh',
    category: 'flag',
    folder: 'Offense',
    description: 'Two drags cross under a go route (Spread 2x1).',
    build: () =>
      routes(base('flag-2x1', 'Flag Mesh', 'flag'), [
        ['x', [[2, 3], [16, 3.5]]],
        ['y', [[-2, 4], [-16, 4.5]]],
        ['z', [[0, 15]]],
        ['c', [[0, 6], [2, 8]]],
      ]),
  },
  {
    id: 'flag-flood',
    name: 'Flag Flood',
    category: 'flag',
    folder: 'Offense',
    description: 'High, middle and low routes to one side (Trips Right).',
    build: () =>
      routes(base('flag-trips', 'Flag Flood', 'flag'), [
        ['z', [[0, 15]]],
        ['x', [[0, 8], [3, 9]]],
        ['y', [[3, 1], [7, 2]]],
        ['c', [[0, 5], [-4, 7]]],
      ]),
  },
  {
    id: 'flag-stack',
    name: 'Flag Stack Release',
    category: 'flag',
    folder: 'Offense',
    description: 'Front receiver goes out, back receiver comes underneath (Stack Right).',
    build: () =>
      routes(base('flag-stack', 'Flag Stack', 'flag'), [
        ['y', [[0, 6], [3, 6]]],
        ['z', [[-1, 4], [-5, 6]]],
        ['x', [[0, 12], [3, 15]]],
        ['c', [[0, 4]]],
      ]),
  },
  {
    id: 'flag-snag',
    name: 'Flag Snag',
    category: 'flag',
    folder: 'Offense',
    description: 'Snag, corner and flat from the bunch (Bunch Right).',
    build: () =>
      routes(base('flag-bunch', 'Flag Snag', 'flag'), [
        ['y', [[0, 5], [-1.5, 4.5]]],
        ['z', [[0.5, 6], [4, 11]]],
        ['x', [[3, 0.5], [9, 1]]],
        ['c', [[0, 8]]],
      ]),
  },
  {
    id: 'flag-zone-look',
    name: 'Flag 2x1 vs 2-2 Zone',
    category: 'flag',
    folder: 'Defense',
    description: 'One rusher from 7 yards, two underneath, two deep.',
    build: () => base('flag-2x1', 'Flag vs Zone', 'flag', 'flag-zone'),
  },
  {
    id: 'flag-man-look',
    name: 'Flag Trips vs Man',
    category: 'flag',
    folder: 'Defense',
    description: 'One rusher, a defender over each eligible receiver.',
    build: () => base('flag-trips', 'Flag vs Man', 'flag', 'flag-man'),
  },
];

export const TEMPLATES: PlayTemplate[] = [
  ...personnel,
  ...scout,
  ...pass,
  ...run,
  ...special,
  ...twelve,
  ...flag,
];

export function templatesIn(category: TemplateCategory): PlayTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/** A new play from a template, with a fresh id so it never overwrites a saved play. */
export function playFromTemplate(t: PlayTemplate): Play {
  return { ...t.build(), id: newId('play') };
}
