import { toCanvasPoint } from "./fingerGesture";
import type { DisplayMode, HandInteraction, HandSnapshot, TrackingFrame } from "./types";
import type { WordWorld } from "./wordPhysics";

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

export function drawScene(
  canvas: HTMLCanvasElement,
  frame: TrackingFrame,
  wordWorld: WordWorld,
  interactions: HandInteraction[],
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawModeBackground(context, canvas.width, canvas.height, frame.displayMode);
  if (frame.displayMode !== "debug") {
    wordWorld.draw(context);
    drawInteractionCursors(context, interactions, frame.displayMode);
  }

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
  const landmarkAlpha = mode === "hybrid" ? 0.42 : 1;
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
    context.strokeStyle = "rgba(7, 16, 24, 0.86)";
    context.stroke();

    if (showLabels) {
      drawLandmarkLabel(context, String(index), point.x, point.y);
    }
  });
}

function drawInteractionCursors(
  context: CanvasRenderingContext2D,
  interactions: HandInteraction[],
  mode: DisplayMode,
): void {
  if (mode === "debug") {
    return;
  }

  context.save();
  interactions.forEach((hand) => {
    const radius = hand.isPinching ? 18 : 11;

    context.strokeStyle = hand.isPinching
      ? "rgba(255, 116, 167, 0.88)"
      : "rgba(87, 242, 135, 0.75)";
    context.lineWidth = hand.isPinching ? 3 : 2;
    context.beginPath();
    context.arc(hand.indexFingerTip.x, hand.indexFingerTip.y, radius, 0, Math.PI * 2);
    context.stroke();

    if (hand.isPinching) {
      context.beginPath();
      context.moveTo(hand.thumbTip.x, hand.thumbTip.y);
      context.lineTo(hand.indexFingerTip.x, hand.indexFingerTip.y);
      context.stroke();
    }
  });
  context.restore();
}

function drawModeBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: DisplayMode,
): void {
  if (mode === "debug") {
    return;
  }

  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.45,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72,
  );

  gradient.addColorStop(0, "rgba(21, 34, 45, 0.3)");
  gradient.addColorStop(1, "rgba(6, 8, 12, 0.62)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
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

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const value = Number.parseInt(color.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
