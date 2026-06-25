# Hand Zoom Prototype

PC の Web カメラで両手を認識し、両手の人差し指先端の距離によって Canvas 上の画像をズームイン・ズームアウトする検証用プロトタイプです。

AR グラスに表示する前段階として、まず PC 画面上で「手の動きによるズーム操作」が自然に使えるかを確認するための実装です。

## セットアップ方法

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

表示されたローカル URL を Chrome、Edge、Safari など通常のブラウザで開き、カメラ権限を許可してください。Codex の in-app browser など埋め込みブラウザでは、カメラ権限が許可できない場合があります。

MediaPipe の WASM と hand landmarker モデルは `public/mediapipe/` に配置しているため、起動後の検出処理は外部 CDN に依存しません。

## 操作方法

1. 両手をカメラに映します。
2. 左右それぞれの手で、親指先 `landmark 4` と人差し指先 `landmark 8` を近づけて pinch します。
3. 両手が pinch 状態になると `ZOOM ACTIVE` になり、その瞬間の両手の人差し指先端距離が基準距離として保存されます。
4. 両手の距離を広げるとズームインします。
5. 両手の距離を近づけるとズームアウトします。
6. どちらかの pinch を解除するとズーム操作が終了し、その時点の倍率が確定します。
7. 次に再び両手 pinch すると、その時点の距離を新しい基準距離としてズームを再開します。

`public/sample.jpg` が存在する場合はそれをメイン画像として表示します。存在しない場合は、ズーム確認用のグリッドと円を Canvas 上に描画します。

## 画面表示

- 中央: ズーム対象の画像、または仮のグリッドオブジェクト
- 右下: 小さなカメラ映像
- カメラ映像上: 手のランドマークと骨格線
- 人差し指先端: 小さい点
- 左上: 状態表示、ズーム倍率、FPS

状態表示:

- `Show both hands`: 両手が検出されていない
- `Pinch with both hands to zoom`: 両手はあるが、両方の pinch が揃っていない
- `ZOOM ACTIVE`: 両手 pinch によるズーム操作中

## pinch 判定

MediaPipe Hand Landmarker の次のランドマークを使います。

- 親指先端: `landmark 4`
- 人差し指先端: `landmark 8`

2 点間の 3D 距離が `PINCH_DISTANCE_THRESHOLD` 以下なら pinch 中とみなします。初期値は `0.07` です。

定数は [src/handTracking.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/handTracking.ts) にあります。

## ズーム状態の仕組み

ズーム管理は [src/zoomController.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/zoomController.ts) にあります。

流れ:

1. 両手が検出されているか確認
2. 両手が pinch 中か確認
3. pinch 開始時の人差し指先端距離を `baseDistance` として保存
4. `currentDistance / baseDistance` を倍率比として計算
5. `committedScale * ratio` を `targetScale` にする
6. `currentScale` を `targetScale` に少しずつ近づける
7. pinch 解除時に `targetScale` を確定倍率として保存

## 調整すべき定数

[src/handTracking.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/handTracking.ts)

- `PINCH_DISTANCE_THRESHOLD`: pinch 判定の距離閾値
- `SMOOTHING_ALPHA`: ランドマーク座標のスムージング係数

[src/zoomController.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/zoomController.ts)

- `MIN_ZOOM_SCALE`: 最小倍率。初期値 `0.5`
- `MAX_ZOOM_SCALE`: 最大倍率。初期値 `4.0`
- `ZOOM_SMOOTHING`: ズーム倍率のスムージング係数

[src/drawing.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/drawing.ts)

- `PREVIEW_WIDTH_RATIO`: 右下カメラプレビューのサイズ比率
- `PREVIEW_MARGIN`: 右下カメラプレビューの余白

## ファイル構成

- `src/camera.ts`: Web カメラ起動と停止
- `src/handTracking.ts`: MediaPipe Hand Landmarker 初期化と手検出
- `src/zoomController.ts`: 両手 pinch ズームの状態管理
- `src/drawing.ts`: Canvas 描画
- `src/main.ts`: アプリ全体のループ
- `src/ui.ts`: 最小限の UI
- `src/types.ts`: 型定義
