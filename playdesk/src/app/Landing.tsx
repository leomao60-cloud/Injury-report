import type { MouseEvent } from 'react';
import { exampleSmash } from '../model';
import { PlayDiagram } from '../render';
import { navigate } from './router';
import styles from './Landing.module.css';

const hero = exampleSmash();

export function Landing() {
  const open = (e: MouseEvent) => {
    e.preventDefault();
    navigate('editor');
  };
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <span className={styles.brand}>
          <img src="/favicon.svg" alt="" width={28} height={28} />
          Playdesk
        </span>
        <a href="/app" className="btn btn-primary" onClick={open}>
          Open the editor
        </a>
      </header>

      <main>
        <section className={styles.hero}>
          <div>
            <h1>Draw plays fast. Print them clean.</h1>
            <p className={styles.lead}>
              Playdesk is a play designer for football coaches. Drag players into place, click to
              draw routes, blocks and motion, keep a searchable playbook, and print call sheets and
              QB wristbands that match your play numbers.
            </p>
            <a href="/app" className="btn btn-primary" onClick={open}>
              Start drawing, free
            </a>
            <p className="small muted">
              No sign-up. Works in any modern browser, including Chromebooks and iPads.
            </p>
          </div>
          <PlayDiagram
            play={hero}
            style="turf"
            className={styles.heroDiagram}
            title="Example play: Doubles Right Smash"
          />
        </section>

        <section className={styles.features} aria-label="Features">
          <article>
            <h2>Works with PowerPoint and Visio</h2>
            <p>
              Add Playdesk to PowerPoint and insert plays straight into your deck, or download .pptx
              and .vsdx files. Every player and route is a normal shape you can edit.
            </p>
          </article>
          <article>
            <h2>Standard, shareable files</h2>
            <p>
              Save plays as files, export your whole playbook to PowerPoint or Visio, or print a
              PDF. Share them the way you share any other file.
            </p>
          </article>
          <article>
            <h2>Diagrams that fit themselves</h2>
            <p>
              Call sheets, wristbands and slides are built from your plays, so every diagram is
              sized to its spot automatically: 1, 2, 4 or 8 to a page.
            </p>
          </article>
          <article>
            <h2>Your team’s look</h2>
            <p>
              Add your logo, team colors and font once. Every sheet, PDF, slide and Visio page uses
              them.
            </p>
          </article>
          <article>
            <h2>Move teams, keep your files</h2>
            <p>
              Plays live in your browser and in the files you save, not in someone else’s cloud, so
              they go wherever your coaching job takes you.
            </p>
          </article>
          <article>
            <h2>Draw like a whiteboard</h2>
            <p>
              Real HS, college and NFL hashes. Routes, blocks, motion and curves in a few clicks.
              Flip, undo, snap.
            </p>
          </article>
        </section>

        <section className={styles.privacy} aria-labelledby="powerpoint">
          <h2 id="powerpoint">Use Playdesk inside PowerPoint</h2>
          <ol className={styles.steps}>
            <li>
              Download the{' '}
              <a href="/office/manifest.xml" download="playdesk-manifest.xml">
                Playdesk add-in file
              </a>
              .
            </li>
            <li>
              In PowerPoint, go to{' '}
              <b>Home → Add-ins → More Add-ins → My Add-ins → Upload My Add-in</b> and choose that
              file. (Your school’s IT admin can also deploy it to every coach.)
            </li>
            <li>
              Click <b>Playdesk</b> on the Home tab. Draw or open a play and press{' '}
              <b>Insert into PowerPoint</b>.
            </li>
          </ol>
          <p>
            Visio: download plays as .vsdx from the editor, Library or Sheets and open them in
            Visio.
          </p>
        </section>

        <section className={styles.privacy} aria-labelledby="privacy">
          <h2 id="privacy">Your plays stay on your computer</h2>
          <p>
            For now, Playdesk keeps your plays and sheets in this browser’s storage on this device.
            Nothing is sent to a server, so there is no account to make, but clearing your browser’s
            site data will delete them. Use <b>Library → Export library</b> to keep a backup file,
            and import it on another computer.
          </p>
        </section>
      </main>
      <footer className={styles.footer}>
        <span className="small muted">© {new Date().getFullYear()} Playdesk</span>
      </footer>
    </div>
  );
}
