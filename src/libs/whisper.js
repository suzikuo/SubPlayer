
export const transcribeAudio = async (audioBlob, apiKey, language, onProgress) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'srt');
    if (language) {
        formData.append('language', language);
    }

    // OpenAI does not support progress for standard fetch, but we can simulate or just wait.
    if (onProgress) onProgress('Uploading and Transcribing...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
    }

    const srtText = await response.text();
    return srtText;
};
