import type { ExtraEntityConfig, HassEntity } from './types';

const TOGGLE_DOMAINS = ['switch', 'light', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier'];

const DOMAIN_ICONS: Record<string, string> = {
  switch: 'mdi:toggle-switch-variant',
  light: 'mdi:lightbulb',
  fan: 'mdi:fan',
  input_boolean: 'mdi:toggle-switch-outline',
  automation: 'mdi:robot',
  sensor: 'mdi:eye',
  binary_sensor: 'mdi:radiobox-marked',
  button: 'mdi:gesture-tap-button',
  input_button: 'mdi:gesture-tap-button',
  scene: 'mdi:palette',
  script: 'mdi:script-text',
  camera: 'mdi:video',
  climate: 'mdi:thermostat',
};

export function normalizeExtras(list?: Array<string | ExtraEntityConfig>): ExtraEntityConfig[] {
  return (list ?? [])
    .map((item) => (typeof item === 'string' ? { entity: item } : item))
    .filter((item): item is ExtraEntityConfig => typeof item?.entity === 'string' && item.entity !== '');
}

// Returns the service to call on tap, or undefined to open the more-info dialog.
export function extraService(entityId: string): [string, string] | undefined {
  const domain = entityId.split('.')[0];
  if (TOGGLE_DOMAINS.includes(domain)) return ['homeassistant', 'toggle'];
  if (domain === 'button' || domain === 'input_button') return [domain, 'press'];
  if (domain === 'scene' || domain === 'script') return [domain, 'turn_on'];
  return undefined;
}

export function extraIcon(extra: ExtraEntityConfig, entity?: HassEntity): string {
  const attributeIcon = entity?.attributes.icon;
  return (
    extra.icon ??
    (typeof attributeIcon === 'string' ? attributeIcon : undefined) ??
    DOMAIN_ICONS[extra.entity.split('.')[0]] ??
    'mdi:bookmark'
  );
}
