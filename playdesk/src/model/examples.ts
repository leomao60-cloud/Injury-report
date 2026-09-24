import { round } from './field';
import { addLine, createPlay, getPlayer } from './play';
import type { LineType, Play } from './types';

type Rel = [dx: number, dy: number];

/** Add a line using offsets from the start of the line (the player, or the end of his motion). */
function draw(play: Play, playerId: string, type: LineType, rel: Rel[]): Play {
  const p = getPlayer(play, playerId);
  if (!p) return play;
  const motion = play.lines.find((l) => l.playerId === playerId && l.type === 'motion');
  const start = type !== 'motion' && motion ? motion.points[motion.points.length - 1]! : p;
  return addLine(play, {
    playerId,
    type,
    points: rel.map(([dx, dy]) => ({ x: round(start.x + dx), y: round(start.y + dy) })),
  });
}

const PASS_PRO: Rel[] = [[0, -1]];

export function exampleSmash(): Play {
  let play = createPlay({ id: 'example-smash', name: 'Doubles Rt Smash', formation: 'doubles' });
  play = draw(play, 'z', 'route', [
    [0, 6],
    [-1, 4.5],
  ]);
  play = draw(play, 'y', 'route', [
    [0, 10],
    [5, 16],
  ]);
  play = draw(play, 'x', 'route', [
    [0, 12],
    [-3, 15],
  ]);
  play = draw(play, 'h', 'route', [
    [0, 7],
    [0.5, 12],
    [-1, 13],
  ]);
  play = draw(play, 'f', 'route', [
    [3, 1],
    [7, 3],
  ]);
  for (const id of ['lt', 'lg', 'c', 'rg', 'rt']) play = draw(play, id, 'block', PASS_PRO);
  return play;
}

export function exampleInsideZone(): Play {
  let play = createPlay({
    id: 'example-inside-zone',
    name: 'I-Rt Inside Zone',
    formation: 'i-rt',
    showDefense: true,
  });
  const blocks: [string, Rel[]][] = [
    ['lt', [[-0.5, 2]]],
    ['lg', [[0.3, 2]]],
    ['c', [[0.8, 2]]],
    ['rg', [[0.8, 2]]],
    ['rt', [[0.8, 2]]],
    ['y', [[0.8, 2]]],
  ];
  for (const [id, rel] of blocks) play = draw(play, id, 'block', rel);
  play = draw(play, 'h', 'block', [[-1.5, 4]]);
  play = draw(play, 'f', 'route', [
    [1.5, 4],
    [1.5, 9],
  ]);
  play = draw(play, 'x', 'route', [
    [0, 6],
    [-1, 7],
  ]);
  play = draw(play, 'z', 'block', [[-1, 6]]);
  return play;
}

export function exampleJetSweep(): Play {
  let play = createPlay({ id: 'example-jet', name: 'Trips Rt Jet Sweep', formation: 'trips-rt' });
  play = draw(play, 'z', 'motion', [[-16, -1]]);
  play = draw(play, 'z', 'route', [
    [-2, 0],
    [4, 1],
    [18, 3],
    [22, 10],
  ]);
  play = draw(play, 'h', 'block', [[1, 4]]);
  play = draw(play, 'y', 'block', [[1.5, 2]]);
  for (const id of ['lt', 'lg', 'c', 'rg', 'rt']) play = draw(play, id, 'block', [[1.5, 1.5]]);
  play = draw(play, 'x', 'route', [[0, 12]]);
  return play;
}

export const EXAMPLE_PLAYS: (() => Play)[] = [exampleSmash, exampleInsideZone, exampleJetSweep];
