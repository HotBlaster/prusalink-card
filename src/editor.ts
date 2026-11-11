import { html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { MODEL_LABELS, PRINTER_MODELS } from './const';
import type { HomeAssistant, PrusaLinkCardConfig } from './types';

const sensor = (name: keyof PrusaLinkCardConfig, required = false) => ({
  name,
  required,
  selector: { entity: { filter: { integration: 'prusalink', domain: 'sensor' } } },
});

const button = (name: keyof PrusaLinkCardConfig) => ({
  name,
  selector: { entity: { filter: { integration: 'prusalink', domain: 'button' } } },
});

const SCHEMA = [
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
  sensor('state_entity', true),
  {
    name: 'job',
    type: 'expandable',
    flatten: true,
    title: 'Job',
    schema: [
      sensor('progress_entity'),
      sensor('filename_entity'),
      sensor('print_finish_entity'),
      sensor('print_speed_entity'),
      sensor('material_entity'),
    ],
  },
  {
    name: 'temperatures',
    type: 'expandable',
    flatten: true,
    title: 'Temperatures',
    schema: [
      sensor('nozzle_temp_entity'),
      sensor('nozzle_target_entity'),
      sensor('bed_temp_entity'),
      sensor('bed_target_entity'),
    ],
  },
  {
    name: 'controls',
    type: 'expandable',
    flatten: true,
    title: 'Job controls',
    schema: [button('pause_button_entity'), button('resume_button_entity'), button('cancel_button_entity')],
  },
  {
    name: 'power',
    type: 'expandable',
    flatten: true,
    title: 'Power',
    schema: [
      {
        name: 'power_switch_entity',
        selector: { entity: { filter: { domain: ['switch', 'input_boolean'] } } },
      },
    ],
  },
];

const LABELS: Record<string, string> = {
  printer_model: 'Printer model',
  name: 'Name',
  state_entity: 'Printer state sensor',
  progress_entity: 'Progress',
  filename_entity: 'Filename',
  print_finish_entity: 'Print finish',
  print_speed_entity: 'Print speed',
  material_entity: 'Material',
  nozzle_temp_entity: 'Nozzle temperature',
  nozzle_target_entity: 'Nozzle target temperature',
  bed_temp_entity: 'Heatbed temperature',
  bed_target_entity: 'Heatbed target temperature',
  pause_button_entity: 'Pause job button',
  resume_button_entity: 'Resume job button',
  cancel_button_entity: 'Cancel job button',
  power_switch_entity: 'Power switch',
};

export class PrusaLinkCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: PrusaLinkCardConfig;

  setConfig(config: PrusaLinkCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${SCHEMA}
      .computeLabel=${(schema: { name: string }) => LABELS[schema.name] ?? schema.name}
      @value-changed=${this._valueChanged}
    ></ha-form>`;
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
