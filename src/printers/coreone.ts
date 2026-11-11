import { svg, type SVGTemplateResult } from 'lit';
import { box, frontQuad, lift, PALETTE, sideQuad, slide, topQuad, viewBox } from './iso';
import { bedSurface, printedObject, screen, toolhead, type DrawState } from './parts';

const BED_TOP = 96;
const MAX_OBJECT = 50;
const CENTER_X = 55;
const CENTER_Y = 55;
const GLASS = '#bfe3ff';

export const COREONE_VIEWBOX = viewBox(110, 110, 150);

// Enclosed CoreXY: toolhead moves on X/Y at the top, bed drops on Z.
export function drawCoreOne(d: DrawState): SVGTemplateResult {
  const objectHeight = d.objectFrac * MAX_OBJECT;
  return svg`
    ${box(0, 0, 0, 110, 110, 14, PALETTE.black)}
    ${frontQuad(0, 0, 9, 110, 3, PALETTE.orange.front)}
    ${box(0, 104, 14, 110, 6, 136, PALETTE.black)}
    ${box(0, 0, 14, 6, 104, 136, PALETTE.black)}
    ${box(0, 104, 144, 110, 6, 6, PALETTE.black)}
    ${box(0, 0, 144, 6, 110, 6, PALETTE.black)}
    ${box(14, 96, 14, 4, 4, 128, PALETTE.steel)}
    ${box(92, 96, 14, 4, 4, 128, PALETTE.steel)}
    ${box(8, 10, BED_TOP + 26, 4, 94, 3, PALETTE.steel)}

    <g class="lift" style=${lift(-objectHeight)}>
      ${box(16, 84, BED_TOP - 10, 4, 12, 4, PALETTE.black)}
      ${box(90, 84, BED_TOP - 10, 4, 12, 4, PALETTE.black)}
      ${bedSurface(15, 15, BED_TOP, 80, 80, d.bedGlow)}
      ${printedObject(CENTER_X, CENTER_Y, BED_TOP, 26, 22, objectHeight)}
    </g>

    <g class="anim anim-y" style=${slide('y', -12, 12)}>
      ${box(8, 64, BED_TOP + 14, 94, 6, 6, PALETTE.black)}
      ${box(6, 60, BED_TOP + 12, 10, 14, 12, PALETTE.orange)}
      <g class="anim anim-x" style=${slide('x', -14, 14)}>
        ${toolhead(CENTER_X, CENTER_Y, BED_TOP, d.nozzleGlow)}
      </g>
      ${box(94, 60, BED_TOP + 12, 10, 14, 12, PALETTE.orange)}
    </g>

    ${box(98, 10, BED_TOP + 26, 4, 94, 3, PALETTE.steel)}
    ${box(104, 0, 14, 6, 6, 136, PALETTE.black)}
    ${topQuad(6, 6, 150, 98, 98, GLASS, 'glass', 0.12)}
    ${box(104, 0, 144, 6, 110, 6, PALETTE.black)}
    ${box(0, 0, 144, 110, 6, 6, PALETTE.black)}
    ${sideQuad(110, 6, 14, 98, 130, GLASS, 'glass', 0.14)}
    ${frontQuad(6, 0, 14, 98, 130, GLASS, 'glass', 0.16)}
    ${box(96, -3, 60, 3, 3, 30, PALETTE.orange)}
    ${screen(10, -4, 1, 30, 12)}
  `;
}
