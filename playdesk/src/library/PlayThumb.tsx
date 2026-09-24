import { memo } from 'react';
import type { Play } from '../model';
import { PlayDiagram, THUMB_WINDOW } from '../render';

export const PlayThumb = memo(function PlayThumb({
  play,
  className,
}: {
  play: Play;
  className?: string;
}) {
  return (
    <PlayDiagram
      play={play}
      style="whiteboard"
      window={THUMB_WINDOW}
      numbers={false}
      className={className}
    />
  );
});
