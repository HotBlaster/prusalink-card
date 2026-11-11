import { svg, type SVGTemplateResult } from 'lit';
import { box, frontQuad, lift, PALETTE, project, slide, viewBox } from './iso';
import { bedSurface, printedObject, screen, toolhead, type DrawState } from './parts';

const BED_TOP = 96;
const MAX_OBJECT = 46;
const CENTER_X = 85;
const CENTER_Y = 75;
const BED = { x: 15, y: 15, w: 140, d: 120 };
const DOCKS = [22, 50, 78, 106, 134];

function line(a: [number, number], b: [number, number]): SVGTemplateResult {
  return svg`<line x1=${a[0]} y1=${a[1]} x2=${b[0]} y2=${b[1]}></line>`;
}

// The XL heatbed is split into 4x4 independently heated tiles.
function bedSegments(): SVGTemplateResult {
  const lines: SVGTemplateResult[] = [];
  for (let i = 1; i < 4; i++) {
    const x = BED.x + (BED.w / 4) * i;
    const y = BED.y + (BED.d / 4) * i;
    lines.push(line(project(x, BED.y, BED_TOP), project(x, BED.y + BED.d, BED_TOP)));
    lines.push(line(project(BED.x, y, BED_TOP), project(BED.x + BED.w, y, BED_TOP)));
  }
  return svg`<g class="bed-segments">${lines}</g>`;
}

function dock(x: number, parked: boolean): SVGTemplateResult {
  return svg`
    ${box(x - 1, 136, 104, 14, 4, 30, PALETTE.black)}
    ${parked
      ? svg`
        ${box(x + 4.5, 129.5, 106, 3, 3, 3, PALETTE.brass)}
        ${box(x, 124, 109, 12, 12, 20, PALETTE.orange)}
        ${box(x + 2, 126, 129, 8, 8, 4, PALETTE.black)}`
      : svg``}
  `;
}

export const XL_VIEWBOX = viewBox(170, 150, 150);

// Large open CoreXY toolchanger: toolhead moves on X/Y, bed drops on Z.
export function drawXl(d: DrawState): SVGTemplateResult {
  const objectHeight = d.objectFrac * MAX_OBJECT;
  return svg`
    ${box(0, 0, 0, 170, 150, 16, PALETTE.black)}
    ${frontQuad(0, 0, 10, 170, 3, PALETTE.orange.front)}
    ${box(0, 144, 16, 6, 6, 134, PALETTE.black)}
    ${box(0, 0, 16, 6, 6, 134, PALETTE.black)}
    ${box(0, 144, 144, 170, 6, 6, PALETTE.black)}
    ${box(0, 0, 144, 6, 150, 6, PALETTE.black)}
    ${box(164, 144, 16, 6, 6, 134, PALETTE.black)}
    ${box(12, 140, 132, 146, 4, 5, PALETTE.black)}
    ${DOCKS.map((x, i) => dock(x, i > 0))}
    ${box(20, 140, 16, 4, 4, 116, PALETTE.steel)}
    ${box(146, 140, 16, 4, 4, 116, PALETTE.steel)}
    ${box(8, 10, BED_TOP + 26, 4, 130, 3, PALETTE.steel)}

    <g class="lift" style=${lift(-objectHeight)}>
      ${box(22, 128, BED_TOP - 10, 4, 12, 4, PALETTE.black)}
      ${box(144, 128, BED_TOP - 10, 4, 12, 4, PALETTE.black)}
      ${bedSurface(BED.x, BED.y, BED_TOP, BED.w, BED.d, d.bedGlow)}
      ${bedSegments()}
      ${printedObject(CENTER_X, CENTER_Y, BED_TOP, 30, 24, objectHeight)}
    </g>

    <g class="anim anim-y" style=${slide('y', -14, 14)}>
      ${box(8, 84, BED_TOP + 14, 154, 6, 6, PALETTE.black)}
      ${box(6, 80, BED_TOP + 12, 12, 14, 12, PALETTE.orange)}
      <g class="anim anim-x" style=${slide('x', -18, 18)}>
        ${toolhead(CENTER_X, CENTER_Y, BED_TOP, d.nozzleGlow)}
      </g>
      ${box(152, 80, BED_TOP + 12, 12, 14, 12, PALETTE.orange)}
    </g>

    ${box(158, 10, BED_TOP + 26, 4, 130, 3, PALETTE.steel)}
    ${box(164, 0, 16, 6, 6, 134, PALETTE.black)}
    ${box(164, 0, 144, 6, 150, 6, PALETTE.black)}
    ${box(0, 0, 144, 170, 6, 6, PALETTE.black)}
    ${screen(70, -4, 2, 30, 12)}
  `;
}
