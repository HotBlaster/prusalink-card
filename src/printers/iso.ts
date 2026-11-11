import { svg, type SVGTemplateResult } from 'lit';

const COS30 = Math.cos(Math.PI / 6);

type Axis = 'x' | 'y';

const AXIS_VECTORS: Record<Axis, readonly [number, number]> = {
  x: [COS30, 0.5],
  y: [COS30, -0.5],
};

export interface Shade {
  top: string;
  front: string;
  side: string;
}

export const PALETTE = {
  orange: { top: '#ff9a5c', front: '#ed6b21', side: '#c2541a' },
  black: { top: '#4b4e54', front: '#303237', side: '#232529' },
  steel: { top: '#dfe3e8', front: '#b1b7be', side: '#8c939b' },
  heatbed: { top: '#2b2d31', front: '#3a3d42', side: '#2b2d31' },
  sheet: { top: '#c8a65a', front: '#a3843f', side: '#836a32' },
  brass: { top: '#f0cf7a', front: '#d1ab4c', side: '#a88633' },
  filament: { top: '#6fd3e6', front: '#2fa9c4', side: '#1f8199' },
} satisfies Record<string, Shade>;

const round = (n: number): number => Math.round(n * 100) / 100;

// World axes: X left->right, Y front->back, Z up. Camera looks from front-right.
export function project(x: number, y: number, z: number): [number, number] {
  return [round((x + y) * COS30), round((x - y) * 0.5 - z)];
}

const pt = (x: number, y: number, z: number): string => project(x, y, z).join(',');

export function box(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  shade: Shade,
): SVGTemplateResult {
  const x2 = x + w;
  const y2 = y + d;
  const z2 = z + h;
  return svg`<g>
    <polygon fill=${shade.front} points=${`${pt(x, y, z)} ${pt(x2, y, z)} ${pt(x2, y, z2)} ${pt(x, y, z2)}`}></polygon>
    <polygon fill=${shade.side} points=${`${pt(x2, y, z)} ${pt(x2, y2, z)} ${pt(x2, y2, z2)} ${pt(x2, y, z2)}`}></polygon>
    <polygon fill=${shade.top} points=${`${pt(x, y, z2)} ${pt(x2, y, z2)} ${pt(x2, y2, z2)} ${pt(x, y2, z2)}`}></polygon>
  </g>`;
}

export function topQuad(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  fill: string,
  cls = '',
  opacity = 1,
): SVGTemplateResult {
  return svg`<polygon class=${cls} fill=${fill} fill-opacity=${opacity}
    points=${`${pt(x, y, z)} ${pt(x + w, y, z)} ${pt(x + w, y + d, z)} ${pt(x, y + d, z)}`}></polygon>`;
}

export function frontQuad(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  fill: string,
  cls = '',
  opacity = 1,
): SVGTemplateResult {
  return svg`<polygon class=${cls} fill=${fill} fill-opacity=${opacity}
    points=${`${pt(x, y, z)} ${pt(x + w, y, z)} ${pt(x + w, y, z + h)} ${pt(x, y, z + h)}`}></polygon>`;
}

export function sideQuad(
  x: number,
  y: number,
  z: number,
  d: number,
  h: number,
  fill: string,
  cls = '',
  opacity = 1,
): SVGTemplateResult {
  return svg`<polygon class=${cls} fill=${fill} fill-opacity=${opacity}
    points=${`${pt(x, y, z)} ${pt(x, y + d, z)} ${pt(x, y + d, z + h)} ${pt(x, y, z + h)}`}></polygon>`;
}

// Maps a local 2D drawing (u = world X, v = world Z) onto the front plane at (x, y, z).
export function frontPlaneMatrix(x: number, y: number, z: number): string {
  const [sx, sy] = project(x, y, z);
  return `matrix(${round(COS30)} 0.5 0 -1 ${sx} ${sy})`;
}

// CSS custom properties consumed by the plc-slide keyframes.
export function slide(axis: Axis, from: number, to: number): string {
  const [vx, vy] = AXIS_VECTORS[axis];
  return [
    `--from-x:${round(vx * from)}px`,
    `--from-y:${round(vy * from)}px`,
    `--to-x:${round(vx * to)}px`,
    `--to-y:${round(vy * to)}px`,
  ].join(';');
}

export function lift(z: number): string {
  return `transform:translate(0px,${round(-z)}px)`;
}

export function viewBox(sizeX: number, sizeY: number, sizeZ: number, pad = 6): string {
  const minX = -pad;
  const minY = -sizeY * 0.5 - sizeZ - pad;
  const width = (sizeX + sizeY) * COS30 + pad * 2;
  const height = sizeX * 0.5 + sizeY * 0.5 + sizeZ + pad * 2;
  return [minX, minY, width, height].map(round).join(' ');
}
