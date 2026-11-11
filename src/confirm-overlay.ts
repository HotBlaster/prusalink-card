import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class PrusaLinkConfirm extends LitElement {
  @property() message = '';
  @property({ attribute: 'confirm-label' }) confirmLabel = 'Confirm';

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .dialog {
      max-width: 320px;
      padding: 20px;
      border-radius: 12px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .message {
      margin: 0 0 16px;
      line-height: 1.4;
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #ccc);
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    button.confirm {
      border-color: var(--error-color, #db4437);
      background: var(--error-color, #db4437);
      color: #fff;
    }
  `;

  render() {
    return html`<div class="dialog" role="alertdialog" aria-modal="true">
      <p class="message">${this.message}</p>
      <div class="buttons">
        <button @click=${() => this._emit('cancel')}>Cancel</button>
        <button class="confirm" @click=${() => this._emit('confirm')}>${this.confirmLabel}</button>
      </div>
    </div>`;
  }

  private _emit(type: 'confirm' | 'cancel'): void {
    this.dispatchEvent(new CustomEvent(type));
  }
}

if (!customElements.get('prusalink-confirm')) {
  customElements.define('prusalink-confirm', PrusaLinkConfirm);
}
