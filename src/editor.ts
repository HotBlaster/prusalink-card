import { html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { MODEL_LABELS, PRINTER_MODELS } from './const';
import { localize } from './localize';
import type { HomeAssistant, PrusaLinkCardConfig } from './types';

type FieldName = keyof PrusaLinkCardConfig;

const prusalink = (name: FieldName, domain: string, required = false) => ({
  name,
  required,
  selector: { entity: { filter: { integration: 'prusalink', domain } } },
});

const sensorWithClass = (name: FieldName, deviceClass: string) => ({
  name,
  selector: { entity: { filter: { domain: 'sensor', device_class: deviceClass } } },
});

function buildSchema(hass: HomeAssistant, editableExtras: boolean) {
  const section = (name: string, schema: unknown[]) => ({
    name,
    type: 'expandable',
    flatten: true,
    title: localize(hass, `editor.section.${name}`),
    schema,
  });

  return [
    {
      name: 'printer_model',
      required: true,
      selector: {
        select: {
          mode: 'dropdown',
          options: PRINTER_MODELS.map((value) => ({ value, label: MODEL_LABELS[value] })),
        },
      },
    },
    { name: 'name', selector: { text: {} } },
    prusalink('state_entity', 'sensor', true),
    section('job', [
      prusalink('progress_entity', 'sensor'),
      prusalink('filename_entity', 'sensor'),
      prusalink('print_finish_entity', 'sensor'),
      prusalink('print_speed_entity', 'sensor'),
      prusalink('material_entity', 'sensor'),
      prusalink('preview_entity', 'camera'),
    ]),
    section('temperatures', [
      prusalink('nozzle_temp_entity', 'sensor'),
      prusalink('nozzle_target_entity', 'sensor'),
      prusalink('bed_temp_entity', 'sensor'),
      prusalink('bed_target_entity', 'sensor'),
    ]),
    section('position', [
      prusalink('x_position_entity', 'sensor'),
      prusalink('y_position_entity', 'sensor'),
      prusalink('z_height_entity', 'sensor'),
    ]),
    section('controls', [
      prusalink('pause_button_entity', 'button'),
      prusalink('resume_button_entity', 'button'),
      prusalink('continue_button_entity', 'button'),
      prusalink('cancel_button_entity', 'button'),
    ]),
    section('power', [
      {
        name: 'power_switch_entity',
        selector: { entity: { filter: { domain: ['switch', 'input_boolean'] } } },
      },
      sensorWithClass('power_entity', 'power'),
      sensorWithClass('energy_entity', 'energy'),
    ]),
    ...(editableExtras
      ? [section('extra', [{ name: 'extra_entities', selector: { entity: { multiple: true } } }])]
      : []),
  ];
}

export class PrusaLinkCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: PrusaLinkCardConfig;

  setConfig(config: PrusaLinkCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    // ha-form's entity picker only handles plain ids, so object entries stay YAML-only.
    const editableExtras = (this._config.extra_entities ?? []).every((item) => typeof item === 'string');
    return html`<ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${buildSchema(this.hass, editableExtras)}
        .computeLabel=${(schema: { name: string }) => localize(this.hass, `editor.${schema.name}`)}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${editableExtras ? nothing : html`<p class="note">${localize(this.hass, 'editor.extra_yaml')}</p>`}`;
  }

  private _valueChanged(ev: CustomEvent<{ value: PrusaLinkCardConfig }>): void {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: ev.detail.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (!customElements.get('prusalink-card-editor')) {
  customElements.define('prusalink-card-editor', PrusaLinkCardEditor);
}
