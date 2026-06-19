# Hand Landmark Debugger

PC の Web カメラ映像から MediaPipe Tasks Vision の Hand Landmarker で手の 21 点ランドマークをリアルタイム検出し、映像の上に点・番号・骨格線を重ねて表示する検証用 Web アプリです。

目的は、手の認識精度、座標、ブレ、遅延、右手・左手判定、pinch 判定を確認するためのデバッグです。最大 2 つの手を同時に検出します。

## セットアップ方法

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

表示されたローカル URL をブラウザで開きます。カメラ権限を求められたら許可してください。ブラウザや OS 側でカメラの使用がブロックされている場合は、画面にエラーメッセージが表示されます。

Codex の in-app browser など、埋め込みブラウザではカメラ権限が許可できない場合があります。その場合は Vite が表示する `http://127.0.0.1:5173/` などの URL を Chrome、Edge、Safari など通常のブラウザで開いてください。権限を変更した後は画面の `Retry Camera` を押します。

MediaPipe の WASM と hand landmarker モデルは `public/mediapipe/` に配置しているため、起動後の検出処理は外部 CDN に依存しません。

## 使い方

- カメラ映像の上に、検出された手のランドマーク点、ランドマーク番号、骨格線が表示されます。
- 右側、または画面幅が狭い場合は下側の Debug パネルで FPS、検出中の手の数、右手・左手判定、landmark 8 の座標、landmark 4 と 8 の距離、pinch 判定を確認できます。
- `Mirror` を切り替えると、カメラ映像を左右反転できます。ON のときもランドマーク描画位置は映像に合うように反転して描画されます。
- `Smoothing` を切り替えると、ランドマーク座標の簡単な線形補間スムージングを ON/OFF できます。OFF では MediaPipe から得た生の座標をそのまま描画します。
- `Download JSON` を押すと、現在検出されている手の情報を JSON として保存できます。
- 手が検出されていない場合は `No hand detected` と表示されます。

## ランドマーク番号

MediaPipe Hand Landmarker は片手につき 21 個のランドマークを返します。

| 番号 | 部位 |
| --- | --- |
| 0 | 手首 |
| 1-4 | 親指の付け根から指先 |
| 5-8 | 人差し指の付け根から指先 |
| 9-12 | 中指の付け根から指先 |
| 13-16 | 薬指の付け根から指先 |
| 17-20 | 小指の付け根から指先 |

このアプリでは `landmark 8` を人差し指先、`landmark 4` を親指先として扱います。表示される x, y は映像内の正規化座標、z は MediaPipe が返す奥行き方向の相対値です。

## pinch 判定

`landmark 4`（親指先）と `landmark 8`（人差し指先）の 3D 距離を計算し、一定以下になったら `pinch = true` と表示します。

閾値は [src/handTracking.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/handTracking.ts) の `PINCH_DISTANCE_THRESHOLD` で調整できます。

JSON には次の情報が含まれます。

- `timestamp`
- `isoTime`
- `fps`
- `mirrorEnabled`
- `smoothingEnabled`
- `hands[].handedness`
- `hands[].landmarks`
- `hands[].rawLandmarks`
- `hands[].indexFingerTip`
- `hands[].thumbTip`
- `hands[].thumbIndexDistance`
- `hands[].pinch`

## 今後の発展案

- pinch の開始・終了イベントを作り、作品側の入力トリガーにする
- 指先の速度や軌跡を記録してジェスチャー認識に使う
- 手のひらの向き、指の曲がり具合、指同士の距離を特徴量として可視化する
- 座標を WebSocket や OSC で TouchDesigner、Unity、Max/MSP などへ送る
- 検出結果を録画・再生できるようにして、カメラなしで表現部分を調整する
