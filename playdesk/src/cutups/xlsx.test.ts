import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { breakdownFromRows, rowsOf } from './breakdown';
import { columnIndex, decodeXml, readXlsx, XlsxError } from './xlsx';

const fixture = new URL('../../e2e/fixtures/sample-breakdown.xlsx', import.meta.url);

describe('reading .xlsx', () => {
  it('reads a workbook saved by spreadsheet software (openpyxl)', async () => {
    const rows = await readXlsx(readFileSync(fixture));
    expect(rows[0]).toEqual([
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
      'OFF FORM',
      'OFF PLAY',
      'DEF FRONT',
      'COVERAGE',
    ]);
    expect(rows).toHaveLength(10); // header + 9 plays; the blank row is dropped
    expect(rows[1]).toEqual([
      '1',
      'O',
      '1',
      '1',
      '10',
      '-25',
      'L',
      'Run',
      'Rush',
      '4',
      'Trips Rt',
      'Inside Zone',
      '4-3 Over',
      'Cover 3',
    ]);
    expect(rows[6]![3]).toBe(''); // the punt has no down
    expect(rows[7]![11]).toBe('Counter & Pin');
    expect(rows[9]![11]).toBe('Iso Weak'); // rich text joined
  });

  it('feeds straight into a breakdown with columns matched', async () => {
    const b = breakdownFromRows(await readXlsx(readFileSync(fixture)), 'Week 1');
    const rows = rowsOf(b);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({
      down: 1,
      distance: 10,
      toGoal: 75,
      kind: 'Run',
      formation: 'Trips Rt',
      gain: 4,
    });
    expect(rows[5]).toMatchObject({ odk: 'K', down: null, kind: 'Other' });
  });

  it('handles inline strings, booleans, skipped columns, entities and errors', async () => {
    const zip = new JSZip();
    zip.file(
      'xl/workbook.xml',
      '<workbook><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>',
    );
    zip.file(
      'xl/_rels/workbook.xml.rels',
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    );
    zip.file(
      'xl/worksheets/sheet1.xml',
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>DN</t></is></c><c r="C1" t="inlineStr"><is><t>OFF FORM</t></is></c></row>
        <row r="3"><c r="A3"><v>3</v></c><c r="B3" t="b"><v>1</v></c><c r="C3" t="inlineStr"><is><t>Q&amp;A &lt;Trips&gt;</t></is></c><c r="D3" t="e"><v>#N/A</v></c></row>
      </sheetData></worksheet>`,
    );
    const rows = await readXlsx(await zip.generateAsync({ type: 'uint8array' }));
    expect(rows).toEqual([
      ['DN', '', 'OFF FORM', ''],
      ['3', 'TRUE', 'Q&A <Trips>', ''],
    ]);
  });

  it('rejects files that are not workbooks', async () => {
    await expect(readXlsx(new TextEncoder().encode('not a zip'))).rejects.toBeInstanceOf(XlsxError);
    const empty = await new JSZip().generateAsync({ type: 'uint8array' });
    await expect(readXlsx(empty)).rejects.toThrow(/no worksheets/);
  });

  it('decodes cell references and XML escapes', () => {
    expect([columnIndex('A1'), columnIndex('Z9'), columnIndex('AA1'), columnIndex('AB12')]).toEqual(
      [0, 25, 26, 27],
    );
    expect(decodeXml('&amp;&#38;&#x26;_x0041_')).toBe('&&&A');
  });
});
