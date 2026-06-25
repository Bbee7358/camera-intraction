import type { TrackingFrame, ZoomState } from "./types";

type ToggleCallback = (enabled: boolean) => void;
type RetryCallback = () => void;
type ResetZoomCallback = () => void;

export interface UIController {
  readonly video: HTMLVideoElement;
  readonly canvas: HTMLCanvasElement;
  readonly stage: HTMLElement;
  getMirrorEnabled: () => boolean;
  getSmoothingEnabled: () => boolean;
  setStatus: (message: string) => void;
  setError: (message: string) => void;
  clearError: () => void;
  setStageMessage: (message: string, visible: boolean) => void;
  renderFrame: (frame: TrackingFrame, zoomState: ZoomState) => void;
  onMirrorChange: (callback: ToggleCallback) => void;
  onSmoothingChange: (callback: ToggleCallback) => void;
  onRetry: (callback: RetryCallback) => void;
  onResetZoom: (callback: ResetZoomCallback) => void;
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
  const retryButton = getElement<HTMLButtonElement>("retryButton");
  const resetZoomButton = getElement<HTMLButtonElement>("resetZoomButton");

  const mirrorCallbacks = new Set<ToggleCallback>();
  const smoothingCallbacks = new Set<ToggleCallback>();
  const retryCallbacks = new Set<RetryCallback>();
  const resetZoomCallbacks = new Set<ResetZoomCallback>();

  mirrorToggle.addEventListener("change", () => {
    mirrorCallbacks.forEach((callback) => callback(mirrorToggle.checked));
  });

  smoothingToggle.addEventListener("change", () => {
    smoothingCallbacks.forEach((callback) => callback(smoothingToggle.checked));
  });

  retryButton.addEventListener("click", () => {
    retryCallbacks.forEach((callback) => callback());
  });

  resetZoomButton.addEventListener("click", () => {
    resetZoomCallbacks.forEach((callback) => callback());
  });

  return {
    video,
    canvas,
    stage,
    getMirrorEnabled: () => mirrorToggle.checked,
    getSmoothingEnabled: () => smoothingToggle.checked,
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
    renderFrame: (_frame: TrackingFrame, zoomState: ZoomState) => {
      statusMessage.textContent = zoomState.isActive ? "ZOOM ACTIVE" : zoomState.statusMessage;
    },
    onMirrorChange: (callback: ToggleCallback) => {
      mirrorCallbacks.add(callback);
    },
    onSmoothingChange: (callback: ToggleCallback) => {
      smoothingCallbacks.add(callback);
    },
    onRetry: (callback: RetryCallback) => {
      retryCallbacks.add(callback);
    },
    onResetZoom: (callback: ResetZoomCallback) => {
      resetZoomCallbacks.add(callback);
    },
  };
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: #${id}`);
  }

  return element as T;
}
