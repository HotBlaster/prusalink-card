import { describe, expect, it } from 'vitest';
import { buildViewModel, formatDuration, glowLevel } from './state';
import type { HassEntity, HomeAssistant, PrusaLinkCardConfig } from './types';

const entity = (entity_id: string, state: string): HassEntity => ({
  entity_id,
  state,
  attributes: {},
  last_changed: '',
  last_updated: '',
});

const mockHass = (states: Record<string, string>): HomeAssistant => ({
  language: 'en',
  states: Object.fromEntries(Object.entries(states).map(([id, s]) => [id, entity(id, s)])),
  callService: async () => undefined,
});

const config: PrusaLinkCardConfig = {
  type: 'custom:prusalink-card',
  printer_model: 'mk4',
  state_entity: 'sensor.mk4',
  progress_entity: 'sensor.mk4_progress',
  filename_entity: 'sensor.mk4_filename',
  print_finish_entity: 'sensor.mk4_print_finish',
  nozzle_temp_entity: 'sensor.mk4_nozzle',
  nozzle_target_entity: 'sensor.mk4_nozzle_target',
  pause_button_entity: 'button.mk4_pause',
  resume_button_entity: 'button.mk4_resume',
  cancel_button_entity: 'button.mk4_cancel',
  power_switch_entity: 'switch.mk4_power',
};

describe('buildViewModel', () => {
  it('is off when the power switch is off', () => {
    const vm = buildViewModel(mockHass({ 'sensor.mk4': 'idle', 'switch.mk4_power': 'off' }), config);
    expect(vm.mode).toBe('off');
    expect(vm.powerOn).toBe(false);
    expect(vm.stateLabel).toBe('Off');
  });

  it('is off when the state sensor is unavailable', () => {
    const vm = buildViewModel(mockHass({ 'sensor.mk4': 'unavailable', 'switch.mk4_power': 'on' }), config);
    expect(vm.mode).toBe('off');
    expect(vm.powerOn).toBe(true);
  });

  it('is off when the state entity is missing', () => {
    expect(buildViewModel(mockHass({}), config).mode).toBe('off');
  });

  it.each([
    ['printing', 'printing'],
    ['paused', 'paused'],
    ['attention', 'attention'],
    ['error', 'error'],
    ['idle', 'idle'],
    ['ready', 'idle'],
    ['finished', 'idle'],
    ['busy', 'idle'],
    ['stopped', 'idle'],
  ])('maps printer state %s to mode %s', (state, mode) => {
    expect(buildViewModel(mockHass({ 'sensor.mk4': state }), config).mode).toBe(mode);
  });

  it('reads job data while printing', () => {
    const now = Date.parse('2026-01-01T10:00:00Z');
    const vm = buildViewModel(
      mockHass({
        'sensor.mk4': 'printing',
        'switch.mk4_power': 'on',
        'sensor.mk4_progress': '42',
        'sensor.mk4_filename': 'benchy.bgcode',
        'sensor.mk4_print_finish': '2026-01-01T11:30:00+00:00',
        'sensor.mk4_nozzle': '215',
        'sensor.mk4_nozzle_target': '215',
        'button.mk4_pause': 'unknown',
        'button.mk4_resume': 'unavailable',
        'button.mk4_cancel': '2026-01-01T09:00:00+00:00',
      }),
      config,
      now,
    );
    expect(vm.mode).toBe('printing');
    expect(vm.progress).toBe(42);
    expect(vm.filename).toBe('benchy.bgcode');
    expect(vm.remainingSeconds).toBe(5400);
    expect(vm.nozzle).toEqual({ current: 215, target: 215 });
    expect(vm.nozzleGlow).toBe(1);
    expect(vm.canPause).toBe(true);
    expect(vm.canResume).toBe(false);
    expect(vm.canCancel).toBe(true);
    expect(vm.needsPowerOffConfirm).toBe(true);
  });

  it('hides job data and actions when off', () => {
    const vm = buildViewModel(
      mockHass({
        'sensor.mk4': 'printing',
        'switch.mk4_power': 'off',
        'sensor.mk4_progress': '42',
        'button.mk4_pause': 'unknown',
      }),
      config,
    );
    expect(vm.progress).toBeUndefined();
    expect(vm.canPause).toBe(false);
    expect(vm.needsPowerOffConfirm).toBe(false);
  });

  it('works without optional entities', () => {
    const vm = buildViewModel(mockHass({ 'sensor.mk4': 'idle' }), {
      type: 'custom:prusalink-card',
      printer_model: 'xl',
      state_entity: 'sensor.mk4',
    });
    expect(vm.mode).toBe('idle');
    expect(vm.powerOn).toBeUndefined();
    expect(vm.powerAvailable).toBe(false);
    expect(vm.progress).toBeUndefined();
    expect(vm.remainingSeconds).toBeUndefined();
    expect(vm.canCancel).toBe(false);
  });

  it('clamps progress and ignores non numeric values', () => {
    const states = { 'sensor.mk4': 'printing', 'sensor.mk4_progress': '130' };
    expect(buildViewModel(mockHass(states), config).progress).toBe(100);
    states['sensor.mk4_progress'] = 'abc';
    expect(buildViewModel(mockHass(states), config).progress).toBeUndefined();
  });
});

describe('glowLevel', () => {
  it('is 0 without a reading', () => {
    expect(glowLevel(undefined, 200, 250)).toBe(0);
  });

  it('scales towards the target', () => {
    expect(glowLevel(35, 60, 100)).toBe(0);
    expect(glowLevel(47.5, 60, 100)).toBeCloseTo(0.5);
    expect(glowLevel(80, 60, 100)).toBe(1);
  });

  it('uses the reference temperature when no target is set', () => {
    expect(glowLevel(142.5, 0, 250)).toBeCloseTo(0.5);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [59 * 60, '59m'],
    [3600, '1h 0m'],
    [5400, '1h 30m'],
  ])('formats %d seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});
