export class GroqSpeechEngine {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }

    async startRecording() {
        this.audioChunks = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.audioChunks.push(event.data);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
    }

    async stopRecording(apiKey) {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) return reject("No active recording session found.");

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

                try {
                    const transcribedText = await this._sendToGroq(audioBlob, apiKey);
                    resolve(transcribedText);
                } catch (err) {
                    reject(err);
                }
            };

            this.mediaRecorder.stop();
            this.isRecording = false;
        });
    }

    async _sendToGroq(audioBlob, apiKey) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('temperature', '0.0');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed communicating with Groq.");
        }

        const data = await response.json();
        return data.text;
    }
}
