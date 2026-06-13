export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, age, experience, strengths, dream, duration } = req.body;

  const expLabel = {
    beginner: 'はじめたばかり（〜6ヶ月）',
    mid: '1〜2年',
    experienced: '3年以上'
  }[experience] || experience;

  const prompt = `あなたは小学生のサッカーコーチです。以下の子どもに合った今日の練習メニューを提案してください。

【子どもの情報】
- 名前: ${name}
- 年齢: ${age}
- サッカー歴: ${expLabel}
- 得意なこと: ${strengths?.length ? strengths.join('、') : '不明'}
- やりたいプレー・あこがれ: ${dream || 'とくになし'}
- 練習時間: ${duration}分

JSONのみ出力（前置き・コードブロック不要）:
{"menu":[{"title":"メニュー名","minutes":数字,"detail":"具体的なやり方を2〜3文で。どこに立つか、何回やるか、どんなふうに動くかまで書く"}],"advice":"コーチから子どもへの一言アドバイス。ひらがな多め、100文字以内"}

menuは3〜4個。練習時間の合計がdurationに収まるように。`;

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
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSONが見つかりません', raw: text });

    const plan = JSON.parse(match[0]);
    res.status(200).json(plan);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
