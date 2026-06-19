# Tactile Words

Web カメラから MediaPipe Tasks Vision の Hand Landmarker で手の 21 点ランドマークを取得し、画面上に漂う言葉を手で触る・押す・つまむ・投げる・分離させるインタラクティブ作品の検証アプリです。

言葉を読むだけのテキストではなく、やわらかさ、重さ、弾力、粘りを持った物体として扱うことを目指しています。既存の手ランドマーク Debug 表示も残しているため、認識状態を確認しながら作品表現を調整できます。

## セットアップ方法

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

表示されたローカル URL をブラウザで開きます。カメラ権限を求められたら許可してください。

Codex の in-app browser など、埋め込みブラウザではカメラ権限が許可できない場合があります。その場合は Vite が表示する `http://127.0.0.1:5173/` などの URL を Chrome、Edge、Safari など通常のブラウザで開いてください。権限を変更した後は画面の `Retry Camera` を押します。

MediaPipe の WASM と hand landmarker モデルは `public/mediapipe/` に配置しているため、起動後の検出処理は外部 CDN に依存しません。

## 操作方法

- 画面上に複数の言葉がゆっくり漂います。
- 人差し指先 `landmark 8` を言葉に近づけると、言葉がぷにっと変形しながら押されます。
- 親指先 `landmark 4` と人差し指先 `landmark 8` を近づけて pinch すると、近くの言葉や分離した文字をつかめます。
- pinch したまま手を動かすと、言葉が指先の中間点についてきます。
- pinch を離すと、離した瞬間の手の速度で言葉が投げられます。
- 強く投げる、または強い力が加わると、言葉が文字ごとに分離します。
- 分離した文字も小さな物体として漂い、押す・つまむ操作ができます。

## pinch 判定

`landmark 4`（親指先）と `landmark 8`（人差し指先）の 3D 距離を計算し、一定以下になったら `pinch = true` としています。

閾値は [src/handTracking.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/handTracking.ts) の `PINCH_DISTANCE_THRESHOLD` で調整できます。

作品側では pinch 中の親指先と人差し指先の中間点を `pinchPoint` として扱い、言葉のつかみ位置に使っています。この変換処理は [src/fingerGesture.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/fingerGesture.ts) にあります。

## 言葉オブジェクトの仕組み

言葉は `WordObject` として管理しています。主な状態は次の通りです。

- `text`: 表示する言葉
- `x`, `y`: 位置
- `vx`, `vy`: 速度
- `rotation`, `angularVelocity`: 回転と回転速度
- `mass`: 重さ
- `softness`: やわらかさ
- `elasticity`: 弾力
- `grabbedBy`: どの手に掴まれているか
- `deformationAmount`: ぷにっとした変形量
- `lastForce`: 直近で受けた力

物理更新は [src/wordPhysics.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/wordPhysics.ts)、手との相互作用は [src/wordInteraction.ts](/Users/home_folder/Documents/sfc/camera-intaraction/src/wordInteraction.ts) に分けています。

最初に表示する言葉は次の 8 つです。

- 「わからない」
- 「たすけて」
- 「ありがとう」
- 「ほんとう？」
- 「さみしい」
- 「きいて」
- 「ここにいる」
- 「まだ言えない」

## 分離処理の仕組み

言葉が一定以上の速度で投げられたとき、または強い力を受けたとき、その言葉は文字ごとの `CharacterObject` に分離します。

例:

```text
わからない -> わ / か / ら / な / い
```

分離直後の文字には、元の言葉の速度に加えてランダムな方向の速度と回転を与えています。これにより、ただ文字を並べるのではなく、ばらけて漂うように見えます。

## 表示モード

| モード | 内容 |
| --- | --- |
| Debug | カメラ映像、21 点ランドマーク、番号、骨格線、pinch 判定、FPS を表示します。認識確認向けです。 |
| Art | カメラ映像をかなり薄くし、ランドマーク番号は表示せず、言葉の動きと手の操作を中心に見せます。 |
| Hybrid | カメラ映像と骨格線を薄く表示し、言葉オブジェクトも同時に表示します。調整用の中間モードです。 |

初期状態は `Hybrid` です。純粋に認識状態だけを確認したい場合は `Debug` に切り替えてください。

## UI スライダー

- `Soft`: 言葉の押されやすさ、変形のしやすさを調整します。
- `Bounce`: 画面端での跳ね返りや、押された後の戻り感を調整します。
- `Mass`: 言葉の重さを調整します。大きいほど動きにくくなります。
- `Split`: 分離しやすさを調整します。大きいほど弱い力でも分離しやすくなります。

そのほかの UI:

- `Debug / Art / Hybrid`: 表示モード切り替え
- `Camera`: カメラ映像表示 ON/OFF
- `Mirror`: ミラー表示 ON/OFF
- `Smoothing`: ランドマーク座標のスムージング ON/OFF
- `Reset`: 言葉を初期状態に戻す
- 入力欄 + `Add`: 新しい言葉を追加する
- `Download JSON`: 現在検出されている手のランドマーク情報を JSON 保存する

## 今後の発展案

- 両手で同じ言葉を引っ張ると文字ごとに分離する
- 分離した文字を近づけると再びくっつく
- 言葉ごとに性格をさらに強くする
- 「たすけて」は震えやすくする
- 「ありがとう」は跳ねやすくする
- 「さみしい」は手に近づきやすくする
- 「まだ言えない」は触ると逃げる
- 手を開くと近くの文字がふわっと広がる
- 手をグーにすると近くの言葉が圧縮される
- 座標や言葉の状態を WebSocket / OSC で外部ツールに送る
