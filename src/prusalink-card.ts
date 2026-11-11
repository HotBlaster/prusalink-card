import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import './confirm-overlay';
import './editor';
import { CARD_VERSION, MODEL_LABELS, PRINTER_MODELS } from './const';
import { extraIcon, extraService, normalizeExtras } from './extras';
import { localize } from './localize';
import { printerStyles, renderPrinter } from './printers';
import {
  availableViews,
  buildViewModel,
  formatDuration,
  formatEntity,
  type CardView,
  type Position,
  type PrinterViewModel,
  type Temperature,
} from './state';
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

function formatPosition(p: Position): string | undefined {
  const parts = (['x', 'y', 'z'] as const)
    .filter((axis) => p[axis] !== undefined)
    .map((axis) => `${axis.toUpperCase()} ${p[axis]!.toFixed(1)}`);
  return parts.length ? `${parts.join(' · ')} mm` : undefined;
}

export class PrusaLinkCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: PrusaLinkCardConfig;
  @state() private _confirm?: PendingConfirm;
  @state() private _view: CardView = 'printer';

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
      return html`<ha-card><div class="warning">${this._t('card.missing_state')}</div></ha-card>`;
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
      <div class="printer-wrap">${this._renderView(vm)}</div>
      ${this._renderProgress(vm)} ${this._renderInfo(vm)} ${this._renderExtras()} ${this._renderActions(vm)}
      ${this._confirm
        ? html`<prusalink-confirm
            .message=${this._confirm.message}
            .confirmLabel=${this._confirm.confirmLabel}
            .cancelLabel=${this._t('confirm.back')}
            @confirm=${this._onConfirm}
            @cancel=${this._onCancel}
          ></prusalink-confirm>`
        : nothing}
    </ha-card>`;
  }

  private _t(key: string): string {
    return localize(this.hass, key);
  }

  private _renderView(vm: PrinterViewModel) {
    const views = availableViews(vm);
    // Falls back to the printer when the selected view disappears (e.g. the job ended).
    const view = views.includes(this._view) ? this._view : 'printer';
    let content: TemplateResult;
    if (view === 'preview') {
      content = html`<img
        class="view-image"
        src=${vm.previewUrl!}
        alt=${this._t('view.preview')}
        @click=${() => this._moreInfo(this._config!.preview_entity!)}
      />`;
    } else if (view === 'camera') {
      content = html`<img
        class="view-image"
        src=${vm.cameraUrl!}
        alt=${this._t('view.camera')}
        @click=${() => this._moreInfo(this._config!.camera_entity!)}
      />`;
    } else {
      content = renderPrinter(this._config!.printer_model, vm);
    }
    if (views.length < 2) return content;
    const next = views[(views.indexOf(view) + 1) % views.length];
    const nextLabel = this._t(`view.show_${next}`);
    return html`${content}
      <button class="view-next" title=${nextLabel} aria-label=${nextLabel} @click=${() => (this._view = next)}>
        <ha-icon icon="mdi:chevron-right"></ha-icon>
      </button>
      <div class="view-dots">
        ${views.map((v) => html`<span class="dot ${v === view ? 'active' : ''}"></span>`)}
      </div>`;
  }

  private _renderPowerButton(vm: PrinterViewModel) {
    if (!this._config?.power_switch_entity) return nothing;
    const label = this._t(vm.powerOn ? 'power.turn_off' : 'power.turn_on');
    return html`<button
      class="power ${vm.powerOn ? 'on' : ''}"
      title=${label}
      aria-label=${label}
      aria-pressed=${vm.powerOn ? 'true' : 'false'}
      ?disabled=${!vm.powerAvailable}
      @click=${() => this._togglePower(vm)}
    >
      <ha-icon icon="mdi:power"></ha-icon>
    </button>`;
  }

  private _renderProgress(vm: PrinterViewModel) {
    if (vm.progress === undefined && !vm.previewUrl) return nothing;
    const previewEntity = this._config!.preview_entity!;
    return html`<div class="progress">
      ${vm.previewUrl
        ? html`<img class="preview" src=${vm.previewUrl} alt="" @click=${() => this._moreInfo(previewEntity)} />`
        : nothing}
      ${vm.progress !== undefined
        ? html`<div class="progress-body">
            <div class="progress-text">
              <span class="filename" title=${vm.filename ?? ''}>${vm.filename ?? ''}</span>
              <span class="percent">${Math.round(vm.progress)}%</span>
            </div>
            <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${vm.progress}>
              <div class="fill" style="width:${vm.progress}%"></div>
            </div>
          </div>`
        : nothing}
    </div>`;
  }

  private _renderInfo(vm: PrinterViewModel) {
    const on = vm.mode !== 'off';
    const items: Array<[string, string, string | undefined]> = [
      ...(on
        ? ([
            ['mdi:printer-3d-nozzle-heat', 'info.nozzle', formatTemperature(vm.nozzle)],
            ['mdi:radiator', 'info.bed', formatTemperature(vm.bed)],
            [
              'mdi:timer-sand',
              'info.remaining',
              vm.remainingSeconds !== undefined ? formatDuration(vm.remainingSeconds) : undefined,
            ],
            ['mdi:speedometer', 'info.speed', vm.printSpeed !== undefined ? `${Math.round(vm.printSpeed)}%` : undefined],
            ['mdi:printer-3d-nozzle', 'info.material', vm.material],
            ['mdi:axis-arrow', 'info.position', formatPosition(vm.position)],
          ] as Array<[string, string, string | undefined]>)
        : []),
      ['mdi:flash', 'info.power', vm.power],
      ['mdi:lightning-bolt', 'info.energy', vm.energy],
    ];
    const visible = items.filter(([, , value]) => value !== undefined);
    if (visible.length === 0) return nothing;
    return html`<div class="info">
      ${visible.map(
        ([icon, key, value]) => html`<div class="info-item">
          <ha-icon icon=${icon}></ha-icon>
          <div>
            <div class="label">${this._t(key)}</div>
            <div class="value">${value}</div>
          </div>
        </div>`,
      )}
    </div>`;
  }

  private _renderExtras() {
    const extras = normalizeExtras(this._config!.extra_entities);
    if (!extras.length) return nothing;
    return html`<div class="extras">
      ${extras.map((extra) => {
        const entity = this.hass!.states[extra.entity];
        const name = extra.name ?? (entity?.attributes.friendly_name as string | undefined) ?? extra.entity;
        return html`<button
          class="extra ${entity?.state === 'on' ? 'active' : ''}"
          title=${name}
          ?disabled=${!entity}
          @click=${() => this._extraClick(extra.entity)}
        >
          <ha-icon icon=${extraIcon(extra, entity)}></ha-icon>
          <span class="extra-name">${name}</span>
          <span class="extra-state">${entity ? formatEntity(this.hass!, entity) : ''}</span>
        </button>`;
      })}
    </div>`;
  }

  private _renderActions(vm: PrinterViewModel) {
    const config = this._config!;
    const buttons: TemplateResult[] = [];
    if (vm.canPause && config.pause_button_entity) {
      buttons.push(this._actionButton('mdi:pause', 'action.pause', () => this._press(config.pause_button_entity!)));
    }
    if (vm.canResume && config.resume_button_entity) {
      buttons.push(this._actionButton('mdi:play', 'action.resume', () => this._press(config.resume_button_entity!)));
    }
    if (vm.canContinue && config.continue_button_entity) {
      buttons.push(
        this._actionButton('mdi:play-circle-outline', 'action.continue', () =>
          this._press(config.continue_button_entity!),
        ),
      );
    }
    if (vm.canCancel && config.cancel_button_entity) {
      buttons.push(
        this._actionButton(
          'mdi:stop',
          'action.cancel',
          () =>
            this._askConfirm(this._t('confirm.cancel_job'), this._t('confirm.cancel_job_action'), () =>
              this._press(config.cancel_button_entity!),
            ),
          true,
        ),
      );
    }
    return buttons.length ? html`<div class="actions">${buttons}</div>` : nothing;
  }

  private _actionButton(icon: string, labelKey: string, onClick: () => void, danger = false): TemplateResult {
    return html`<button class="action ${danger ? 'danger' : ''}" @click=${onClick}>
      <ha-icon icon=${icon}></ha-icon><span>${this._t(labelKey)}</span>
    </button>`;
  }

  private _togglePower(vm: PrinterViewModel): void {
    const entityId = this._config?.power_switch_entity;
    if (!entityId) return;
    const turnOff = vm.powerOn === true;
    const run = () => this._callService('homeassistant', turnOff ? 'turn_off' : 'turn_on', { entity_id: entityId });
    if (turnOff && vm.needsPowerOffConfirm) {
      this._askConfirm(this._t('confirm.power_off'), this._t('confirm.power_off_action'), run);
    } else {
      run();
    }
  }

  private _extraClick(entityId: string): void {
    const service = extraService(entityId);
    if (service) {
      this._callService(service[0], service[1], { entity_id: entityId });
    } else {
      this._moreInfo(entityId);
    }
  }

  private _moreInfo(entityId: string): void {
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
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
        position: relative;
        height: 240px;
        margin: 8px 0 12px;
      }
      .view-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
        cursor: pointer;
      }
      .view-next {
        position: absolute;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.35);
        color: #fff;
        transition: background 0.2s;
      }
      .view-next:hover {
        background: var(--plc-accent);
      }
      .view-dots {
        position: absolute;
        bottom: 6px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--secondary-text-color);
        opacity: 0.4;
      }
      .dot.active {
        background: var(--plc-accent);
        opacity: 1;
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
      .progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .progress-body {
        flex: 1;
        min-width: 0;
      }
      .preview {
        flex: none;
        width: 56px;
        height: 56px;
        object-fit: contain;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
        cursor: pointer;
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
      .extras {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      .extra {
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: 100%;
        padding: 4px 12px 4px 8px;
        border-radius: 16px;
        border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        font-size: 0.85em;
        cursor: pointer;
      }
      .extra:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .extra ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .extra.active {
        border-color: var(--plc-accent);
      }
      .extra.active ha-icon {
        color: var(--plc-accent);
      }
      .extra-name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .extra-state {
        color: var(--secondary-text-color);
        white-space: nowrap;
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
