import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import './confirm-overlay';
import './editor';
import { CARD_VERSION, MODEL_LABELS, PRINTER_MODELS } from './const';
import { printerStyles, renderPrinter } from './printers';
import { buildViewModel, formatDuration, type PrinterViewModel, type Temperature } from './state';
import type { HomeAssistant, PrusaLinkCardConfig } from './types';

interface PendingConfirm {
  message: string;
  confirmLabel: string;
  action: () => void;
}

function formatTemperature(t: Temperature): string | undefined {
  if (t.current === undefined) return undefined;
  const current = `${Math.round(t.current)}°C`;
  return t.target ? `${current} / ${Math.round(t.target)}°C` : current;
}

export class PrusaLinkCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: PrusaLinkCardConfig;
  @state() private _confirm?: PendingConfirm;

  static getConfigElement(): HTMLElement {
    return document.createElement('prusalink-card-editor');
  }

  static getStubConfig(hass: HomeAssistant): Partial<PrusaLinkCardConfig> {
    const stateSensor = Object.values(hass.states).find((entity) => {
      const options = entity.attributes.options;
      return (
        entity.entity_id.startsWith('sensor.') &&
        Array.isArray(options) &&
        options.includes('printing') &&
        options.includes('attention')
      );
    });
    return { printer_model: 'mk4', state_entity: stateSensor?.entity_id ?? '' };
  }

  setConfig(config: PrusaLinkCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    if (!PRINTER_MODELS.includes(config.printer_model)) {
      throw new Error(`printer_model must be one of: ${PRINTER_MODELS.join(', ')}`);
    }
    this._config = config;
  }

  getCardSize(): number {
    return 7;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    if (!this._config.state_entity) {
      return html`<ha-card><div class="warning">Please set <code>state_entity</code> to the PrusaLink printer state sensor.</div></ha-card>`;
    }

    const vm = buildViewModel(this.hass, this._config);
    const name =
      this._config.name ??
      (this.hass.states[this._config.state_entity]?.attributes.friendly_name as string | undefined) ??
      MODEL_LABELS[this._config.printer_model];

    return html`<ha-card>
      <div class="header">
        <div class="title">
          <div class="name">${name}</div>
          <span class="chip ${vm.mode}">${vm.stateLabel}</span>
        </div>
        ${this._renderPowerButton(vm)}
      </div>
      <div class="printer-wrap">${renderPrinter(this._config.printer_model, vm)}</div>
      ${this._renderProgress(vm)} ${this._renderInfo(vm)} ${this._renderActions(vm)}
      ${this._confirm
        ? html`<prusalink-confirm
            .message=${this._confirm.message}
            .confirmLabel=${this._confirm.confirmLabel}
            @confirm=${this._onConfirm}
            @cancel=${this._onCancel}
          ></prusalink-confirm>`
        : nothing}
    </ha-card>`;
  }

  private _renderPowerButton(vm: PrinterViewModel) {
    if (!this._config?.power_switch_entity) return nothing;
    return html`<button
      class="power ${vm.powerOn ? 'on' : ''}"
      title=${vm.powerOn ? 'Turn off' : 'Turn on'}
      aria-label=${vm.powerOn ? 'Turn printer off' : 'Turn printer on'}
      aria-pressed=${vm.powerOn ? 'true' : 'false'}
      ?disabled=${!vm.powerAvailable}
      @click=${() => this._togglePower(vm)}
    >
      <ha-icon icon="mdi:power"></ha-icon>
    </button>`;
  }

  private _renderProgress(vm: PrinterViewModel) {
    if (vm.progress === undefined) return nothing;
    return html`<div class="progress">
      <div class="progress-text">
        <span class="filename" title=${vm.filename ?? ''}>${vm.filename ?? ''}</span>
        <span class="percent">${Math.round(vm.progress)}%</span>
      </div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${vm.progress}>
        <div class="fill" style="width:${vm.progress}%"></div>
      </div>
    </div>`;
  }

  private _renderInfo(vm: PrinterViewModel) {
    const items: Array<[string, string, string | undefined]> = [
      ['mdi:printer-3d-nozzle-heat', 'Nozzle', formatTemperature(vm.nozzle)],
      ['mdi:radiator', 'Bed', formatTemperature(vm.bed)],
      ['mdi:timer-sand', 'Remaining', vm.remainingSeconds !== undefined ? formatDuration(vm.remainingSeconds) : undefined],
      ['mdi:speedometer', 'Speed', vm.printSpeed !== undefined ? `${Math.round(vm.printSpeed)}%` : undefined],
      ['mdi:printer-3d-nozzle', 'Material', vm.material],
    ];
    const visible = items.filter(([, , value]) => value !== undefined);
    if (vm.mode === 'off' || visible.length === 0) return nothing;
    return html`<div class="info">
      ${visible.map(
        ([icon, label, value]) => html`<div class="info-item">
          <ha-icon icon=${icon}></ha-icon>
          <div>
            <div class="label">${label}</div>
            <div class="value">${value}</div>
          </div>
        </div>`,
      )}
    </div>`;
  }

  private _renderActions(vm: PrinterViewModel) {
    const config = this._config!;
    const buttons: TemplateResult[] = [];
    if (vm.canPause && config.pause_button_entity) {
      buttons.push(this._actionButton('mdi:pause', 'Pause', () => this._press(config.pause_button_entity!)));
    }
    if (vm.canResume && config.resume_button_entity) {
      buttons.push(this._actionButton('mdi:play', 'Resume', () => this._press(config.resume_button_entity!)));
    }
    if (vm.canCancel && config.cancel_button_entity) {
      buttons.push(
        this._actionButton(
          'mdi:stop',
          'Cancel',
          () =>
            this._askConfirm('Cancel the current print job?', 'Cancel job', () =>
              this._press(config.cancel_button_entity!),
            ),
          true,
        ),
      );
    }
    return buttons.length ? html`<div class="actions">${buttons}</div>` : nothing;
  }

  private _actionButton(icon: string, label: string, onClick: () => void, danger = false): TemplateResult {
    return html`<button class="action ${danger ? 'danger' : ''}" @click=${onClick}>
      <ha-icon icon=${icon}></ha-icon><span>${label}</span>
    </button>`;
  }

  private _togglePower(vm: PrinterViewModel): void {
    const entityId = this._config?.power_switch_entity;
    if (!entityId) return;
    const turnOff = vm.powerOn === true;
    const run = () => this._callService('homeassistant', turnOff ? 'turn_off' : 'turn_on', { entity_id: entityId });
    if (turnOff && vm.needsPowerOffConfirm) {
      this._askConfirm('A print job is in progress. Turn the printer off anyway?', 'Turn off', run);
    } else {
      run();
    }
  }

  private _press(entityId: string): void {
    this._callService('button', 'press', { entity_id: entityId });
  }

  private _callService(domain: string, service: string, data: Record<string, unknown>): void {
    this.hass?.callService(domain, service, data).catch((err: unknown) => {
      console.error(`prusalink-card: ${domain}.${service} failed`, err);
    });
  }

  private _askConfirm(message: string, confirmLabel: string, action: () => void): void {
    this._confirm = { message, confirmLabel, action };
  }

  private _onConfirm(): void {
    const action = this._confirm?.action;
    this._confirm = undefined;
    action?.();
  }

  private _onCancel(): void {
    this._confirm = undefined;
  }

  static styles = [
    printerStyles,
    css`
      :host {
        --plc-accent: #ed6b21;
      }
      ha-card {
        position: relative;
        padding: 16px;
        overflow: hidden;
      }
      .warning {
        color: var(--warning-color, #ffa600);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .title {
        min-width: 0;
      }
      .name {
        font-size: 1.2em;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.8em;
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
        color: var(--secondary-text-color);
      }
      .chip.printing {
        background: rgba(237, 107, 33, 0.18);
        color: var(--plc-accent);
      }
      .chip.paused {
        background: rgba(255, 193, 7, 0.18);
        color: #e0a800;
      }
      .chip.attention,
      .chip.error {
        background: rgba(219, 68, 55, 0.18);
        color: var(--error-color, #db4437);
      }
      .power {
        flex: none;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
        color: var(--secondary-text-color);
        transition:
          background 0.3s,
          color 0.3s;
      }
      .power.on {
        background: var(--plc-accent);
        color: #fff;
      }
      .power:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .printer-wrap {
        height: 240px;
        margin: 8px 0 12px;
      }
      .progress-text {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.9em;
        margin-bottom: 6px;
      }
      .filename {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: var(--secondary-text-color);
      }
      .percent {
        font-weight: 500;
      }
      .bar {
        height: 8px;
        border-radius: 4px;
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.2));
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: 4px;
        background: var(--plc-accent);
        transition: width 1s ease;
      }
      .info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .info-item ha-icon {
        color: var(--secondary-text-color);
      }
      .label {
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
      .value {
        font-weight: 500;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
      .action {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        cursor: pointer;
      }
      .action:hover {
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
      }
      .action.danger {
        color: var(--error-color, #db4437);
        border-color: var(--error-color, #db4437);
      }
    `,
  ];
}

if (!customElements.get('prusalink-card')) {
  customElements.define('prusalink-card', PrusaLinkCard);
  window.customCards = window.customCards ?? [];
  window.customCards.push({
    type: 'prusalink-card',
    name: 'PrusaLink Card',
    description: 'Animated Prusa printer with PrusaLink status and controls',
    preview: true,
  });
  console.info(`%c PRUSALINK-CARD %c v${CARD_VERSION} `, 'background:#ed6b21;color:#fff', '');
}
