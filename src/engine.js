export class OdiaSpeechEngine {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // 🚨 UPDATE THIS LINK EVERY TIME YOU RESTART COLAB
        // Use the live ngrok URL printed out by Cell 3.
        // (Do not add a trailing slash '/' at the end)
        this.apiBaseUrl = "https://snugness-reappear-uncivil.ngrok-free.dev"; 
    }

    /**
     * Step 1: Request microphone access and start recording voice chunks
     */
    async startRecording() {
        try {
            this.audioChunks = []; // Clear previous recording data
            
            // Capture audio stream from browser hardware
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Initialize the recording engine
            this.mediaRecorder = new MediaRecorder(stream);
            
            // Collect raw audio data as it streams in from the microphone
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            console.log("🎤 Mic active. Listening for Odia speech...");
        } catch (error) {
            console.error("Microphone Access Denied:", error);
            throw new Error("Could not access your microphone. Please allow permissions!");
        }
    }

    /**
     * Step 2: Stop recording, package the audio file, and send it to the GPU
     * @returns {Promise<string>} Transcribed Odia script text
     */
    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject("No active recording session found.");
                return;
            }

            // Define the logic that executes once the hardware stops recording
            this.mediaRecorder.onstop = async () => {
                try {
                    console.log("📦 Packaging raw binary audio layers...");
                    
                    // Bundle audio data into a standard WAV audio blob
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

                    // Append the blob data to a virtual form data submission block
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'mic_input.wav');

                    console.log("🚀 Blasting audio file over to the T4 GPU...");
                    
                    // Post the payload directly to the FastAPI /transcribe endpoint
                    const response = await fetch(`${this.apiBaseUrl}/transcribe`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Colab server dropped the pipeline connection. Code: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log("✨ Response successfully received from cloud processing!");
                    
                    // Return the clean Odia text back to your application UI layer
                    resolve(data.transcript || "କିଛି ଶୁଣାଗଲା ନାହିଁ।"); 
                } catch (error) {
                    console.error("API Transmission Failed:", error);
                    reject("Failed to connect to the background server pipeline.");
                } finally {
                    // Turn off hardware recording tracks completely to protect privacy
                    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    this.isRecording = false;
                }
            };

            // Programmatically close the recording line
            this.mediaRecorder.stop();
        });
    }
}
