export const CARD_VERSION = '0.1.0';

export const PRINTER_MODELS = ['mk4', 'coreone', 'xl'] as const;
export type PrinterModel = (typeof PRINTER_MODELS)[number];

export const MODEL_LABELS: Record<PrinterModel, string> = {
  mk4: 'Prusa MK4 (Cartesian)',
  coreone: 'Prusa CORE One (CoreXY)',
  xl: 'Prusa XL (CoreXY)',
};

export const UNAVAILABLE_STATES = ['unavailable', 'unknown'];
