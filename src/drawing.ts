import type { HandSnapshot, LandmarkPoint, TrackingFrame } from "./types";

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

export function drawTrackingFrame(
  canvas: HTMLCanvasElement,
  frame: TrackingFrame,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  frame.hands.forEach((hand, index) => {
    drawHand(context, hand, canvas.width, canvas.height, frame.mirrorEnabled, index);
  });
}

function drawHand(
  context: CanvasRenderingContext2D,
  hand: HandSnapshot,
  width: number,
  height: number,
  mirrorEnabled: boolean,
  handIndex: number,
): void {
  const color = HAND_COLORS[handIndex % HAND_COLORS.length];

  context.lineWidth = Math.max(2, width * 0.003);
  context.lineCap = "round";
  context.strokeStyle = color;

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
    context.fillStyle = index === 8 ? "#57f287" : index === 4 ? "#ff5c8a" : color;
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 2;
    context.strokeStyle = "#071018";
    context.stroke();

    drawLandmarkLabel(context, String(index), point.x, point.y);
  });
}

function toCanvasPoint(
  landmark: LandmarkPoint,
  width: number,
  height: number,
  mirrorEnabled: boolean,
): { x: number; y: number } {
  return {
    x: (mirrorEnabled ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height,
  };
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
