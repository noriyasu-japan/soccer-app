module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, age, experience, strengths, weaknesses, dream, duration } = req.body;

  const expLabel = {
    beginner: 'はじめたばかり（〜6ヶ月）',
    mid: '1〜2年',
    experienced: '3年以上'
  }[experience] || experience;

  const prompt = `あなたは小学生専門のサッカーコーチです。最新の育成メソッドを熟知しています。

【参照するトレーニングメソッド】
- 認知→判断→実行の回路トレーニング（池上正メソッド）
- コグニティブトレーニング（欧州名門クラブで導入済み。見る→脳で判断→動くの連携を鍛える）
- エコロジカルアプローチ（実戦に近い状況での学習を重視）
- ロンド（スペイン式パス回しで判断力・技術を同時に伸ばす）
- ヴィセラルトレーニング（無意識レベルの認知を高める）
- サッカーIQ向上トレーニング（視野拡大・空間認知・ポジショニング理解）

【子どもの情報】
- 名前: ${name}
- 年齢: ${age}
- サッカー歴: ${expLabel}
- 得意なこと: ${strengths?.length ? strengths.join('、') : '不明'}
- 苦手なこと: ${weaknesses?.length ? weaknesses.join('、') : '特になし'}
- やりたいプレー・あこがれ: ${dream || 'とくになし'}
- 練習時間: ${duration}分

【ルール】
- menuは4〜5個。練習時間の合計がdurationに収まるように
- 苦手なことがあれば、改善メニューを必ず1つ入れる
- サッカーIQを高める認知・判断系メニューを必ず1つ入れる
- あこがれの選手や目指すプレーがある場合はそのスタイルに沿ったメニューを入れる
- detailは「どこに立つか」「何回やるか」「どんな動きをするか」まで超具体的に書く
- categoryは "skill"（技術）"cognition"（認知・IQ）"weakness"（苦手克服）のいずれか
- スキルスコアの変化量を skill_gains に入れる（0〜3の整数、伸びる項目だけ記載）

JSONのみ出力（前置き・コードブロック不要）:
{
  "menu": [
    {
      "title": "メニュー名",
      "minutes": 数字,
      "category": "skill|cognition|weakness",
      "detail": "超具体的なやり方"
    }
  ],
  "advice": "コーチから子どもへの一言。ひらがな多め、100文字以内",
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

    if (!response.ok) {
      return res.status(500).json({ error: raw });
    }

    let data;
    try { data = JSON.parse(raw); } catch(e) {
      return res.status(500).json({ error: 'Anthropic応答パース失敗', raw });
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSONが見つかりません', raw: text });

    const plan = JSON.parse(match[0]);
    return res.status(200).json(plan);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
