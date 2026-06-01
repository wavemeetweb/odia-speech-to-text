export class OdiaSpeechEngine {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // 🚨 CONFIGURATION POINT: Swap this link with your active Ngrok URL from Cell 3 daily.
        this.apiBaseUrl = "https://snugness-reappear-uncivil.ngrok-free.dev"; 
    }

    async startRecording() {
        try {
            this.audioChunks = []; 
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            console.log("Audio line open.");
        } catch (error) {
            console.error("Hardware streaming exception caught:", error);
            throw error;
        }
    }

    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject("No active stream connection instance present.");
                return;
            }

            this.mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    const dataPayload = new FormData();
                    dataPayload.append('file', audioBlob, 'mic_input.wav');

                    const response = await fetch(`${this.apiBaseUrl}/transcribe`, {
                        method: 'POST',
                        body: dataPayload
                    });

                    if (!response.ok) {
                        throw new Error(`Upstream system returned bad runtime flag: ${response.status}`);
                    }

                    const data = await response.json();
                    resolve(data.transcript || "କିଛି ଶୁଣାଗଲା ନାହିଁ।"); 
                } catch (error) {
                    console.error("Data pipeline broken:", error);
                    reject(error);
                } finally {
                    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    this.isRecording = false;
                }
            };

            this.mediaRecorder.stop();
        });
    }
}
