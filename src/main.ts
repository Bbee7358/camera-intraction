import "./style.css";
import { drawTrackingFrame, syncCanvasToVideo } from "./drawing";
import { FingerGestureAnalyzer } from "./fingerGesture";
import { HandTrackingService } from "./handTracking";
import type { TrackingFrame } from "./types";
import { createDownloadPayload, createUI, downloadJson } from "./ui";

const ui = createUI();
const handTracking = new HandTrackingService();
const fingerGesture = new FingerGestureAnalyzer();

let animationFrameId = 0;
let latestFrame: TrackingFrame | null = null;
let fps = 0;
let previousFrameTime = performance.now();
let isRunning = false;

ui.onMirrorChange(setMirrorEnabled);
ui.onSmoothingChange(() => undefined);
ui.onCameraVisibleChange(updateVideoPresentation);
ui.onDisplayModeChange(updateVideoPresentation);
ui.onTrailLengthChange(() => undefined);
ui.onLightIntensityChange(() => undefined);
ui.onDownload(downloadCurrentFrame);
ui.onRetry(() => {
  void bootstrap();
});

void bootstrap();

async function bootstrap(): Promise<void> {
  cancelAnimationFrame(animationFrameId);
  stopCamera(ui.video);
  latestFrame = null;
  fps = 0;
  previousFrameTime = performance.now();
  isRunning = false;
  fingerGesture.reset();
  ui.clearError();
  ui.setDownloadEnabled(false);

  try {
    ui.setStatus("Requesting camera");
    ui.setStageMessage("Allow camera access to start", true);

    await startCamera(ui.video).catch((error: unknown) => {
      throw new StartupError("camera", getCameraErrorMessage(error), error);
    });
    syncCanvasToVideo(ui.video, ui.canvas, ui.stage);
    setMirrorEnabled(ui.getMirrorEnabled());
    updateVideoPresentation();

    ui.setStatus("Loading model");
    ui.setStageMessage("Loading hand model", true);
    await handTracking.initialize().catch((error: unknown) => {
      throw new StartupError("model", getModelErrorMessage(error), error);
    });

    ui.setStatus("Running");
    ui.setStageMessage("No hand detected", true);

    isRunning = true;
    animationFrameId = requestAnimationFrame(loop);
  } catch (error) {
    const message = getStartupErrorMessage(error);
    console.error("Hand debugger startup failed:", error);
    ui.setError(message);
    ui.setStageMessage(message, true);
    cancelAnimationFrame(animationFrameId);
  }
}

async function startCamera(video: HTMLVideoElement): Promise<void> {
  if (!window.isSecureContext) {
    throw new Error(
      "Camera access requires a secure context. Use http://localhost, http://127.0.0.1, or HTTPS.",
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera API is not supported in this browser. If you are using the Codex in-app browser, open the Vite URL in Chrome, Edge, or Safari.",
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  video.srcObject = stream;
  await waitForVideoMetadata(video);
  await video.play();
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
    displayMode: ui.getDisplayMode(),
    cameraVisible: ui.getCameraVisible(),
    trailLength: ui.getTrailLength(),
    lightIntensity: ui.getLightIntensity(),
  };

  if (ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const detectedHands = handTracking.detect(
      ui.video,
      timestampMs,
      frame.smoothingEnabled,
    );
    frame.hands = fingerGesture.analyzeHands(
      detectedHands,
      timestampMs,
      ui.canvas.width,
      ui.canvas.height,
      frame.mirrorEnabled,
    );
  }

  latestFrame = frame;
  drawTrackingFrame(ui.canvas, frame);
  ui.renderFrame(frame);
  ui.setDownloadEnabled(frame.hands.length > 0);
  ui.setStageMessage("No hand detected", frame.hands.length === 0);

  animationFrameId = requestAnimationFrame(loop);
}

function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject;

  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  video.srcObject = null;
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera stream started, but video metadata did not load."));
    }, 5000);

    const cleanup = (): void => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };

    const onLoadedMetadata = (): void => {
      cleanup();
      resolve();
    };

    const onError = (): void => {
      cleanup();
      reject(new Error("The camera video element failed to load the stream."));
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function setMirrorEnabled(enabled: boolean): void {
  ui.video.style.transform = enabled ? "scaleX(-1)" : "none";
}

function updateVideoPresentation(): void {
  const mode = ui.getDisplayMode();
  const visible = ui.getCameraVisible();

  ui.video.classList.toggle("is-hidden-camera", !visible);
  ui.video.classList.toggle("is-art-camera", visible && mode === "art");
  ui.video.classList.toggle("is-hybrid-camera", visible && mode === "hybrid");
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

function downloadCurrentFrame(): void {
  if (!latestFrame || latestFrame.hands.length === 0) {
    return;
  }

  downloadJson(createDownloadPayload(latestFrame));
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
