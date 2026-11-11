import { svg, type SVGTemplateResult } from 'lit';
import { box, frontPlaneMatrix, frontQuad, PALETTE, project, topQuad } from './iso';

export interface DrawState {
  objectFrac: number;
  nozzleGlow: number;
  bedGlow: number;
}

const FAN_BLADES = [0, 72, 144, 216, 288];

export function fan(cx: number, y: number, cz: number, r: number): SVGTemplateResult {
  const blade = `M0 0 C ${r * 0.25} ${r * 0.3} ${r * 0.7} ${r * 0.45} ${r * 0.88} ${r * 0.15} Z`;
  return svg`<g transform=${frontPlaneMatrix(cx, y, cz)}>
    <circle r=${r} fill="#1b1c1f"></circle>
    <g class="fan-blades">
      ${FAN_BLADES.map((a) => svg`<path d=${blade} fill="#5b6067" transform=${`rotate(${a})`}></path>`)}
    </g>
    <circle r=${r * 0.25} fill="#ed6b21"></circle>
  </g>`;
}

// Nextruder-like toolhead with the nozzle tip at (cx, cy, zTip).
export function toolhead(cx: number, cy: number, zTip: number, glow: number): SVGTemplateResult {
  const [gx, gy] = project(cx, cy, zTip);
  return svg`
    ${box(cx - 1.5, cy - 1.5, zTip, 3, 3, 2, PALETTE.brass)}
    ${box(cx - 4, cy - 4, zTip + 2, 8, 8, 4, PALETTE.steel)}
    <ellipse cx=${gx} cy=${gy} rx="9" ry="5" fill="url(#plc-glow)" opacity=${glow}></ellipse>
    ${box(cx - 10, cy - 9, zTip + 6, 20, 18, 26, PALETTE.orange)}
    ${box(cx - 6, cy - 7, zTip + 32, 12, 12, 7, PALETTE.black)}
    ${fan(cx, cy - 9, zTip + 19, 7)}
  `;
}

export function bedSurface(
  x: number,
  y: number,
  zTop: number,
  w: number,
  d: number,
  glow: number,
): SVGTemplateResult {
  return svg`
    ${box(x - 1, y - 1, zTop - 6, w + 2, d + 2, 4, PALETTE.heatbed)}
    ${box(x, y, zTop - 2, w, d, 2, PALETTE.sheet)}
    ${topQuad(x, y, zTop, w, d, '#ff4d1f', 'bed-heat', glow * 0.5)}
  `;
}

export function printedObject(
  cx: number,
  cy: number,
  zBase: number,
  w: number,
  d: number,
  h: number,
): SVGTemplateResult {
  if (h < 0.3) return svg``;
  const x = cx - w / 2;
  const y = cy - d / 2;
  return svg`
    ${box(x, y, zBase, w, d, h, PALETTE.filament)}
    ${topQuad(x, y, zBase + h, w, d, '#ffffff', 'fresh-layer', 0)}
  `;
}

export function screen(x: number, y: number, z: number, w: number, h: number): SVGTemplateResult {
  return svg`
    ${box(x, y, z, w, 4, h, PALETTE.black)}
    ${frontQuad(x + 2, y, z + 2, w - 4, h - 4, '#2f6db5', 'screen')}
  `;
}
