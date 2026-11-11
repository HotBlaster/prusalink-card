# PrusaLink Card

A Home Assistant Lovelace card for the [PrusaLink](https://www.home-assistant.io/integrations/prusalink/) integration.
It shows an animated isometric Prusa printer (MK4, CORE One or XL), job progress, temperatures,
pause / resume / cancel controls and a power switch.

- The printer animates only while printing, freezes while paused and is dimmed when off.
- The printed object grows with job progress; nozzle and bed glow with temperature.
- Cancelling a job or switching the printer off during a print asks for confirmation.

## Installation

### HACS

Add this repository as a custom repository (type **Dashboard**) in HACS, install **PrusaLink Card** and reload the browser.

### Manual

Copy `prusalink-card.js` from the latest release to `config/www/` and add it as a dashboard resource:

```yaml
url: /local/prusalink-card.js
type: module
```

## Configuration

The card can be configured with the visual editor or in YAML:

```yaml
type: custom:prusalink-card
printer_model: mk4 # mk4 | coreone | xl
name: My MK4
state_entity: sensor.mk4
progress_entity: sensor.mk4_progress
filename_entity: sensor.mk4_filename
print_finish_entity: sensor.mk4_print_finish
print_speed_entity: sensor.mk4_print_speed
nozzle_temp_entity: sensor.mk4_nozzle_temperature
nozzle_target_entity: sensor.mk4_nozzle_target_temperature
bed_temp_entity: sensor.mk4_heatbed_temperature
bed_target_entity: sensor.mk4_heatbed_target_temperature
pause_button_entity: button.mk4_pause_job
resume_button_entity: button.mk4_resume_job
cancel_button_entity: button.mk4_cancel_job
power_switch_entity: switch.mk4_power
```

Only `printer_model` and `state_entity` are required; anything not configured is hidden.

> The PrusaLink temperature sensors are **disabled by default** in Home Assistant.
> Enable them in the device page to see temperatures and the heat glow.

## Development

```bash
npm install
npm run dev        # rebuild on change + demo page at http://localhost:5000/demo/index.html
npm test
npm run build      # dist/prusalink-card.js
```
