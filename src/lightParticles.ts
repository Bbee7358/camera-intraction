import type { CanvasPoint, DisplayMode, FingerName, FingerState, HandSnapshot } from "./types";

interface FingerLightStyle {
  color: string;
  coreColor: string;
  radius: number;
  maxRadius: number;
  spread: number;
  drift: number;
  emission: number;
  life: number;
}

interface LightParticle {
  position: CanvasPoint;
  previousPosition: CanvasPoint;
  velocity: CanvasPoint;
  age: number;
  life: number;
  radius: number;
  maxRadius: number;
  color: string;
  coreColor: string;
  wobble: number;
  speedHint: number;
}

export interface LightRenderOptions {
  intensity: number;
  trailLength: number;
  mode: DisplayMode;
}

const MAX_PARTICLES = 1400;

const FINGER_LIGHT_STYLES: Record<FingerName, FingerLightStyle> = {
  thumb: {
    color: "rgba(255, 116, 72, 1)",
    coreColor: "rgba(255, 224, 165, 1)",
    radius: 12,
    maxRadius: 34,
    spread: 44,
    drift: 18,
    emission: 2.2,
    life: 1.15,
  },
  index: {
    color: "rgba(86, 220, 255, 1)",
    coreColor: "rgba(238, 252, 255, 1)",
    radius: 6,
    maxRadius: 22,
    spread: 20,
    drift: 34,
    emission: 3.2,
    life: 0.9,
  },
  middle: {
    color: "rgba(151, 115, 255, 1)",
    coreColor: "rgba(255, 255, 255, 1)",
    radius: 13,
    maxRadius: 38,
    spread: 28,
    drift: 26,
    emission: 4,
    life: 1.1,
  },
  ring: {
    color: "rgba(255, 141, 220, 1)",
    coreColor: "rgba(255, 235, 250, 1)",
    radius: 10,
    maxRadius: 32,
    spread: 36,
    drift: 20,
    emission: 2.4,
    life: 1.25,
  },
  pinky: {
    color: "rgba(154, 255, 185, 1)",
    coreColor: "rgba(238, 255, 242, 1)",
    radius: 5,
    maxRadius: 18,
    spread: 18,
    drift: 42,
    emission: 1.8,
    life: 0.9,
  },
};

export class LightParticleSystem {
  private particles: LightParticle[] = [];

  updateAndDraw(
    context: CanvasRenderingContext2D,
    hands: HandSnapshot[],
    deltaSeconds: number,
    options: LightRenderOptions,
  ): void {
    this.emitFromHands(hands, options);
    this.update(deltaSeconds, options.trailLength, hands.length === 0);
    this.draw(context, options);
  }

  reset(): void {
    this.particles = [];
  }

