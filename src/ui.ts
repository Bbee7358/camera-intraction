import type { DisplayMode, DownloadPayload, TrackingFrame } from "./types";
import { getExtendedFingerLabels } from "./fingerGesture";

type ToggleCallback = (enabled: boolean) => void;
type DownloadCallback = () => void;
type RetryCallback = () => void;
type ModeCallback = (mode: DisplayMode) => void;
type NumberCallback = (value: number) => void;

export interface UIController {
  readonly video: HTMLVideoElement;
  readonly canvas: HTMLCanvasElement;
  readonly stage: HTMLElement;
  getMirrorEnabled: () => boolean;
  getSmoothingEnabled: () => boolean;
  getDisplayMode: () => DisplayMode;
  getCameraVisible: () => boolean;
  getTrailLength: () => number;
  getLightIntensity: () => number;
  setStatus: (message: string) => void;
  setError: (message: string) => void;
  clearError: () => void;
  setStageMessage: (message: string, visible: boolean) => void;
  setDownloadEnabled: (enabled: boolean) => void;
  renderFrame: (frame: TrackingFrame) => void;
  onMirrorChange: (callback: ToggleCallback) => void;
  onSmoothingChange: (callback: ToggleCallback) => void;
  onCameraVisibleChange: (callback: ToggleCallback) => void;
  onDisplayModeChange: (callback: ModeCallback) => void;
  onTrailLengthChange: (callback: NumberCallback) => void;
  onLightIntensityChange: (callback: NumberCallback) => void;
  onDownload: (callback: DownloadCallback) => void;
  onRetry: (callback: RetryCallback) => void;
}

export function createUI(): UIController {
  const video = getElement<HTMLVideoElement>("cameraVideo");
  const canvas = getElement<HTMLCanvasElement>("overlayCanvas");
  const stage = getElement<HTMLElement>("stage");
  const statusMessage = getElement<HTMLElement>("statusMessage");
  const stageMessage = getElement<HTMLElement>("stageMessage");
  const errorMessage = getElement<HTMLElement>("errorMessage");
  const mirrorToggle = getElement<HTMLInputElement>("mirrorToggle");
  const smoothingToggle = getElement<HTMLInputElement>("smoothingToggle");
  const cameraToggle = getElement<HTMLInputElement>("cameraToggle");
  const trailSlider = getElement<HTMLInputElement>("trailSlider");
  const lightSlider = getElement<HTMLInputElement>("lightSlider");
  const trailValue = getElement<HTMLElement>("trailValue");
  const lightValue = getElement<HTMLElement>("lightValue");
  const retryButton = getElement<HTMLButtonElement>("retryButton");
  const downloadButton = getElement<HTMLButtonElement>("downloadButton");
  const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".mode-button"));
  const fpsValue = getElement<HTMLElement>("fpsValue");
  const handCountValue = getElement<HTMLElement>("handCountValue");
  const handCountBadge = getElement<HTMLElement>("handCountBadge");
  const mirrorValue = getElement<HTMLElement>("mirrorValue");
  const smoothingValue = getElement<HTMLElement>("smoothingValue");
  const modeValue = getElement<HTMLElement>("modeValue");
  const cameraValue = getElement<HTMLElement>("cameraValue");
  const handsDebug = getElement<HTMLElement>("handsDebug");

  const mirrorCallbacks = new Set<ToggleCallback>();
  const smoothingCallbacks = new Set<ToggleCallback>();
  const cameraCallbacks = new Set<ToggleCallback>();
  const modeCallbacks = new Set<ModeCallback>();
  const trailCallbacks = new Set<NumberCallback>();
  const lightCallbacks = new Set<NumberCallback>();
  const downloadCallbacks = new Set<DownloadCallback>();
  const retryCallbacks = new Set<RetryCallback>();
  let displayMode: DisplayMode = "debug";

  mirrorToggle.addEventListener("change", () => {
    mirrorValue.textContent = mirrorToggle.checked ? "ON" : "OFF";
    mirrorCallbacks.forEach((callback) => callback(mirrorToggle.checked));
  });

  smoothingToggle.addEventListener("change", () => {
    smoothingValue.textContent = smoothingToggle.checked ? "ON" : "OFF";
    smoothingCallbacks.forEach((callback) => callback(smoothingToggle.checked));
  });

  cameraToggle.addEventListener("change", () => {
    cameraValue.textContent = cameraToggle.checked ? "ON" : "OFF";
    cameraCallbacks.forEach((callback) => callback(cameraToggle.checked));
  });

  trailSlider.addEventListener("input", () => {
    trailValue.textContent = Number(trailSlider.value).toFixed(2);
    trailCallbacks.forEach((callback) => callback(Number(trailSlider.value)));
  });

  lightSlider.addEventListener("input", () => {
    lightValue.textContent = Number(lightSlider.value).toFixed(2);
    lightCallbacks.forEach((callback) => callback(Number(lightSlider.value)));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      displayMode = normalizeDisplayMode(button.dataset.mode);
      modeButtons.forEach((modeButton) => {
        modeButton.classList.toggle(
          "is-active",
          normalizeDisplayMode(modeButton.dataset.mode) === displayMode,
        );
      });
      modeValue.textContent = toModeLabel(displayMode);
      modeCallbacks.forEach((callback) => callback(displayMode));
    });
  });

  downloadButton.addEventListener("click", () => {
    downloadCallbacks.forEach((callback) => callback());
  });

  retryButton.addEventListener("click", () => {
    retryCallbacks.forEach((callback) => callback());
  });

  return {
    video,
    canvas,
    stage,
    getMirrorEnabled: () => mirrorToggle.checked,
    getSmoothingEnabled: () => smoothingToggle.checked,
    getDisplayMode: () => displayMode,
    getCameraVisible: () => cameraToggle.checked,
    getTrailLength: () => Number(trailSlider.value),
    getLightIntensity: () => Number(lightSlider.value),
    setStatus: (message: string) => {
      statusMessage.textContent = message;
    },
    setError: (message: string) => {
      errorMessage.hidden = false;
      errorMessage.textContent = message;
      statusMessage.textContent = "Error";
    },
    clearError: () => {
      errorMessage.hidden = true;
      errorMessage.textContent = "";
    },
    setStageMessage: (message: string, visible: boolean) => {
      stageMessage.textContent = message;
      stageMessage.hidden = !visible;
    },
    setDownloadEnabled: (enabled: boolean) => {
      downloadButton.disabled = !enabled;
    },
    renderFrame: (frame: TrackingFrame) => {
      fpsValue.textContent = frame.fps.toFixed(1);
      handCountValue.textContent = String(frame.hands.length);
      handCountBadge.textContent = `${frame.hands.length} hand${
        frame.hands.length === 1 ? "" : "s"
      }`;
      mirrorValue.textContent = frame.mirrorEnabled ? "ON" : "OFF";
      smoothingValue.textContent = frame.smoothingEnabled ? "ON" : "OFF";
      modeValue.textContent = toModeLabel(frame.displayMode);
      cameraValue.textContent = frame.cameraVisible ? "ON" : "OFF";
      handsDebug.replaceChildren(...renderHandDebug(frame));
    },
    onMirrorChange: (callback: ToggleCallback) => {
      mirrorCallbacks.add(callback);
    },
    onSmoothingChange: (callback: ToggleCallback) => {
      smoothingCallbacks.add(callback);
    },
    onCameraVisibleChange: (callback: ToggleCallback) => {
      cameraCallbacks.add(callback);
    },
    onDisplayModeChange: (callback: ModeCallback) => {
      modeCallbacks.add(callback);
    },
    onTrailLengthChange: (callback: NumberCallback) => {
      trailCallbacks.add(callback);
    },
    onLightIntensityChange: (callback: NumberCallback) => {
      lightCallbacks.add(callback);
    },
    onDownload: (callback: DownloadCallback) => {
      downloadCallbacks.add(callback);
    },
    onRetry: (callback: RetryCallback) => {
      retryCallbacks.add(callback);
    },
  };
}

