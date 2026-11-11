import { describe, expect, it } from 'vitest';
import { extraIcon, extraService, normalizeExtras } from './extras';

describe('normalizeExtras', () => {
  it('accepts ids and objects and drops invalid entries', () => {
    expect(
      normalizeExtras(['light.enclosure', { entity: 'sensor.temp', name: 'Temp' }, '', { entity: '' }]),
    ).toEqual([{ entity: 'light.enclosure' }, { entity: 'sensor.temp', name: 'Temp' }]);
    expect(normalizeExtras(undefined)).toEqual([]);
  });
});

describe('extraService', () => {
  it.each([
    ['light.enclosure', ['homeassistant', 'toggle']],
    ['switch.filter', ['homeassistant', 'toggle']],
    ['button.restart', ['button', 'press']],
    ['input_button.go', ['input_button', 'press']],
    ['script.preheat', ['script', 'turn_on']],
    ['sensor.temp', undefined],
  ])('maps %s', (entityId, service) => {
    expect(extraService(entityId)).toEqual(service);
  });
});

describe('extraIcon', () => {
  it('prefers config, then entity attribute, then domain default', () => {
    const entity = {
      entity_id: 'light.x',
      state: 'on',
      attributes: { icon: 'mdi:lamp' },
      last_changed: '',
      last_updated: '',
    };
    expect(extraIcon({ entity: 'light.x', icon: 'mdi:star' }, entity)).toBe('mdi:star');
    expect(extraIcon({ entity: 'light.x' }, entity)).toBe('mdi:lamp');
    expect(extraIcon({ entity: 'light.x' })).toBe('mdi:lightbulb');
    expect(extraIcon({ entity: 'vacuum.x' })).toBe('mdi:bookmark');
  });
});
