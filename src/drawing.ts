import { drawFingerSources, LightParticleSystem } from "./lightParticles";
import { toCanvasPoint } from "./fingerGesture";
import type { DisplayMode, HandSnapshot, TrackingFrame } from "./types";

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

const HAND_COLORS = ["#00c2ff", "#ffb000"];

const particleSystem = new LightParticleSystem();
let previousDrawTimestamp = 0;

export function syncCanvasToVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
): void {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  stage.style.aspectRatio = `${width} / ${height}`;
}

export function drawTrackingFrame(
  canvas: HTMLCanvasElement,
  frame: TrackingFrame,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const deltaSeconds =
    previousDrawTimestamp === 0
      ? 1 / 60
      : Math.min(0.08, (frame.timestamp - previousDrawTimestamp) / 1000);
  previousDrawTimestamp = frame.timestamp;

  drawBackground(context, canvas.width, canvas.height, frame.displayMode);

  if (frame.displayMode !== "art") {
    frame.hands.forEach((hand, index) => {
      drawHand(
        context,
        hand,
        canvas.width,
        canvas.height,
        frame.mirrorEnabled,
        index,
        frame.displayMode,
      );
    });
  }

  particleSystem.updateAndDraw(context, frame.hands, deltaSeconds, {
    intensity: frame.lightIntensity,
    trailLength: frame.trailLength,
    mode: frame.displayMode,
  });
  drawFingerSources(context, frame.hands, frame.lightIntensity);
}

function drawHand(
  context: CanvasRenderingContext2D,
  hand: HandSnapshot,
  width: number,
  height: number,
  mirrorEnabled: boolean,
  handIndex: number,
  mode: DisplayMode,
): void {
  const color = HAND_COLORS[handIndex % HAND_COLORS.length];
  const skeletonAlpha = mode === "hybrid" ? 0.28 : 1;
  const landmarkAlpha = mode === "hybrid" ? 0.55 : 1;
  const showLabels = mode === "debug";

  context.lineWidth = Math.max(2, width * 0.003);
  context.lineCap = "round";
  context.strokeStyle = withAlpha(color, skeletonAlpha);

  HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = hand.landmarks[startIndex];
    const end = hand.landmarks[endIndex];

    if (!start || !end) {
      return;
    }

    const startPoint = toCanvasPoint(start, width, height, mirrorEnabled);
    const endPoint = toCanvasPoint(end, width, height, mirrorEnabled);

    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
  });

  hand.landmarks.forEach((landmark, index) => {
    const point = toCanvasPoint(landmark, width, height, mirrorEnabled);
    const radius = index === 4 || index === 8 ? 7 : 5;

    context.beginPath();
    context.fillStyle =
      index === 8
        ? withAlpha("#57f287", landmarkAlpha)
        : index === 4
          ? withAlpha("#ff5c8a", landmarkAlpha)
          : withAlpha(color, landmarkAlpha);
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 2;
    context.strokeStyle = "#071018";
    context.stroke();

    if (showLabels) {
      drawLandmarkLabel(context, String(index), point.x, point.y);
    }
  });

  if (mode === "debug") {
    drawFingerExtensionLabels(context, hand);
  }
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: DisplayMode,
): void {
  context.clearRect(0, 0, width, height);

  if (mode === "art") {
    const gradient = context.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );

    gradient.addColorStop(0, "rgba(16, 22, 34, 0.38)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.68)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
}

function drawLandmarkLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
): void {
  context.font = "13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textBaseline = "middle";

  const paddingX = 4;
  const textWidth = context.measureText(label).width;
  const labelX = clamp(x + 8, 2, context.canvas.width - textWidth - paddingX * 2 - 2);
  const labelY = clamp(y - 10, 10, context.canvas.height - 10);

  context.fillStyle = "rgba(7, 16, 24, 0.78)";
  context.fillRect(labelX - paddingX, labelY - 8, textWidth + paddingX * 2, 16);

  context.fillStyle = "#ffffff";
  context.fillText(label, labelX, labelY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function drawFingerExtensionLabels(
  context: CanvasRenderingContext2D,
  hand: HandSnapshot,
): void {
  context.save();
  context.font = "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textBaseline = "middle";

  hand.fingers.forEach((finger) => {
    const label = finger.isExtended ? `${finger.label} ON` : `${finger.label} off`;
    const x = finger.canvasPosition.x + 12;
    const y = finger.canvasPosition.y + 14;
    const textWidth = context.measureText(label).width;

    context.fillStyle = finger.isExtended
      ? "rgba(87, 242, 135, 0.82)"
      : "rgba(7, 16, 24, 0.72)";
    context.fillRect(x - 4, y - 8, textWidth + 8, 16);
    context.fillStyle = finger.isExtended ? "#03110a" : "#d6e2ee";
    context.fillText(label, x, y);
  });

  context.restore();
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const value = Number.parseInt(hex.length === 3 ? expandHex(hex) : hex, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color.replace(/rgba\\(([^,]+), ([^,]+), ([^,]+), [^)]+\\)/, (_, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
}

function expandHex(hex: string): string {
  return hex
    .split("")
    .map((character) => character + character)
    .join("");
}
