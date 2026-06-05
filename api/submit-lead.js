function normalizePayload(body = {}) {
  return {
    source: body.source || 'estimate_calculator',
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
    estimatedMin: body.estimatedMin || '',
    estimatedMax: body.estimatedMax || '',
    estimatedText: body.estimatedText || '',
    comment: body.comment || '',
    pageUrl: body.pageUrl || '',
    userAgent: body.userAgent || '',
    quizAnswers: body.quizAnswers || {}
  };
}

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

    const lead = normalizePayload(req.body);
    if (!lead.phone || !String(lead.phone).trim()) {
      return res.status(400).json({ success: false, message: 'Phone is required' });
    }

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, secret })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: response.ok, message: text }; }

    if (!response.ok || data.success === false) {
      return res.status(502).json({ success: false, message: data.message || 'Apps Script returned an error' });
    }

    return res.status(200).json({ success: true, message: 'Lead sent' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unexpected server error' });
  }
}
