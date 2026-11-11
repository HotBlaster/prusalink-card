import { describe, expect, it } from 'vitest';
import { buildViewModel, formatDuration, glowLevel } from './state';
import type { HassEntity, HomeAssistant, PrusaLinkCardConfig } from './types';

const entity = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id,
  state,
  attributes,
  last_changed: '',
  last_updated: '',
});

type MockState = string | [string, Record<string, unknown>];

const mockHass = (states: Record<string, MockState>, language = 'en'): HomeAssistant => ({
  language,
  states: Object.fromEntries(
    Object.entries(states).map(([id, s]) => [id, typeof s === 'string' ? entity(id, s) : entity(id, s[0], s[1])]),
  ),
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
  continue_button_entity: 'button.mk4_continue',
  preview_entity: 'camera.mk4_preview',
  x_position_entity: 'sensor.mk4_x',
  y_position_entity: 'sensor.mk4_y',
  z_height_entity: 'sensor.mk4_z',
  power_switch_entity: 'switch.mk4_power',
  power_entity: 'sensor.plug_power',
  energy_entity: 'sensor.plug_energy',
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

  it('offers continue only when the button is available', () => {
    const states: Record<string, MockState> = { 'sensor.mk4': 'attention', 'button.mk4_continue': 'unknown' };
    expect(buildViewModel(mockHass(states), config).canContinue).toBe(true);
    states['button.mk4_continue'] = 'unavailable';
    expect(buildViewModel(mockHass(states), config).canContinue).toBe(false);
  });

  it('shows power and energy even when the printer is off', () => {
    const vm = buildViewModel(
      mockHass({
        'sensor.mk4': 'unavailable',
        'switch.mk4_power': 'off',
        'sensor.plug_power': ['0.4', { unit_of_measurement: 'W' }],
        'sensor.plug_energy': ['12.34', { unit_of_measurement: 'kWh' }],
      }),
      config,
    );
    expect(vm.power).toBe('0.4 W');
    expect(vm.energy).toBe('12.34 kWh');
  });

  it('uses formatEntityState when Home Assistant provides it', () => {
    const hass = mockHass({ 'sensor.mk4': 'idle', 'sensor.plug_power': ['120', { unit_of_measurement: 'W' }] });
    hass.formatEntityState = (e) => `formatted ${e.state}`;
    expect(buildViewModel(hass, config).power).toBe('formatted 120');
  });

  it('reads the toolhead position only while on', () => {
    const states: Record<string, MockState> = {
      'sensor.mk4': 'printing',
      'sensor.mk4_x': '125',
      'sensor.mk4_y': '105.5',
      'sensor.mk4_z': 'unavailable',
    };
    expect(buildViewModel(mockHass(states), config).position).toEqual({ x: 125, y: 105.5, z: undefined });
    states['switch.mk4_power'] = 'off';
    expect(buildViewModel(mockHass(states), config).position).toEqual({});
  });

  it('exposes the preview picture of an available camera', () => {
    const states: Record<string, MockState> = {
      'sensor.mk4': 'printing',
      'camera.mk4_preview': ['idle', { entity_picture: '/api/camera_proxy/camera.mk4_preview?token=abc' }],
    };
    expect(buildViewModel(mockHass(states), config).previewUrl).toBe(
      '/api/camera_proxy/camera.mk4_preview?token=abc',
    );
    states['camera.mk4_preview'] = ['unavailable', { entity_picture: '/x' }];
    expect(buildViewModel(mockHass(states), config).previewUrl).toBeUndefined();
  });

  it('localizes the off label', () => {
    const hass = mockHass({ 'sensor.mk4': 'idle', 'switch.mk4_power': 'off' }, 'it');
    expect(buildViewModel(hass, config).stateLabel).toBe('Spenta');
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
