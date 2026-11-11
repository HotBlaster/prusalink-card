import { css } from 'lit';

export const printerStyles = css`
  svg.printer {
    width: 100%;
    height: 100%;
    overflow: visible;
    transition: filter 0.6s ease;
  }

  svg.printer polygon {
    stroke: rgba(0, 0, 0, 0.22);
    stroke-width: 0.35;
    stroke-linejoin: round;
  }

  svg.printer polygon.bed-heat,
  svg.printer polygon.fresh-layer {
    stroke: none;
  }

  svg.printer polygon.glass {
    stroke: rgba(255, 255, 255, 0.35);
    stroke-width: 0.5;
  }

  svg.printer .bed-segments line {
    stroke: rgba(0, 0, 0, 0.25);
    stroke-width: 0.4;
  }

  svg.printer .bed-heat {
    transition: fill-opacity 1s ease;
  }

  svg.printer .lift,
  svg.printer .shift {
    transition: transform 1.2s ease;
  }

  svg.printer .anim {
    animation: none;
  }

  svg.printer .anim-x {
    --dur: 1.3s;
  }

  svg.printer .anim-y {
    --dur: 7.7s;
  }

  svg.printer.printing .anim,
  svg.printer.paused .anim {
    animation: plc-slide var(--dur) ease-in-out infinite alternate;
  }

  svg.printer .fan-blades {
    transform-box: view-box;
    transform-origin: 0 0;
  }

  svg.printer.printing .fan-blades,
  svg.printer.paused .fan-blades {
    animation: plc-spin 0.35s linear infinite;
  }

  svg.printer.printing .fresh-layer,
  svg.printer.paused .fresh-layer {
    animation: plc-fresh 0.9s ease-in-out infinite alternate;
  }

  svg.printer.paused .anim,
  svg.printer.paused .fan-blades,
  svg.printer.paused .fresh-layer {
    animation-play-state: paused;
  }

  svg.printer.off {
    filter: grayscale(0.85) brightness(0.6);
  }

  svg.printer.off .screen {
    fill: #15171a;
  }

  @keyframes plc-slide {
    from {
      transform: translate(var(--from-x), var(--from-y));
    }
    to {
      transform: translate(var(--to-x), var(--to-y));
    }
  }

  @keyframes plc-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes plc-fresh {
    from {
      fill-opacity: 0;
    }
    to {
      fill-opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg.printer .anim,
    svg.printer .fan-blades,
    svg.printer .fresh-layer {
      animation: none !important;
    }
  }
`;
