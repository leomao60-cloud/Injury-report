import JSZip from 'jszip';
import type { FieldStyle, Play } from '../model';
import { DEFAULT_WINDOW } from '../render';
import {
  BRAND_FONTS,
  DEFAULT_BRANDING,
  offenseFill,
  textOn,
  type Branding,
} from '../library/branding';
import { downloadBlob, safeFilename } from './download';
import { diagramShapes, type Shape } from './shapes';

/**
 * Microsoft Visio (.vsdx) files, written directly as Open Packaging XML.
 * Each play is one page; players and lines are ordinary Visio shapes the coach can edit.
 */

const PAGE_W = 11;
const PAGE_H = 8.5;
const NS = 'http://schemas.microsoft.com/office/visio/2012/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.microsoft.com/visio/2010/relationships';

export interface VisioPage {
  name: string;
  play: Play;
  number?: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n: number) => (Math.round(n * 10000) / 10000).toString();
const cell = (n: string, v: string | number) =>
  `<Cell N="${n}" V="${typeof v === 'number' ? num(v) : esc(v)}"/>`;
const color = (hex: string) => `#${hex.replace('#', '').slice(0, 6).toLowerCase()}`;
const ptToIn = (pt: number) => pt / 72;

interface XfShape {
  id: number;
  name: string;
  cells: string[];
  sections: string[];
  text?: string;
}

function textSections(
  fontSize: number,
  colorHex: string,
  bold: boolean,
  face: string,
  align: 'left' | 'center' = 'center',
): string[] {
  return [
    `<Section N="Character"><Row IX="0">${cell('Font', face)}${cell('Color', color(colorHex))}${cell(
      'Size',
      ptToIn(fontSize),
    )}${cell('Style', bold ? 1 : 0)}</Row></Section>`,
    `<Section N="Paragraph"><Row IX="0">${cell('HorzAlign', align === 'left' ? 0 : 1)}</Row></Section>`,
  ];
}

const noMargins = [
  cell('LeftMargin', 0),
  cell('RightMargin', 0),
  cell('TopMargin', 0),
  cell('BottomMargin', 0),
  cell('VerticalAlign', 1),
];

