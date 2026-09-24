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
            <h2>Real field, real hashes</h2>
            <p>
              High school, college and NFL hash marks. Put the ball on either hash and your
              formation shifts with it.
            </p>
          </article>
          <article>
            <h2>Draw like a whiteboard</h2>
            <p>
              Routes, blocks and motion in a few clicks. Flip a play, undo anything, and snap
              players to the half-yard.
            </p>
          </article>
          <article>
            <h2>A playbook you can search</h2>
            <p>
              Folders, tags and search by name or formation. Back up your whole library to a single
              file.
            </p>
          </article>
          <article>
            <h2>Call sheets and wristbands</h2>
            <p>
              1, 2, 4 or 8 plays per page, numbered your way. Print them, or export a PDF or
              PowerPoint deck.
            </p>
          </article>
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
