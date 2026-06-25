import "./style.css";
import { startCamera, stopCamera } from "./camera";
import { drawZoomScene, loadSampleImage, syncCanvasToVideo } from "./drawing";
import { HandTrackingService } from "./handTracking";
import type { TrackingFrame } from "./types";
import { createUI } from "./ui";
import { createZoomHandPoints, ZoomController } from "./zoomController";

const ui = createUI();
const handTracking = new HandTrackingService();
const zoomController = new ZoomController();
const sampleImage = loadSampleImage();

let animationFrameId = 0;
let fps = 0;
let previousFrameTime = performance.now();
let isRunning = false;

ui.onMirrorChange(() => undefined);
ui.onSmoothingChange(() => undefined);
ui.onRetry(() => {
  void bootstrap();
});
ui.onResetZoom(() => {
  zoomController.reset();
});

void bootstrap();

async function bootstrap(): Promise<void> {
  cancelAnimationFrame(animationFrameId);
  stopCamera(ui.video);
  fps = 0;
  previousFrameTime = performance.now();
  isRunning = false;
  zoomController.reset();
  ui.clearError();

  try {
    ui.setStatus("Requesting camera");
    ui.setStageMessage("Allow camera access to start", true);

    await startCamera(ui.video).catch((error: unknown) => {
      throw new StartupError("camera", getCameraErrorMessage(error), error);
    });
    syncCanvasToVideo(ui.video, ui.canvas, ui.stage);

    ui.setStatus("Loading model");
    ui.setStageMessage("Loading hand model", true);
    await handTracking.initialize().catch((error: unknown) => {
      throw new StartupError("model", getModelErrorMessage(error), error);
    });

    ui.setStatus("Show both hands");
    ui.setStageMessage("", false);

    isRunning = true;
    animationFrameId = requestAnimationFrame(loop);
  } catch (error) {
    const message = getStartupErrorMessage(error);
    console.error("Hand zoom startup failed:", error);
    ui.setError(message);
    ui.setStageMessage(message, true);
    cancelAnimationFrame(animationFrameId);
  }
}

function loop(timestampMs: number): void {
  if (!isRunning) {
    return;
  }

  syncCanvasToVideo(ui.video, ui.canvas, ui.stage);
  updateFps(timestampMs);

  const frame: TrackingFrame = {
    timestamp: Date.now(),
    fps,
    hands: [],
    mirrorEnabled: ui.getMirrorEnabled(),
    smoothingEnabled: ui.getSmoothingEnabled(),
  };

  if (ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    frame.hands = handTracking.detect(
      ui.video,
      timestampMs,
      frame.smoothingEnabled,
    );
  }

  const zoomHands = createZoomHandPoints(
    frame.hands,
    ui.canvas.width,
    ui.canvas.height,
    frame.mirrorEnabled,
  );
  const zoomState = zoomController.update(zoomHands);

  drawZoomScene(ui.canvas, ui.video, frame, zoomState, zoomHands, sampleImage);
  ui.renderFrame(frame, zoomState);

  animationFrameId = requestAnimationFrame(loop);
}

function updateFps(timestampMs: number): void {
  const delta = timestampMs - previousFrameTime;
  previousFrameTime = timestampMs;

  if (delta <= 0) {
    return;
  }

  const currentFps = 1000 / delta;
  fps = fps === 0 ? currentFps : fps * 0.9 + currentFps * 0.1;
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera permission was denied. Allow camera access in the browser, then press Retry Camera. If the in-app browser cannot grant camera access, open this URL in Chrome, Edge, or Safari.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found on this device.";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The camera is already in use or cannot be started.";
    }

    if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
      return "The requested camera settings are not available on this device.";
    }

    if (error.name === "SecurityError") {
      return "Camera access is blocked by this browser context. Open the app on localhost, 127.0.0.1, or HTTPS.";
    }

    return `${error.name}: ${error.message || "Camera access failed."}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `Camera could not be started. Details: ${String(error)}`;
}

function getModelErrorMessage(error: unknown): string {
  const detail = getUnknownErrorMessage(error);

  return `Hand model could not be loaded. MediaPipe files are served from /mediapipe/wasm and /mediapipe/models. Details: ${detail}`;
}

function getStartupErrorMessage(error: unknown): string {
  if (error instanceof StartupError) {
    return error.message;
  }

  return getUnknownErrorMessage(error);
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error instanceof DOMException) {
    return `${error.name}: ${error.message}`;
  }

  if (error instanceof Event) {
    const target = error.target;
    const source =
      target instanceof HTMLScriptElement
        ? target.src
        : target instanceof HTMLLinkElement
          ? target.href
          : "";

    return source
      ? `${error.type} event while loading ${source}`
      : `${error.type} event while loading a browser resource`;
  }

  return String(error);
}

class StartupError extends Error {
  constructor(
    readonly step: "camera" | "model",
    message: string,
    readonly cause: unknown,
  ) {
    super(`${step === "camera" ? "Camera" : "MediaPipe"} startup failed: ${message}`);
    this.name = "StartupError";
  }
}