/** Convert one of our shapes (inches, y down) into a Visio shape (inches, y up). */
function toVisio(s: Shape, id: number, face: string): XfShape {
  const Y = (y: number) => PAGE_H - y;
  if (s.kind === 'line') {
    const x1 = s.x1;
    const y1 = Y(s.y1);
    const x2 = s.x2;
    const y2 = Y(s.y2);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.max(Math.abs(x2 - x1), 0.001);
    const h = Math.max(Math.abs(y2 - y1), 0.001);
    return {
      id,
      name: s.name ?? 'Line',
      cells: [
        cell('PinX', minX + w / 2),
        cell('PinY', minY + h / 2),
        cell('Width', w),
        cell('Height', h),
        cell('LocPinX', w / 2),
        cell('LocPinY', h / 2),
        cell('LineColor', color(s.color)),
        cell('LineWeight', ptToIn(s.width)),
        cell('LinePattern', s.dash ? 2 : 1),
        cell('EndArrow', s.arrow ? 4 : 0),
        cell('EndArrowSize', 1),
        cell('LineCap', 1),
      ],
      sections: [
        `<Section N="Geometry" IX="0">${cell('NoFill', 1)}<Row T="MoveTo" IX="1">${cell('X', x1 - minX)}${cell(
          'Y',
          y1 - minY,
        )}</Row><Row T="LineTo" IX="2">${cell('X', x2 - minX)}${cell('Y', y2 - minY)}</Row></Section>`,
      ],
    };
  }

  const w = s.w;
  const h = s.h;
  const base = [
    cell('PinX', s.x + w / 2),
    cell('PinY', Y(s.y) - h / 2),
    cell('Width', w),
    cell('Height', h),
    cell('LocPinX', w / 2),
    cell('LocPinY', h / 2),
    ...noMargins,
  ];

  if (s.kind === 'text') {
    return {
      id,
      name: s.name ?? 'Text',
      cells: [...base, cell('LinePattern', 0), cell('FillPattern', 0)],
      sections: textSections(s.fontSize, s.color, Boolean(s.bold), face, s.align),
      text: s.text,
    };
  }

  const fill = s.fill
    ? [cell('FillForegnd', color(s.fill)), cell('FillPattern', 1)]
    : [cell('FillPattern', 0)];
  const line = s.stroke
    ? [
        cell('LineColor', color(s.stroke)),
        cell('LineWeight', ptToIn(s.strokeW ?? 0.75)),
        cell('LinePattern', 1),
      ]
    : [cell('LinePattern', 0)];
  const geometry =
    s.kind === 'ellipse'
      ? `<Section N="Geometry" IX="0"><Row T="Ellipse" IX="1">${cell('X', w / 2)}${cell('Y', h / 2)}${cell(
          'A',
          w,
        )}${cell('B', h / 2)}${cell('C', w / 2)}${cell('D', h)}</Row></Section>`
      : `<Section N="Geometry" IX="0"><Row T="MoveTo" IX="1">${cell('X', 0)}${cell('Y', 0)}</Row><Row T="LineTo" IX="2">${cell(
          'X',
          w,
        )}${cell('Y', 0)}</Row><Row T="LineTo" IX="3">${cell('X', w)}${cell('Y', h)}</Row><Row T="LineTo" IX="4">${cell(
          'X',
          0,
        )}${cell('Y', h)}</Row><Row T="LineTo" IX="5">${cell('X', 0)}${cell('Y', 0)}</Row></Section>`;
  return {
    id,
    name: s.name ?? (s.kind === 'ellipse' ? 'Ellipse' : 'Rectangle'),
    cells: [...base, ...fill, ...line],
    sections: [
      geometry,
      ...(s.text ? textSections(s.fontSize ?? 10, s.textColor ?? '111111', true, face) : []),
    ],
    text: s.text,
  };
}

function shapeXml(s: XfShape): string {
  return `<Shape ID="${s.id}" NameU="${esc(s.name)}.${s.id}" Name="${esc(s.name)}.${s.id}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">${s.cells.join('')}${s.sections.join('')}${s.text !== undefined ? `<Text>${esc(s.text)}</Text>` : ''}</Shape>`;
}

/** Everything on one page, as our neutral shapes: title bar plus the diagram. */
export function pageShapes(page: VisioPage, style: FieldStyle, branding: Branding): Shape[] {
  const shapes: Shape[] = [];
  let x = 0.4;
  if (page.number) {
    shapes.push({
      kind: 'rect',
      x,
      y: 0.3,
      w: 0.6,
      h: 0.5,
      fill: branding.primary.replace('#', ''),
      text: String(page.number),
      textColor: textOn(branding.primary).replace('#', ''),
      fontSize: 20,
      name: 'Call number',
    });
    x += 0.7;
  }
  const title = branding.teamName ? `${page.play.name}  ·  ${branding.teamName}` : page.play.name;
  shapes.push({
    kind: 'text',
    x,
    y: 0.3,
    w: PAGE_W - x - 0.4,
    h: 0.5,
    text: title,
    color: '111111',
    fontSize: 20,
    bold: true,
    align: 'left',
    name: 'Title',
  });
  return [
    ...shapes,
    ...diagramShapes(
      page.play,
      style,
      DEFAULT_WINDOW,
      { x: 0.4, y: 1, w: PAGE_W - 0.8, h: PAGE_H - 1.4 },
      offenseFill(branding),
    ),
  ];
}

