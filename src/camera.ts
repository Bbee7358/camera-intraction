export async function startCamera(video: HTMLVideoElement): Promise<void> {
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

export function stopCamera(video: HTMLVideoElement): void {
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
