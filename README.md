# Python 一括採点システム (Instructor Grading Hub)

大学 Python / データサイエンス科目向けの、学生 `.ipynb` 一括 AI 採点ツールです。

## 特徴

- 第1回〜第7回の課題を選択して採点
- 複数の Jupyter Notebook をまとめてアップロード
- **複数の Gemini API キー**をブラウザに保存して利用（ローテーション・レート制限時の自動切替）

## ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000` を開き、画面上部の **API Key を設定** から [Google AI Studio](https://aistudio.google.com/apikey) で取得したキーを1件以上登録してください。複数登録すると採点ごとにキーをローテーションし、レート制限時は次のキーへ自動で切り替わります。

## Vercel デプロイ

1. このリポジトリを GitHub に push
2. [Vercel](https://vercel.com) で **Import Project** → リポジトリを選択
3. Framework Preset: **Vite**（自動検出される想定）
4. 環境変数は **不要**
5. Deploy

## API キーについて

- キーは利用者のブラウザ `localStorage` にのみ保存されます
- 採点リクエストは利用者のブラウザから直接 Gemini API へ送信されます
- 複数キー登録時: 通常は採点ごとにキーを順番に使用し、429 / quota エラー時は別キーで再試行します
- 公開 URL を共有しても、各自が自分のキーを設定して使えます
