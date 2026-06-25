import type { CanvasPoint, HandSnapshot, TrackingFrame, ZoomHandPoint, ZoomState } from "./types";

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

const PREVIEW_WIDTH_RATIO = 0.24;
const PREVIEW_MARGIN = 24;

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

export function drawZoomScene(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: TrackingFrame,
  zoomState: ZoomState,
  zoomHands: ZoomHandPoint[],
  image: HTMLImageElement | null,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height);
  drawMainContent(context, canvas.width, canvas.height, zoomState.currentScale, image);
  drawHud(context, zoomState, frame.fps);
  drawCameraPreview(context, video, frame, zoomHands);
}

export function loadSampleImage(): HTMLImageElement {
  const image = new Image();
  image.src = "/sample.jpg";
  return image;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.45,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78,
  );

  gradient.addColorStop(0, "#111923");
  gradient.addColorStop(1, "#020408");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawMainContent(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  image: HTMLImageElement | null,
): void {
  context.save();
  context.translate(width * 0.5, height * 0.5);
  context.scale(scale, scale);

  if (image?.complete && image.naturalWidth > 0) {
    const maxWidth = width * 0.62;
    const maxHeight = height * 0.72;
    const imageScale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * imageScale;
    const drawHeight = image.naturalHeight * imageScale;

    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } else {
    drawPlaceholderTarget(context, width, height);
  }

  context.restore();
}

function drawPlaceholderTarget(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const targetWidth = width * 0.52;
  const targetHeight = height * 0.58;
  const grid = 44;

  context.save();
  context.fillStyle = "rgba(16, 26, 36, 0.88)";
  roundedRect(context, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight, 24);
  context.fill();

  context.strokeStyle = "rgba(110, 210, 255, 0.22)";
  context.lineWidth = 1;

  for (let x = -targetWidth / 2; x <= targetWidth / 2; x += grid) {
    context.beginPath();
    context.moveTo(x, -targetHeight / 2);
    context.lineTo(x, targetHeight / 2);
    context.stroke();
  }

  for (let y = -targetHeight / 2; y <= targetHeight / 2; y += grid) {
    context.beginPath();
    context.moveTo(-targetWidth / 2, y);
    context.lineTo(targetWidth / 2, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(255, 255, 255, 0.74)";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, Math.min(targetWidth, targetHeight) * 0.22, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(87, 242, 135, 0.8)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-targetWidth * 0.18, 0);
  context.lineTo(targetWidth * 0.18, 0);
  context.moveTo(0, -targetHeight * 0.18);
  context.lineTo(0, targetHeight * 0.18);
  context.stroke();

  context.fillStyle = "rgba(235, 248, 255, 0.9)";
  context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ZOOM TARGET", 0, targetHeight * 0.32);
  context.restore();
}

function drawHud(
  context: CanvasRenderingContext2D,
  zoomState: ZoomState,
  fps: number,
): void {
  const x = 28;
  const y = 28;
  const width = 330;
  const height = 126;

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  roundedRect(context, x, y, width, height, 14);
  context.fill();

  context.fillStyle = zoomState.isActive ? "#57f287" : "#d6e2ee";
  context.font = "700 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(zoomState.isActive ? "ZOOM ACTIVE" : zoomState.statusMessage, x + 18, y + 16);

  context.fillStyle = "#ffffff";
  context.font = "700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(`Scale: ${zoomState.currentScale.toFixed(2)}x`, x + 18, y + 52);

  context.fillStyle = "rgba(214, 226, 238, 0.82)";
  context.font = "14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(`FPS: ${fps.toFixed(1)}`, x + 18, y + 94);
  context.restore();
}

function drawCameraPreview(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  frame: TrackingFrame,
  zoomHands: ZoomHandPoint[],
): void {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const previewWidth = Math.max(260, context.canvas.width * PREVIEW_WIDTH_RATIO);
  const previewHeight = previewWidth * (video.videoHeight / Math.max(video.videoWidth, 1));
  const x = context.canvas.width - previewWidth - PREVIEW_MARGIN;
  const y = context.canvas.height - previewHeight - PREVIEW_MARGIN;

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.52)";
  roundedRect(context, x - 8, y - 8, previewWidth + 16, previewHeight + 16, 14);
  context.fill();
  context.beginPath();
  roundedRect(context, x, y, previewWidth, previewHeight, 10);
  context.clip();

  if (frame.mirrorEnabled) {
    context.translate(x + previewWidth, y);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, previewWidth, previewHeight);
    context.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    context.drawImage(video, x, y, previewWidth, previewHeight);
  }

  drawPreviewHands(context, frame, x, y, previewWidth, previewHeight, zoomHands);
  context.restore();
}

function drawPreviewHands(
  context: CanvasRenderingContext2D,
  frame: TrackingFrame,
  x: number,
  y: number,
  width: number,
  height: number,
  zoomHands: ZoomHandPoint[],
): void {
  context.lineWidth = 2;
  context.lineCap = "round";

  frame.hands.forEach((hand, handIndex) => {
    const color = handIndex === 0 ? "#00c2ff" : "#ffb000";

    context.strokeStyle = color;
    HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = hand.landmarks[startIndex];
      const end = hand.landmarks[endIndex];

      if (!start || !end) {
        return;
      }

      const startPoint = toPreviewPoint(start, x, y, width, height, frame.mirrorEnabled);
      const endPoint = toPreviewPoint(end, x, y, width, height, frame.mirrorEnabled);

      context.beginPath();
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(endPoint.x, endPoint.y);
      context.stroke();
    });

    hand.landmarks.forEach((landmark, index) => {
      const point = toPreviewPoint(landmark, x, y, width, height, frame.mirrorEnabled);
      const isIndexTip = index === 8;

      context.fillStyle = isIndexTip ? "#57f287" : color;
      context.beginPath();
      context.arc(point.x, point.y, isIndexTip ? 5 : 3, 0, Math.PI * 2);
      context.fill();
    });
  });

  zoomHands.forEach((hand) => {
    const point = scaleCanvasPointToPreview(hand.indexFingerTip, context.canvas, x, y, width, height);

    context.fillStyle = hand.isPinching ? "#ff5c8a" : "#57f287";
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fill();
  });
}

function toPreviewPoint(
  landmark: { x: number; y: number },
  x: number,
  y: number,
  width: number,
  height: number,
  mirrorEnabled: boolean,
): CanvasPoint {
  return {
    x: x + (mirrorEnabled ? 1 - landmark.x : landmark.x) * width,
    y: y + landmark.y * height,
  };
}

function scaleCanvasPointToPreview(
  point: CanvasPoint,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): CanvasPoint {
  return {
    x: x + (point.x / canvas.width) * width,
    y: y + (point.y / canvas.height) * height,
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}
