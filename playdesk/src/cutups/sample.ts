import { toCsv } from './csv';

/**
 * A made-up game for trying Cutups without a real export. Columns use Hudl-style names.
 * Deterministic, so tests and screenshots are stable.
 */
export function sampleCsv(): string {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;

  const forms = ['Trips Rt', 'Trips Lt', 'Doubles', 'Ace', 'I Rt', 'Empty', 'Bunch Rt', 'Pistol'];
  const runs = ['Inside Zone', 'Outside Zone', 'Power', 'Counter', 'Jet Sweep', 'QB Draw'];
  const passes = ['Smash', 'Mesh', 'Stick', 'Four Verts', 'Y-Cross', 'Bubble', 'Slant-Flat'];
  const fronts = ['4-3 Over', '4-3 Under', '3-4', 'Nickel'];
  const coverages = ['Cover 2', 'Cover 3', 'Cover 1', 'Quarters'];
  const personnel: Record<string, string> = {
    'Trips Rt': '11',
    'Trips Lt': '11',
    Doubles: '10',
    Ace: '12',
    'I Rt': '21',
    Empty: '10',
    'Bunch Rt': '11',
    Pistol: '11',
  };

  const rows: (string | number)[][] = [
    [
      'PLAY #',
      'ODK',
      'QTR',
      'DN',
      'DIST',
      'YARD LN',
      'HASH',
      'PLAY TYPE',
      'RESULT',
      'GN/LS',
      'PERSONNEL',
      'OFF FORM',
      'OFF PLAY',
      'DEF FRONT',
      'COVERAGE',
    ],
  ];
  let yard = -25; // own 25
  let down = 1;
  let dist = 10;
  for (let n = 1; n <= 72; n++) {
    const qtr = Math.min(4, Math.ceil(n / 18));
    const passy = down >= 3 && dist >= 5 ? 0.75 : down === 1 ? 0.4 : 0.5;
    const isPass = rnd() < passy;
    const form = pick(isPass ? forms : forms.filter((f) => f !== 'Empty'));
    const play = isPass ? pick(passes) : pick(runs);
    const incomplete = isPass && rnd() < 0.35;
    const gain = incomplete
      ? 0
      : Math.round((isPass ? 4 : 2) + rnd() * (isPass ? 14 : 8) - (rnd() < 0.15 ? 6 : 0));
    const result = incomplete ? 'Incomplete' : isPass ? 'Complete' : 'Rush';
    rows.push([
      n,
      'O',
      qtr,
      down,
      dist,
      yard,
      pick(['L', 'M', 'R']),
      isPass ? 'Pass' : 'Run',
      result,
      gain,
      personnel[form]!,
      form,
      play,
      pick(fronts),
      pick(coverages),
    ]);
    // advance the series
    const toGoal = yard < 0 ? 100 + yard : yard;
    const next = Math.min(99, toGoal - gain);
    if (gain >= dist) {
      down = 1;
      dist = Math.min(10, next);
    } else {
      down += 1;
      dist -= gain;
    }
    if (next <= 0 || down > 4) {
      yard = -(20 + Math.floor(rnd() * 15)); // new drive
      down = 1;
      dist = 10;
    } else {
      yard = next > 50 ? -(100 - next) : next;
      if (yard === -50) yard = 50;
    }
  }
  return toCsv(rows);
}