export function createDownloadPayload(frame: TrackingFrame): DownloadPayload {
  return {
    timestamp: frame.timestamp,
    isoTime: new Date(frame.timestamp).toISOString(),
    fps: frame.fps,
    mirrorEnabled: frame.mirrorEnabled,
    smoothingEnabled: frame.smoothingEnabled,
    hands: frame.hands.map((hand) => ({
      handedness: hand.handedness,
      handednessScore: hand.handednessScore,
      landmarks: hand.landmarks,
      rawLandmarks: hand.rawLandmarks,
      fingers: hand.fingers,
      indexFingerTip: hand.indexFingerTip,
      thumbTip: hand.thumbTip,
      thumbIndexDistance: hand.thumbIndexDistance,
      pinch: hand.pinch,
    })),
  };
}

export function downloadJson(payload: DownloadPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTimestamp = payload.isoTime.replace(/[:.]/g, "-");

  anchor.href = url;
  anchor.download = `hand-landmarks-${safeTimestamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderHandDebug(frame: TrackingFrame): HTMLElement[] {
  if (frame.hands.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-debug";
    empty.textContent = "No hand detected";
    return [empty];
  }

  return frame.hands.map((hand, index) => {
    const card = document.createElement("section");
    card.className = `hand-card ${hand.pinch ? "is-pinching" : ""}`;

    const title = document.createElement("div");
    title.className = "hand-title";
    title.innerHTML = `<strong>Hand ${index + 1}</strong><span>${hand.handedness} ${(
      hand.handednessScore * 100
    ).toFixed(1)}%</span>`;
    card.append(title);

    card.append(
      debugLine("landmark 8", formatPoint(hand.indexFingerTip)),
      debugLine("landmark 4-8", hand.thumbIndexDistance.toFixed(4)),
      debugLine("pinch", hand.pinch ? "true" : "false"),
      debugLine(
        "extended",
        getExtendedFingerLabels(hand).join(", ") || "none",
      ),
    );

    return card;
  });
}

function normalizeDisplayMode(value: string | undefined): DisplayMode {
  if (value === "art" || value === "hybrid") {
    return value;
  }

  return "debug";
}

function toModeLabel(mode: DisplayMode): string {
  if (mode === "art") {
    return "Art";
  }

  if (mode === "hybrid") {
    return "Hybrid";
  }

  return "Debug";
}

function debugLine(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "debug-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  row.append(labelElement, valueElement);
  return row;
}

function formatPoint(point: { x: number; y: number; z: number }): string {
  return `${point.x.toFixed(4)}, ${point.y.toFixed(4)}, ${point.z.toFixed(4)}`;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: #${id}`);
  }

  return element as T;
}