function pageXml(page: VisioPage, style: FieldStyle, branding: Branding): string {
  const face = BRAND_FONTS[branding.font].office;
  const shapes = pageShapes(page, style, branding).map((s, i) => shapeXml(toVisio(s, i + 1, face)));
  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n<PageContents xmlns="${NS}" xmlns:r="${R_NS}" xml:space="preserve"><Shapes>${shapes.join('')}</Shapes></PageContents>`;
}

function uniqueNames(pages: VisioPage[]): string[] {
  const seen = new Map<string, number>();
  return pages.map((p) => {
    const base = (p.number ? `${p.number} ${p.name}` : p.name).slice(0, 60) || 'Play';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

const DOCUMENT_XML = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<VisioDocument xmlns="${NS}" xmlns:r="${R_NS}" xml:space="preserve"><DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0" DefaultGuideStyle="0"/><Colors/><FaceNames/><StyleSheets><StyleSheet ID="0" NameU="No Style" Name="No Style">${[
  cell('EnableLineProps', 1),
  cell('EnableFillProps', 1),
  cell('EnableTextProps', 1),
  cell('LineWeight', 0.01),
  cell('LineColor', '#000000'),
  cell('LinePattern', 1),
  cell('Rounding', 0),
  cell('LineCap', 0),
  cell('BeginArrow', 0),
  cell('EndArrow', 0),
  cell('BeginArrowSize', 2),
  cell('EndArrowSize', 2),
  cell('FillForegnd', '#ffffff'),
  cell('FillBkgnd', '#ffffff'),
  cell('FillPattern', 1),
  cell('LeftMargin', 0.05),
  cell('RightMargin', 0.05),
  cell('TopMargin', 0.05),
  cell('BottomMargin', 0.05),
  cell('VerticalAlign', 1),
].join(
  '',
)}<Section N="Character"><Row IX="0">${cell('Font', 'Arial')}${cell('Color', '#000000')}${cell('Size', 1 / 6)}${cell(
  'Style',
  0,
)}</Row></Section><Section N="Paragraph"><Row IX="0">${cell('HorzAlign', 1)}</Row></Section></StyleSheet></StyleSheets></VisioDocument>`;

export async function buildVsdx(
  pages: VisioPage[],
  style: FieldStyle = 'whiteboard',
  branding: Branding = DEFAULT_BRANDING,
): Promise<Blob> {
  const zip = new JSZip();
  const names = uniqueNames(pages);
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/><Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>${pages
      .map(
        (_, i) =>
          `<Override PartName="/visio/pages/page${i + 1}.xml" ContentType="application/vnd.ms-visio.page+xml"/>`,
      )
      .join(
        '',
      )}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/document" Target="visio/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(
      branding.teamName ? `${branding.teamName} playbook` : 'Playbook',
    )}</dc:title><dc:creator>Playdesk</dc:creator></cp:coreProperties>`,
  );
  zip.file('visio/document.xml', DOCUMENT_XML);
  zip.file(
    'visio/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/pages" Target="pages/pages.xml"/></Relationships>`,
  );
  zip.file(
    'visio/pages/pages.xml',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Pages xmlns="${NS}" xmlns:r="${R_NS}" xml:space="preserve">${names
      .map(
        (name, i) =>
          `<Page ID="${i}" NameU="${esc(name)}" Name="${esc(name)}"><PageSheet LineStyle="0" FillStyle="0" TextStyle="0">${cell(
            'PageWidth',
            PAGE_W,
          )}${cell('PageHeight', PAGE_H)}${cell('PageScale', 1)}${cell('DrawingScale', 1)}${cell(
            'DrawingSizeType',
            0,
          )}${cell('DrawingScaleType', 0)}${cell('PrintPageOrientation', 2)}</PageSheet><Rel r:id="rId${i + 1}"/></Page>`,
      )
      .join('')}</Pages>`,
  );
  zip.file(
    'visio/pages/_rels/pages.xml.rels',
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pages
      .map(
        (_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/page" Target="page${i + 1}.xml"/>`,
      )
      .join('')}</Relationships>`,
  );
  pages.forEach((p, i) => zip.file(`visio/pages/page${i + 1}.xml`, pageXml(p, style, branding)));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-visio.drawing',
    compression: 'DEFLATE',
  });
}

export async function exportVsdx(
  fileName: string,
  pages: VisioPage[],
  style: FieldStyle,
  branding: Branding,
) {
  downloadBlob(await buildVsdx(pages, style, branding), safeFilename(fileName, 'vsdx'));
}
