export const CARD_VERSION = '0.2.0';

export const PRINTER_MODELS = ['mk4', 'coreone', 'xl'] as const;
export type PrinterModel = (typeof PRINTER_MODELS)[number];

export const MODEL_LABELS: Record<PrinterModel, string> = {
  mk4: 'Prusa MK4 (Cartesian)',
  coreone: 'Prusa CORE One (CoreXY)',
  xl: 'Prusa XL (CoreXY)',
};

// Build volume in mm, used to map the real toolhead position onto the drawing.
export const BUILD_VOLUME: Record<PrinterModel, { x: number; y: number; z: number }> = {
  mk4: { x: 250, y: 210, z: 220 },
  coreone: { x: 250, y: 220, z: 270 },
  xl: { x: 360, y: 360, z: 360 },
};

export const UNAVAILABLE_STATES = ['unavailable', 'unknown'];