  private emitFromHands(hands: HandSnapshot[], options: LightRenderOptions): void {
    if (options.intensity <= 0) {
      return;
    }

    hands.forEach((hand) => {
      hand.fingers.forEach((finger) => {
        if (!finger.isExtended) {
          return;
        }

        const style = FINGER_LIGHT_STYLES[finger.name];
        const speedFactor = clamp(finger.speed / 900, 0, 2.6);
        const extensionFactor = smoothstep(0.5, 1, finger.extension);
        const emissionCount = Math.round(
          (style.emission + speedFactor * 2.4) *
            extensionFactor *
            options.intensity,
        );

        for (let index = 0; index < emissionCount; index += 1) {
          this.particles.push(createParticle(finger, style, speedFactor, options));
        }
      });
    });

    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  private update(deltaSeconds: number, trailLength: number, noHandsDetected: boolean): void {
    const drag = 0.985;
    const fadeMultiplier = noHandsDetected ? 3.2 : 1;
    const growth = 2.2 + trailLength * 3.4;

    this.particles = this.particles.filter((particle) => {
      particle.age += deltaSeconds * fadeMultiplier;
      particle.previousPosition = { ...particle.position };
      particle.velocity.x *= drag;
      particle.velocity.y *= drag;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;
      particle.radius = Math.min(
        particle.maxRadius,
        particle.radius + deltaSeconds * growth,
      );

      return particle.age < particle.life;
    });
  }

  private draw(context: CanvasRenderingContext2D, options: LightRenderOptions): void {
    context.save();
    context.globalCompositeOperation = "lighter";

    this.particles.forEach((particle) => {
      const progress = particle.age / particle.life;
      const modeAlpha = options.mode === "art" ? 0.9 : options.mode === "hybrid" ? 0.62 : 0.48;
      const alpha = Math.pow(1 - progress, 2.1) * options.intensity * modeAlpha;
      const radius = Math.min(particle.maxRadius, particle.radius * (1 + progress * 0.55));
      const glowRadius = Math.min(particle.maxRadius * 2.65, radius * 2.35);
      const gradient = context.createRadialGradient(
        particle.position.x,
        particle.position.y,
        0,
        particle.position.x,
        particle.position.y,
        glowRadius,
      );

      gradient.addColorStop(0, withAlpha(particle.coreColor, alpha));
      gradient.addColorStop(0.22, withAlpha(particle.color, alpha * 0.58));
      gradient.addColorStop(1, withAlpha(particle.color, 0));

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(particle.position.x, particle.position.y, glowRadius, 0, Math.PI * 2);
      context.fill();

      if (particle.speedHint > 0) {
        context.strokeStyle = withAlpha(particle.color, alpha * 0.44);
        context.lineWidth = Math.max(1, radius * 0.32);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(particle.previousPosition.x, particle.previousPosition.y);
        context.lineTo(particle.position.x, particle.position.y);
        context.stroke();
      }
    });

    context.restore();
  }
}

function createParticle(
  finger: FingerState,
  style: FingerLightStyle,
  speedFactor: number,
  options: LightRenderOptions,
): LightParticle {
  const angle = Math.random() * Math.PI * 2;
  const spread = style.spread * (0.35 + Math.random() * 0.65);
  const followStrength = clamp(speedFactor, 0, 1.8);
  const randomVelocity = {
    x: Math.cos(angle) * spread + finger.velocity.x * 0.035 * followStrength,
    y: Math.sin(angle) * spread + finger.velocity.y * 0.035 * followStrength,
  };
  const wobble = (Math.random() - 0.5) * style.drift;
  const life =
    style.life *
    (0.75 + Math.random() * 0.45) *
    (0.75 + options.trailLength * 0.55) *
    (1 + clamp(speedFactor, 0, 1.8) * 0.18);

  return {
    position: {
      x: finger.canvasPosition.x + (Math.random() - 0.5) * style.radius * 0.6,
      y: finger.canvasPosition.y + (Math.random() - 0.5) * style.radius * 0.6,
    },
    previousPosition: finger.canvasPosition,
    velocity: {
      x: randomVelocity.x + wobble,
      y: randomVelocity.y - style.drift * 0.15,
    },
    age: 0,
    life,
    radius: style.radius * (0.75 + Math.random() * 0.8),
    maxRadius: style.maxRadius * (0.8 + Math.random() * 0.35),
    color: style.color,
    coreColor: style.coreColor,
    wobble,
    speedHint: speedFactor,
  };
}

export function drawFingerSources(
  context: CanvasRenderingContext2D,
  hands: HandSnapshot[],
  intensity: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";

  hands.forEach((hand) => {
    hand.fingers.forEach((finger) => {
      if (!finger.isExtended) {
        return;
      }

      const style = FINGER_LIGHT_STYLES[finger.name];
      const alpha = 0.58 * intensity * smoothstep(0.5, 1, finger.extension);
      const radius = Math.min(style.maxRadius, style.radius * 2.15);
      const gradient = context.createRadialGradient(
        finger.canvasPosition.x,
        finger.canvasPosition.y,
        0,
        finger.canvasPosition.x,
        finger.canvasPosition.y,
        radius * 3,
      );

      gradient.addColorStop(0, withAlpha(style.coreColor, alpha));
      gradient.addColorStop(0.32, withAlpha(style.color, alpha * finger.extension));
      gradient.addColorStop(1, withAlpha(style.color, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(finger.canvasPosition.x, finger.canvasPosition.y, radius * 2.35, 0, Math.PI * 2);
      context.fill();
    });
  });

  context.restore();
}

function withAlpha(color: string, alpha: number): string {
  return color.replace(/rgba\\(([^,]+), ([^,]+), ([^,]+), [^)]+\\)/, (_, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
