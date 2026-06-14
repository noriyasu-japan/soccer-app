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
  let pcConstraint = '';
  if (pcNum === 1) {
    pcConstraint = `【重要】練習人数は1人。必ず1人で完結できるメニューのみ。対人・パス交換・ゲーム形式は絶対に含めない。壁打ち・コーン・ボール1個で完結するメニュー限定。`;
  } else if (pcNum === 2) {
    pcConstraint = `【重要】練習人数は2人。2人1組で完結するメニューのみ。3人以上が必要なメニューは絶対に含めない。1対1・パス交換・2人ゲームが中心。`;
  } else if (pcNum === 3) {
    pcConstraint = `【重要】練習人数は3人。3人以内で完結するメニューのみ。4人以上が必要なメニーは絶対に含めない。3角形パス・2対1・3人ロンドが有効。`;
  } else if (pcNum === 4) {
    pcConstraint = `【重要】練習人数は4人。4人以内で完結するメニューのみ。2対2・4角形ロンド・4人ゲーム形式が有効。`;
  } else {
    pcConstraint = `【重要】練習人数は${pcNum}人以上。ロンド・ミニゲーム・ポゼッション練習など複数人を活かした形式を積極的に取り入れる。`;
  }

  const prompt = `あなたは小学生専門のサッカーコーチです。最新の育成メソッドを熟知しています。

${pcConstraint}

【参照するトレーニングメソッド】
- 認知→判断→実行の回路トレーニング（池上正メソッド）
- コグニティブトレーニング（欧州名門クラブ導入済み）
- エコロジカルアプローチ（実戦に近い状況での学習）
- ロンド（スペイン式。${pcNum >= 4 ? '今回の人数で実施可能' : '今回の人数には不向きなので使わない'}）
- サッカーIQ向上（視野拡大・空間認知・ポジショニング）

【子どもの情報】
- 名前: ${name}
- 年齢: ${age}
- サッカー歴: ${expLabel}
- 得意: ${strengths?.length ? strengths.join('、') : '不明'}
- 苦手: ${weaknesses?.length ? weaknesses.join('、') : '特になし'}
- 目指すプレー・あこがれ: ${dream || 'なし'}
- 練習時間: ${duration}分
- 練習人数: ${pcNum}人

【メニュー設計ルール】
- menuは4〜5個。合計時間がduration以内
- 全メニューが${pcNum}人で実施可能なものであること（これは絶対条件）
- 苦手克服メニューを1つ（category: "weakness"）
- 認知・判断系メニューを1つ（category: "cognition"）
- detailは箇条書きで「準備」「手順」「ポイント」に分けて具体的に記述
- diagramTypeは以下から選ぶ: "pass"（パス系）"dribble"（ドリブル系）"rondo"（ロンド・囲み系）"shooting"（シュート系）"positioning"（ポジショニング系）"none"（図解不要）

JSONのみ出力（前置き・コードブロック不要）:
{
  "menu": [
    {
      "title": "メニュー名",
      "minutes": 数字,
      "category": "skill|cognition|weakness",
      "diagramType": "pass|dribble|rondo|shooting|positioning|none",
      "detail": "・準備：〜\\n・手順：〜\\n・ポイント：〜"
    }
  ],
  "advice": "コーチからのアドバイス。100文字以内。小学校高学年向け・敬語不要",
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
        max_tokens: 2000,
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
