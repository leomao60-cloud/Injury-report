import { useCallback, useRef, type PointerEvent } from 'react';
import {
  addLine,
  getPlayer,
  drawnPath,
  moveLinePoint,
  movePlayer,
  removeLine,
  removeLinesFor,
  snapToGrid,
  type Point,
} from '../model';
import { Field, PlayLineView, PlayerMarker, viewBoxFor, DEFAULT_WINDOW } from '../render';
import { TOOL_LINE_TYPE, useEditorStore } from '../store/editorStore';
import { usePlay, usePlayStore } from '../store/playStore';
import { describeSpot, draftStart, drawClick, type ClickTarget } from './drawing';
import { HINTS } from './hints';
import styles from './FieldEditor.module.css';

/** What is being dragged: a player, or one break point of a line. */
type DragState = { pointerId: number; grab: Point } & (
  { kind: 'player'; playerId: string } | { kind: 'point'; lineId: string; index: number }
);

export function FieldEditor() {
  const play = usePlay();
  const { tool, selection, draft, cursor, snap, fieldStyle } = useEditorStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<DragState | null>(null);
  const vb = viewBoxFor(DEFAULT_WINDOW);

  const toYards = useCallback((e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: -pt.y };
  }, []);

  const maybeSnap = useCallback((p: Point) => (snap ? snapToGrid(p) : p), [snap]);

  function targetOf(el: Element | null): ClickTarget {
    const playerEl = el?.closest('[data-player-id]');
    if (playerEl) {
      const player = getPlayer(play, playerEl.getAttribute('data-player-id')!);
      if (player) return { kind: 'player', player };
    }
    const lineEl = el?.closest('[data-line-id]');
    if (lineEl) {
      const line = play.lines.find((l) => l.id === lineEl.getAttribute('data-line-id'));
      if (line) return { kind: 'line', line };
    }
    return { kind: 'field' };
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const ed = useEditorStore.getState();
    const store = usePlayStore.getState();
    const target = targetOf(e.target as Element);
    const pos = toYards(e);

    if (tool === 'move') {
      const handle = (e.target as Element).closest('[data-handle-index]');
      if (handle && selection?.kind === 'line') {
        const index = Number(handle.getAttribute('data-handle-index'));
        const pt = play.lines.find((l) => l.id === selection.id)?.points[index];
        if (pt) {
          drag.current = {
            kind: 'point',
            lineId: selection.id,
            index,
            pointerId: e.pointerId,
            grab: { x: pos.x - pt.x, y: pos.y - pt.y },
          };
          svgRef.current?.setPointerCapture(e.pointerId);
          store.beginDrag();
        }
        return;
      }
      if (target.kind === 'player') {
        ed.select({ kind: 'player', id: target.player.id });
        drag.current = {
          kind: 'player',
          playerId: target.player.id,
          pointerId: e.pointerId,
          grab: { x: pos.x - target.player.x, y: pos.y - target.player.y },
        };
        svgRef.current?.setPointerCapture(e.pointerId);
        store.beginDrag();
      } else if (target.kind === 'line') {
        ed.select({ kind: 'line', id: target.line.id });
      } else {
        ed.select(null);
      }
      return;
    }

    if (tool === 'erase') {
      if (target.kind === 'line') {
        store.apply((p) => removeLine(p, target.line.id));
        if (selection?.id === target.line.id) ed.select(null);
      } else if (target.kind === 'player') {
        store.apply((p) => removeLinesFor(p, target.player.id));
      }
      return;
    }

    const type = TOOL_LINE_TYPE[tool];
    if (!type) return;
    e.preventDefault();
    const step = drawClick(play, draft, type, target, maybeSnap(pos));
    if (step.commit) {
      const c = step.commit;
      store.apply((p) => addLine(p, c));
    }
    ed.setDraft(step.draft);
    if (step.draft) ed.select({ kind: 'player', id: step.draft.playerId });
    ed.setCursor(pos);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const pos = toYards(e);
    const d = drag.current;
    if (d && d.pointerId === e.pointerId) {
      const to = maybeSnap({ x: pos.x - d.grab.x, y: pos.y - d.grab.y });
      usePlayStore
        .getState()
        .dragTo((p) =>
          d.kind === 'player'
            ? movePlayer(p, d.playerId, to)
            : moveLinePoint(p, d.lineId, d.index, to),
        );
      return;
    }
    if (draft) useEditorStore.getState().setCursor(maybeSnap(pos));
  }

  function endDrag(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (d && d.pointerId === e.pointerId) {
      drag.current = null;
      usePlayStore.getState().endDrag();
    }
  }

  // Readout: cursor while drawing, otherwise the selected player.
  let readout = '';
  if (draft && cursor) readout = describeSpot(play, cursor);
  else if (selection?.kind === 'player') {
    const p = getPlayer(play, selection.id);
    if (p) readout = `${p.label || 'Player'}: ${describeSpot(play, p)}`;
  }

  const draftPoints = draft ? [draftStart(play, draft), ...draft.points] : [];
  const previewFrom = draftPoints[draftPoints.length - 1];
  const previewSegment = draft && cursor && previewFrom ? { from: previewFrom, to: cursor } : null;
  const clickableLines = tool === 'move' || tool === 'erase';
  const selectedLine =
    selection?.kind === 'line' ? play.lines.find((l) => l.id === selection.id) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.fieldFrame}>
        <svg
          ref={svgRef}
          className={styles.svg}
          data-tool={tool}
          data-testid="field-editor"
          viewBox={vb.attr}
          preserveAspectRatio="xMidYMid meet"
          role="application"
          aria-label={`Play field for ${play.name}. ${HINTS[tool]}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => !drag.current && useEditorStore.getState().setCursor(null)}
        >
          <Field level={play.level} style={fieldStyle} />
          <g>
            {play.lines.map((line) => (
              <PlayLineView
                key={line.id}
                line={line}
                points={drawnPath(play, line)}
                type={line.type}
                color={line.color}
                style={fieldStyle}
                selected={selection?.kind === 'line' && selection.id === line.id}
                onPointerDown={clickableLines ? noop : undefined}
              />
            ))}
          </g>
          {draft && draftPoints.length > 1 && (
            <PlayLineView points={draftPoints} type={draft.type} style={fieldStyle} preview />
          )}
          {previewSegment && (
            <path
              d={`M${previewSegment.from.x} ${-previewSegment.from.y} L${previewSegment.to.x} ${-previewSegment.to.y}`}
              stroke={fieldStyle === 'turf' ? '#ffffff' : '#111111'}
              strokeWidth={0.18}
              strokeDasharray="0.5 0.4"
              opacity={0.7}
              pointerEvents="none"
              data-testid="preview-segment"
            />
          )}
          <g>
            {play.players.map((p) => (
              <PlayerMarker
                key={p.id}
                player={p}
                style={fieldStyle}
                interactive
                selected={selection?.kind === 'player' && selection.id === p.id}
              />
            ))}
          </g>
          {selectedLine && tool === 'move' && (
            <g data-testid="point-handles">
              {selectedLine.points.map((pt, i) => (
                <circle
                  key={i}
                  data-handle-index={i}
                  cx={pt.x}
                  cy={-pt.y}
                  r={0.55}
                  fill="#ff8a00"
                  stroke="#ffffff"
                  strokeWidth={0.15}
                  style={{ cursor: 'move' }}
                />
              ))}
            </g>
          )}
        </svg>
      </div>
      <div className={styles.status}>
        <p className={styles.hint} data-testid="hint">
          {draft
            ? HINTS.drawing
            : selectedLine && tool === 'move'
              ? HINTS.lineSelected
              : HINTS[tool]}
        </p>
        <p className={styles.readout} data-testid="readout" aria-live="polite">
          {readout}
        </p>
      </div>
    </div>
  );
}

// Lines only need a handler so the renderer adds a wide hit area; the svg handles the event.
function noop() {}
