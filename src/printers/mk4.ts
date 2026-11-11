import { svg, type SVGTemplateResult } from 'lit';
import { box, lift, PALETTE, slide, viewBox } from './iso';
import { bedSurface, printedObject, screen, toolhead, type DrawState } from './parts';

const BED_TOP = 18;
const MAX_OBJECT = 42;
const CENTER_X = 60;
const CENTER_Y = 55;

export const MK4_VIEWBOX = viewBox(120, 110, 135);

// Bed-slinger: bed moves on Y, toolhead on X, gantry rises on Z.
export function drawMk4(d: DrawState): SVGTemplateResult {
  const objectHeight = d.objectFrac * MAX_OBJECT;
  return svg`
    ${box(14, 4, 0, 8, 102, 8, PALETTE.black)}
    ${box(98, 4, 0, 8, 102, 8, PALETTE.black)}
    ${box(10, 100, 0, 100, 8, 14, PALETTE.black)}
    ${box(4, 72, 0, 10, 10, 120, PALETTE.black)}
    ${box(4, 72, 120, 112, 10, 12, PALETTE.black)}

    <g class="anim anim-y" style=${slide('y', -10, 10)}>
      ${box(40, 24, 8, 40, 62, 4, PALETTE.steel)}
      ${bedSurface(19, 19, BED_TOP, 82, 72, d.bedGlow)}
      ${printedObject(CENTER_X, CENTER_Y, BED_TOP, 28, 24, objectHeight)}
    </g>

    <g class="lift" style=${lift(objectHeight)}>
      ${box(6, 62, 22, 14, 10, 26, PALETTE.orange)}
      ${box(14, 64, 40, 92, 6, 4, PALETTE.steel)}
      ${box(14, 64, 28, 92, 6, 4, PALETTE.steel)}
      <g class="anim anim-x" style=${slide('x', -16, 16)}>
        ${toolhead(CENTER_X, CENTER_Y, BED_TOP, d.nozzleGlow)}
      </g>
      ${box(100, 62, 22, 14, 10, 26, PALETTE.orange)}
    </g>

    ${box(106, 72, 0, 10, 10, 120, PALETTE.black)}
    ${box(10, 0, 0, 100, 6, 12, PALETTE.black)}
    ${screen(68, -4, 1, 30, 14)}
  `;
}
