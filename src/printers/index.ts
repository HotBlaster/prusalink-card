import { html, svg, type SVGTemplateResult, type TemplateResult } from 'lit';
import type { PrinterModel } from '../const';
import { MODEL_LABELS } from '../const';
import type { PrinterViewModel } from '../state';
import { COREONE_VIEWBOX, drawCoreOne } from './coreone';
import { drawMk4, MK4_VIEWBOX } from './mk4';
import type { DrawState } from './parts';
import { drawXl, XL_VIEWBOX } from './xl';

export { printerStyles } from './styles';

const PRINTERS: Record<PrinterModel, { viewBox: string; draw: (d: DrawState) => SVGTemplateResult }> = {
  mk4: { viewBox: MK4_VIEWBOX, draw: drawMk4 },
  coreone: { viewBox: COREONE_VIEWBOX, draw: drawCoreOne },
  xl: { viewBox: XL_VIEWBOX, draw: drawXl },
};

const GLOW_GRADIENT = svg`
  <radialGradient id="plc-glow">
    <stop offset="0" stop-color="#fff3b0"></stop>
    <stop offset="0.35" stop-color="#ffb02e" stop-opacity="0.9"></stop>
    <stop offset="1" stop-color="#ff3d00" stop-opacity="0"></stop>
  </radialGradient>
`;

export function renderPrinter(model: PrinterModel, vm: PrinterViewModel): TemplateResult {
  const printer = PRINTERS[model];
  const drawState: DrawState = {
    objectFrac: (vm.progress ?? 0) / 100,
    nozzleGlow: vm.nozzleGlow,
    bedGlow: vm.bedGlow,
  };
  return html`<svg
    class="printer ${vm.mode}"
    viewBox=${printer.viewBox}
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="${MODEL_LABELS[model]} – ${vm.stateLabel}"
  >
    <defs>${GLOW_GRADIENT}</defs>
    ${printer.draw(drawState)}
  </svg>`;
}
