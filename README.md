# Hand Landmark Debugger / Finger Light Study

PC の Web カメラ映像から MediaPipe Tasks Vision の Hand Landmarker で手の 21 点ランドマークをリアルタイム検出し、映像の上に点・番号・骨格線を重ねて表示する検証用 Web アプリです。

最初の目的は、手の認識精度、座標、ブレ、遅延、右手・左手判定、pinch 判定を確認するためのデバッグです。次の段階として、伸ばした 5 本の指先を光の発生源にし、手を動かすと光の軌跡が残るインタラクティブ作品表現も追加しています。最大 2 つの手を同時に検出します。

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

## 使い方

- カメラ映像の上に、検出された手のランドマーク点、ランドマーク番号、骨格線が表示されます。
- 右側、または画面幅が狭い場合は下側の Debug パネルで FPS、検出中の手の数、右手・左手判定、landmark 8 の座標、landmark 4 と 8 の距離、pinch 判定、伸びている指を確認できます。
- `Mirror` を切り替えると、カメラ映像を左右反転できます。ON のときもランドマーク描画位置は映像に合うように反転して描画されます。
- `Smoothing` を切り替えると、ランドマーク座標の簡単な線形補間スムージングを ON/OFF できます。OFF では MediaPipe から得た生の座標をそのまま描画します。
- `Debug / Art / Hybrid` で表示モードを切り替えられます。
- `Camera` でカメラ映像の表示を ON/OFF できます。
- `Trail` で光の残像の長さを調整できます。
- `Light` で光の強さを調整できます。
- `Download JSON` を押すと、現在検出されている手の情報を JSON として保存できます。
- 手が検出されていない場合は `No hand detected` と表示されます。

## 追加した表現

伸ばした指先から、指ごとに違う性質の光粒子が発生します。指を曲げると、その指の光は弱くなるか消えます。手を動かすと指先速度に応じて粒子の発生量と軌跡が増え、光が空間に残ってゆっくり消えていきます。

各指の光の方向性は [src/lightParticles.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/lightParticles.ts) の `FINGER_LIGHT_STYLES` で調整できます。

- 親指: 低く、重めの光。大きめでゆっくり広がる
- 人差し指: 鋭い光。細く明るく伸びる
- 中指: 強い光。中心的で一番存在感がある
- 薬指: やわらかい光。ふわっとにじむ
- 小指: 小さい光。控えめで繊細に揺れる

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

## 指先ランドマーク

光の発生源として使っている指先ランドマークです。

| 指 | 指先ランドマーク |
| --- | --- |
| 親指 | 4 |
| 人差し指 | 8 |
| 中指 | 12 |
| 薬指 | 16 |
| 小指 | 20 |

## 指が伸びているかの判定

判定処理は [src/fingerGesture.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/fingerGesture.ts) にあります。

親指以外は、指先・DIP・PIP・MCP と手首の関係を使います。基本的には `指先が PIP よりも手首から遠いか` と、関節角度がまっすぐに近いかを組み合わせて `extension` を 0.0-1.0 で計算し、0.5 以上を伸びている状態として扱います。

親指は他の指と向きが違うため、親指先 4、IP 3、MCP 2、手首 0 の距離比と角度を使って簡易判定しています。判定を調整したい場合は `getThumbExtension`、親指以外は `getFingerExtension` を変更してください。

指先速度も同じファイルで計算しています。前フレームの指先 canvas 座標との差分から px/s を求め、速度が大きいほど光粒子の発生量と軌跡が増えます。

## 表示モード

| モード | 内容 |
| --- | --- |
| Debug | カメラ映像、21 点ランドマーク、番号、骨格線、指の ON/OFF ラベルを表示します。認識状態の確認向けです。 |
| Art | カメラ映像をかなり薄くし、指先の光と軌跡を主役にします。番号や骨格線は表示しません。 |
| Hybrid | カメラ映像、薄い骨格線、指先の光を同時に表示します。調整と体験確認の中間向けです。 |

## UI スライダー

`Trail` は粒子の寿命と広がりに影響します。値を上げると残像が長く残り、手を速く動かした時の線が伸びやすくなります。

`Light` は粒子の発生量と描画の明るさに影響します。値を上げると光が強くなりますが、端末によっては負荷も上がります。粒子数は [src/lightParticles.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/lightParticles.ts) の `MAX_PARTICLES` で上限を設けています。

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
- `hands[].fingers`
- `hands[].indexFingerTip`
- `hands[].thumbTip`
- `hands[].thumbIndexDistance`
- `hands[].pinch`

## 今後の発展案

- pinch の開始・終了イベントを作り、作品側の入力トリガーにする
- 指先の速度や軌跡を記録してジェスチャー認識に使う
- 手のひらの向き、指の曲がり具合、指同士の距離を特徴量として可視化する
- 指ごとに音、風、粒子色、投影映像を連動させる
- 光粒子を WebGL や Three.js に移し、より立体的な空間表現にする
- 展示環境用にフルスクリーン、カメラ選択、明るさキャリブレーションを追加する
- 座標を WebSocket や OSC で TouchDesigner、Unity、Max/MSP などへ送る
- 検出結果を録画・再生できるようにして、カメラなしで表現部分を調整する
