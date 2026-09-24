import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { exampleInsideZone, exampleJetSweep, exampleSmash } from '../model';
import { parsePlayFile, serializePlayFile } from '../library/playFile';
import { sanitizeBranding, DEFAULT_BRANDING } from '../library/branding';
import { buildVsdx, pageShapes } from './vsdx';

describe('play files', () => {
  it('round-trips a play through a file', () => {
    const play = exampleJetSweep();
    expect(parsePlayFile(JSON.parse(serializePlayFile(play)))).toEqual(play);
  });

  it('rejects other files', () => {
    expect(() => parsePlayFile({ app: 'playdesk', version: 1, plays: [] })).toThrow(
      /not a Playdesk play file/,
    );
    const bad = JSON.parse(serializePlayFile(exampleSmash()));
    bad.play.level = 'arena';
    expect(() => parsePlayFile(bad)).toThrow(/damaged/);
  });
});

describe('branding', () => {
  it('keeps good values and drops bad ones', () => {
    const b = sanitizeBranding({
      teamName: 'Eagles',
      primary: '#123456',
      secondary: 'red',
      font: 'comic',
      logo: 'data:image/svg+xml;base64,PHN2Zz4=',
      offenseInTeamColor: true,
    });
    expect(b).toEqual({
      ...DEFAULT_BRANDING,
      teamName: 'Eagles',
      primary: '#123456',
      offenseInTeamColor: true,
    });
  });

  it('accepts PNG logos', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    expect(sanitizeBranding({ logo }).logo).toBe(logo);
  });
});

describe('Visio export', () => {
  it('writes one page per play with every part Visio needs', async () => {
    const blob = await buildVsdx([
      { name: 'Smash', play: exampleSmash(), number: 12 },
      { name: 'Smash', play: exampleSmash() },
      { name: 'Zone', play: exampleInsideZone() },
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'visio/document.xml',
      'visio/_rels/document.xml.rels',
      'visio/pages/pages.xml',
      'visio/pages/_rels/pages.xml.rels',
      'visio/pages/page1.xml',
      'visio/pages/page3.xml',
    ]) {
      expect(zip.file(part), part).not.toBeNull();
    }
    const pages = await zip.file('visio/pages/pages.xml')!.async('string');
    expect(pages).toContain('Name="12 Smash"');
    expect(pages).toContain('Name="Smash"');
    expect(pages).toContain('Name="Zone"');
    const page1 = await zip.file('visio/pages/page1.xml')!.async('string');
    const shapeCount = (page1.match(/<Shape /g) ?? []).length;
    expect(shapeCount).toBe(
      pageShapes(
        { name: 'Smash', play: exampleSmash(), number: 12 },
        'whiteboard',
        DEFAULT_BRANDING,
      ).length,
    );
    expect(page1).toContain('<Cell N="EndArrow" V="4"/>');
    expect(page1).toContain('<Text>X</Text>');
  });

  it('escapes names', async () => {
    const play = { ...exampleSmash(), name: 'Q&A <Trips>' };
    const zip = await JSZip.loadAsync(
      await (await buildVsdx([{ name: play.name, play }])).arrayBuffer(),
    );
    const pages = await zip.file('visio/pages/pages.xml')!.async('string');
    expect(pages).toContain('Q&amp;A &lt;Trips&gt;');
  });
});
