import { UNAVAILABLE_STATES } from './const';
import { localize } from './localize';
import type { HassEntity, HomeAssistant, PrusaLinkCardConfig } from './types';

export type PrinterMode = 'off' | 'idle' | 'printing' | 'paused' | 'attention' | 'error';

export interface Temperature {
  current?: number;
  target?: number;
}

export interface Position {
  x?: number;
  y?: number;
  z?: number;
}

export interface PrinterViewModel {
  mode: PrinterMode;
  rawState: string;
  stateLabel: string;
  powerOn?: boolean;
  powerAvailable: boolean;
  progress?: number;
  filename?: string;
  remainingSeconds?: number;
  nozzle: Temperature;
  bed: Temperature;
  nozzleGlow: number;
  bedGlow: number;
  printSpeed?: number;
  material?: string;
  previewUrl?: string;
  position: Position;
  power?: string;
  energy?: string;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canContinue: boolean;
  needsPowerOffConfirm: boolean;
}

const MODE_BY_STATE: Record<string, PrinterMode> = {
  printing: 'printing',
  paused: 'paused',
  attention: 'attention',
  error: 'error',
};

const JOB_ACTIVE_MODES: PrinterMode[] = ['printing', 'paused', 'attention'];

const NOZZLE_REFERENCE_TEMP = 250;
const BED_REFERENCE_TEMP = 100;
const AMBIENT_TEMP = 35;

function getEntity(hass: HomeAssistant, id?: string): HassEntity | undefined {
  return id ? hass.states[id] : undefined;
}

function isAvailable(entity?: HassEntity): entity is HassEntity {
  return !!entity && !UNAVAILABLE_STATES.includes(entity.state);
}

// Button entities report 'unknown' until first pressed, so only 'unavailable' means disabled.
function isPressable(entity?: HassEntity): boolean {
  return !!entity && entity.state !== 'unavailable';
}

function numericState(hass: HomeAssistant, id?: string): number | undefined {
  const entity = getEntity(hass, id);
  if (!isAvailable(entity)) return undefined;
  const value = Number(entity.state);
  return Number.isFinite(value) ? value : undefined;
}

function textState(hass: HomeAssistant, id?: string): string | undefined {
  const entity = getEntity(hass, id);
  return isAvailable(entity) ? entity.state : undefined;
}

function formatState(hass: HomeAssistant, entity?: HassEntity): string {
  if (!entity) return localize(hass, 'state.unavailable');
  if (hass.formatEntityState) return hass.formatEntityState(entity);
  return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

export function formatEntity(hass: HomeAssistant, entity: HassEntity): string {
  if (hass.formatEntityState) return hass.formatEntityState(entity);
  const unit = entity.attributes.unit_of_measurement;
  return unit ? `${entity.state} ${unit}` : entity.state;
}

export function formatSensor(hass: HomeAssistant, id?: string): string | undefined {
  const entity = getEntity(hass, id);
  return isAvailable(entity) ? formatEntity(hass, entity) : undefined;
}

export function glowLevel(current: number | undefined, target: number | undefined, reference: number): number {
  if (current === undefined) return 0;
  const top = target !== undefined && target > AMBIENT_TEMP + 5 ? target : reference;
  return Math.min(1, Math.max(0, (current - AMBIENT_TEMP) / (top - AMBIENT_TEMP)));
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function buildViewModel(
  hass: HomeAssistant,
  config: PrusaLinkCardConfig,
  now: number = Date.now(),
): PrinterViewModel {
  const stateEntity = getEntity(hass, config.state_entity);
  const power = getEntity(hass, config.power_switch_entity);
  const powerOn = isAvailable(power) ? power.state === 'on' : undefined;

  const off = powerOn === false || !isAvailable(stateEntity);
  const rawState = stateEntity?.state ?? 'unavailable';
  const mode: PrinterMode = off ? 'off' : (MODE_BY_STATE[rawState] ?? 'idle');
  const on = mode !== 'off';

  const progress = numericState(hass, config.progress_entity);
  const finish = textState(hass, config.print_finish_entity);
  const finishMs = finish ? Date.parse(finish) : NaN;

  const nozzle: Temperature = {
    current: numericState(hass, config.nozzle_temp_entity),
    target: numericState(hass, config.nozzle_target_entity),
  };
  const bed: Temperature = {
    current: numericState(hass, config.bed_temp_entity),
    target: numericState(hass, config.bed_target_entity),
  };
  const preview = getEntity(hass, config.preview_entity);
  const previewUrl = preview?.attributes.entity_picture;

  return {
    mode,
    rawState,
    stateLabel: powerOn === false ? localize(hass, 'state.off') : formatState(hass, stateEntity),
    powerOn,
    powerAvailable: isAvailable(power),
    progress: on && progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined,
    filename: on ? textState(hass, config.filename_entity) : undefined,
    remainingSeconds:
      on && Number.isFinite(finishMs) ? Math.max(0, Math.round((finishMs - now) / 1000)) : undefined,
    nozzle,
    bed,
    nozzleGlow: on ? glowLevel(nozzle.current, nozzle.target, NOZZLE_REFERENCE_TEMP) : 0,
    bedGlow: on ? glowLevel(bed.current, bed.target, BED_REFERENCE_TEMP) : 0,
    printSpeed: numericState(hass, config.print_speed_entity),
    material: textState(hass, config.material_entity),
    previewUrl:
      on && isAvailable(preview) && typeof previewUrl === 'string' ? previewUrl : undefined,
    position: on
      ? {
          x: numericState(hass, config.x_position_entity),
          y: numericState(hass, config.y_position_entity),
          z: numericState(hass, config.z_height_entity),
        }
      : {},
    power: formatSensor(hass, config.power_entity),
    energy: formatSensor(hass, config.energy_entity),
    canPause: on && isPressable(getEntity(hass, config.pause_button_entity)),
    canResume: on && isPressable(getEntity(hass, config.resume_button_entity)),
    canCancel: on && isPressable(getEntity(hass, config.cancel_button_entity)),
    canContinue: on && isPressable(getEntity(hass, config.continue_button_entity)),
    needsPowerOffConfirm: JOB_ACTIVE_MODES.includes(mode),
  };
}
