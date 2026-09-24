import type { FieldStyle, Play } from '../model';
import type { Branding } from '../library/branding';
import type { NumberedPlay } from '../sheets/resolve';
import { insertSlides } from './office';

/** Insert plays into the open presentation, one editable slide each. */
export async function insertPlaysIntoPowerPoint(
  calls: NumberedPlay[],
  style: FieldStyle,
  branding: Branding,
): Promise<void> {
  const { buildPlaysPptx, pptxBase64 } = await import('../export/pptx');
  await insertSlides(await pptxBase64(buildPlaysPptx(calls, style, branding)));
}

export async function insertPlayIntoPowerPoint(play: Play, style: FieldStyle, branding: Branding) {
  await insertPlaysIntoPowerPoint([{ number: 0, play }], style, branding);
}
