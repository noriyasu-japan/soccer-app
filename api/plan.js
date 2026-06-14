module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, age, experience, strengths, weaknesses, dream, duration, playerCount } = req.body;

  const expLabel = {
    beginner: 'はじめたばかり（〜6ヶ月）',
    mid: '1〜2年',
    experienced: '3年以上'
  }[experience] || experience;

  const pcNum = parseInt(playerCount) || 1;
  const pcDesc = pcNum === 1 ? '1人（自主練）' : pcNum >= 5 ? `${pcNum}人以上（チーム練習可）` : `${pcNum}人`;

  const prompt = `あなたは小学生専門のサッカーコーチです。最新の育成メソッドを熟知しています。

【参照するトレーニングメソッド】
- 認知→判断→実行の回路トレーニング（池上正メソッド）
- コグニティブトレーニング（欧州名門クラブ導入済み。見る→脳で判断→動くの連携強化）
- エコロジカルアプローチ（実戦に近い状況での学習）
- ロンド（スペイン式パス回しで判断力・技術を同時習得）
- ヴィセラルトレーニング（無意識レベルの認知向上）
- サッカーIQ向上トレーニング（視野拡大・空間認知・ポジショニング理解）

【子どもの情報】
- 名前: ${name}
- 年齢: ${age}
- サッカー歴: ${expLabel}
- 得意: ${strengths?.length ? strengths.join('、') : '不明'}
- 苦手: ${weaknesses?.length ? weaknesses.join('、') : '特になし'}
- 目指すプレー・あこがれ: ${dream || 'なし'}
- 練習時間: ${duration}分
- 練習人数: ${pcDesc}

【設計ルール】
- menuは4〜5個。合計時間がduration以内に収まること
- 練習人数が1人の場合は1人でできるメニューのみ。2人以上の場合は対人・ゲーム形式を積極的に入れる
- 5人以上の場合はロンドやゲーム形式（ミニゲームなど）を必ず含める
- 苦手なことがあれば改善メニューを1つ必ず入れる（category: "weakness"）
- サッカーIQ・認知系メニューを1つ必ず入れる（category: "cognition"）
- あこがれ・目標に沿ったメニューを優先的に組み込む
- detailは「どこに立つか」「何回やるか」「どう動くか」まで超具体的に（高学年対象なので専門用語OK）
- skill_gainsは今回のメニューで伸びるスキルを0〜3の整数で

JSONのみ出力（前置き・コードブロック不要）:
{
  "menu": [
    {
      "title": "メニュー名",
      "minutes": 数字,
      "category": "skill|cognition|weakness",
      "detail": "超具体的な説明"
    }
  ],
  "advice": "コーチからのアドバイス。100文字以内。小学校高学年向けなので丁寧語は不要",
  "skill_gains": {
    "shoot": 0〜3,
    "pass": 0〜3,
    "dribble": 0〜3,
    "control": 0〜3,
    "defense": 0〜3,
    "iq": 0〜3
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await response.text();
    if (!response.ok) return res.status(500).json({ error: raw });

    let data;
    try { data = JSON.parse(raw); } catch(e) {
      return res.status(500).json({ error: 'Anthropic応答パース失敗', raw });
    }

    const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSONが見つかりません', raw: text });

    return res.status(200).json(JSON.parse(match[0]));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
