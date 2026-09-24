import { BRAND_FONTS, offenseFill, textOn, type Branding } from '../library/branding';
import { PlayDiagram, SHEET_WINDOW } from '../render';
import { cellRects, pageSize, paginate, wristbandPanels } from './layout';
import { wristbandCalls, type NumberedPlay } from './resolve';
import type { SheetDoc } from './types';
import { SheetHeader } from './SheetHeader';
import styles from './SheetPages.module.css';

const inch = (n: number) => `${n}in`;

/**
 * Print-ready pages drawn from play data. Every size is in inches so the
 * browser prints at true size on US Letter.
 */
interface PagesProps {
  sheet: SheetDoc;
  calls: NumberedPlay[];
  branding: Branding;
}

export function SheetPages({ sheet, calls, branding }: PagesProps) {
  if (sheet.kind === 'wristband')
    return <WristbandPages sheet={sheet} calls={calls} branding={branding} />;
  const font = BRAND_FONTS[branding.font].css;
  const page = pageSize(sheet.orientation);
  const rects = cellRects(sheet.perPage, sheet.orientation);
  const pages = paginate(calls, sheet.perPage);
  return (
    <>
      {pages.map((items, pi) => (
        <section
          key={pi}
          className={styles.page}
          style={{ width: inch(page.w), height: inch(page.h) }}
          aria-label={`Page ${pi + 1}`}
        >
          <SheetHeader
            branding={branding}
            title={sheet.name}
            right={`Page ${pi + 1} of ${pages.length}`}
          />
          {items.map((item, i) => {
            const r = rects[i]!;
            const numberSize = Math.min(0.28, r.h * 0.09, r.w * 0.06);
            return (
              <div
                key={`${item.play.id}-${i}`}
                className={styles.cell}
                style={{ left: inch(r.x), top: inch(r.y), width: inch(r.w), height: inch(r.h) }}
                data-testid="sheet-cell"
              >
                <div
                  className={styles.cellTitle}
                  style={{ fontSize: inch(numberSize), fontFamily: font }}
                >
                  <span
                    className={styles.number}
                    style={{ background: branding.primary, color: textOn(branding.primary) }}
                  >
                    {item.number}
                  </span>
                  <span className={styles.playName}>{item.play.name}</span>
                </div>
                <PlayDiagram
                  play={item.play}
                  style="whiteboard"
                  window={SHEET_WINDOW}
                  numbers={false}
                  offenseFill={offenseFill(branding)}
                  className={styles.diagram}
                />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

function WristbandPages({ sheet, calls, branding }: PagesProps) {
  const page = pageSize('portrait');
  const { pages } = wristbandPanels(sheet.wristband);
  const { panels } = wristbandCalls(sheet, calls);
  const { rows, cols } = sheet.wristband;
  const rowH = sheet.wristband.panelHeightIn / rows;
  let panelIndex = 0;
  return (
    <>
      {pages.map((rects, pi) => (
        <section
          key={pi}
          className={styles.page}
          style={{ width: inch(page.w), height: inch(page.h) }}
          aria-label={`Wristband page ${pi + 1}`}
        >
          <SheetHeader
            branding={branding}
            title={`${sheet.name}: cut along the dashed lines`}
            right={`${sheet.wristband.panelWidthIn}″ × ${sheet.wristband.panelHeightIn}″`}
          />
          {rects.map((r) => {
            const idx = panelIndex++;
            const items = panels[idx] ?? [];
            return (
              <div
                key={idx}
                className={styles.panel}
                style={{
                  left: inch(r.x),
                  top: inch(r.y),
                  width: inch(r.w),
                  height: inch(r.h),
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gridAutoFlow: 'column',
                  fontSize: inch(Math.min(0.2, rowH * 0.5)),
                  fontFamily: BRAND_FONTS[branding.font].css,
                }}
                data-testid="wristband-panel"
              >
                {Array.from({ length: rows * cols }, (_, i) => {
                  const call = items[i];
                  return (
                    <div key={i} className={styles.call}>
                      {call && (
                        <>
                          <b style={{ color: branding.primary }}>{call.number}</b>{' '}
                          <span>{call.play.name}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
