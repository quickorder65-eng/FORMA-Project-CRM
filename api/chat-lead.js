const allowedSources = ['chatbot', 'chatbot_followup', 'chatbot_update_phone'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    const secret = process.env.LEAD_SECRET_KEY;

    if (!googleScriptUrl || !secret) {
      return res.status(500).json({ success: false, message: 'Server environment variables are not configured' });
    }

    const body = req.body || {};
    const source = body.source || 'chatbot';

    if (!allowedSources.includes(source)) {
      return res.status(400).json({ success: false, message: 'Invalid source' });
    }

    if (source === 'chatbot_update_phone' && !body.phone) {
      return res.status(400).json({ success: false, message: 'Phone is required for phone update' });
    }

    const payload = {
      secret,
      source,
      status: body.status || 'Новая заявка',
      name: body.name || '',
      phone: body.phone || '',
      contactMethod: body.contactMethod || '',
      objectType: body.objectType || '',
      area: body.area || '',
      serviceType: body.serviceType || '',
      repairLevel: body.repairLevel || '',
      startTime: body.startTime || '',
      priority: body.priority || '',
      comment: body.comment || '',
      quizAnswers: body.quizAnswers || '',
      pageUrl: body.pageUrl || '',
      userAgent: body.userAgent || ''
    };

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: response.ok, message: text }; }

    if (!response.ok || data.success === false) {
      return res.status(502).json({ success: false, message: data.message || 'Apps Script returned an error' });
    }

    return res.status(200).json({ success: true, message: 'Chat lead sent' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unexpected server error' });
  }
}
