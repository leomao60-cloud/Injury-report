import type { Branding } from '../library/branding';
import { BRAND_FONTS } from '../library/branding';
import styles from './SheetPages.module.css';

/** Top of every printed page: logo, team name, sheet name and page number, in team colors. */
export function SheetHeader({
  branding,
  title,
  right,
}: {
  branding: Branding;
  title: string;
  right: string;
}) {
  return (
    <header
      className={styles.pageHeader}
      style={{ fontFamily: BRAND_FONTS[branding.font].css, borderBottomColor: branding.primary }}
    >
      {branding.logo && <img src={branding.logo} alt="" className={styles.logo} />}
      <span className={styles.headerText}>
        {branding.teamName && <b style={{ color: branding.primary }}>{branding.teamName}</b>}
        <span>{title}</span>
      </span>
      <span>{right}</span>
    </header>
  );
}
