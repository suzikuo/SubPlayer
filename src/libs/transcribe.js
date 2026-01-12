
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64String = reader.result.split(',')[1];
             resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const transcribeOpenAI = async (audioBlob, apiKey, language, baseUrl = 'https://api.openai.com/v1') => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'srt');
    if (language) formData.append('language', language);

    // Ensure baseUrl doesn't end with slash if we are appending /audio/transcriptions
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    // Some custom endpoints might already include /v1, others might not. 
    // Usually user provides "https://api.openai.com/v1" or "https://api.groq.com/openai/v1"
    
    const response = await fetch(`${cleanBaseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Transcription failed: ${response.status} ${response.statusText}`);
    }
    return await response.text();
};

export const transcribeGemini = async (audioBlob, apiKey, language) => {
    const base64Audio = await blobToBase64(audioBlob);
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const prompt = `Transcribe the following audio file into SRT subtitle format. 
    Output ONLY the SRT content. Do not include any markdown formatting like \`\`\`srt or \`\`\`.
    ${language ? `Language: ${language}` : ''}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "audio/mp3", data: base64Audio } }
                ]
            }]
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No transcription generated');
    
    // Clean up markdown if Gemini decides to be chatty
    let cleanText = text.replace(/^```srt\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    return cleanText.trim();
};

export const transcribeAudio = async (audioBlob, options, onProgress) => {
    const { provider, apiKey, baseUrl, language } = options;
    if (onProgress) onProgress('Transcribing...');

    switch (provider) {
        case 'openai':
            return transcribeOpenAI(audioBlob, apiKey, language);
        case 'gemini':
            return transcribeGemini(audioBlob, apiKey, language);
        case 'custom':
            return transcribeOpenAI(audioBlob, apiKey, language, baseUrl);
        default:
            throw new Error('Unknown provider');
    }
};
