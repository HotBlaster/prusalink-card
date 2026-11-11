import type { PrinterModel } from './const';

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  formatEntityState?(stateObj: HassEntity, state?: string): string;
}

export interface PrusaLinkCardConfig {
  type: string;
  printer_model: PrinterModel;
  name?: string;
  state_entity: string;
  progress_entity?: string;
  filename_entity?: string;
  print_finish_entity?: string;
  print_speed_entity?: string;
  material_entity?: string;
  nozzle_temp_entity?: string;
  nozzle_target_entity?: string;
  bed_temp_entity?: string;
  bed_target_entity?: string;
  pause_button_entity?: string;
  resume_button_entity?: string;
  cancel_button_entity?: string;
  power_switch_entity?: string;
}

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description?: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
