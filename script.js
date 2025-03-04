class AudioProcessor {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.chunkDuration = 60; // 60 seconds per chunk
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'ne-NP';
    }

    async processFile(file) {
        try {
            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('transcription').textContent = '';

            // Convert to audio buffer
            const audioBuffer = await this.fileToAudioBuffer(file);
            
            // Split into chunks
            const chunks = this.splitIntoChunks(audioBuffer);
            
            // Update total chunks
            document.getElementById('total-chunks').textContent = chunks.length;
            
            let fullTranscription = '';
            
            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                try {
                    const text = await this.transcribeChunk(chunks[i]);
                    fullTranscription += text + ' ';
                    
                    // Update progress
                    this.updateProgress(i + 1, chunks.length, text);
                } catch (error) {
                    console.error('Error transcribing chunk:', error);
                    fullTranscription += '{not understood here} ';
                }
            }

            // Complete
            this.showComplete(fullTranscription);
            
        } catch (error) {
            console.error('Processing error:', error);
            alert('Error processing file: ' + error.message);
        }
    }

    async fileToAudioBuffer(file) {
        const arrayBuffer = await file.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    splitIntoChunks(audioBuffer) {
        const chunks = [];
        const chunkSamples = this.chunkDuration * audioBuffer.sampleRate;
        
        for (let i = 0; i < audioBuffer.length; i += chunkSamples) {
            const chunk = new AudioBuffer({
                length: Math.min(chunkSamples, audioBuffer.length - i),
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate
            });
            
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const data = audioBuffer.getChannelData(channel).slice(i, i + chunkSamples);
                chunk.copyToChannel(data, channel);
            }
            
            chunks.push(chunk);
        }
        
        return chunks;
    }

    async transcribeChunk(audioBuffer) {
        return new Promise((resolve, reject) => {
            // Convert AudioBuffer to Blob
            const blob = this.audioBufferToBlob(audioBuffer);
            
            this.recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                resolve(text);
            };
            
            this.recognition.onerror = (event) => {
                reject(new Error('Recognition error: ' + event.error));
            };
            
            this.recognition.start();
            
            // Play the audio for recognition
            const audio = new Audio(URL.createObjectURL(blob));
            audio.play();
        });
    }

    audioBufferToBlob(audioBuffer) {
        const wav = this.audioBufferToWav(audioBuffer);
        return new Blob([wav], { type: 'audio/wav' });
    }

    updateProgress(current, total, text) {
        const progress = (current / total) * 100;
        document.getElementById('progress-bar').style.width = progress + '%';
        document.getElementById('progress-bar').textContent = progress.toFixed(1) + '%';
        document.getElementById('chunks-processed').textContent = current;
        
        const transcriptionDiv = document.getElementById('transcription');
        transcriptionDiv.textContent += text + ' ';
    }

    showComplete(fullTranscription) {
        document.getElementById('loading').querySelector('h3').textContent = 'Transcription Complete!';
        document.getElementById('loading').querySelector('.processing-header').classList.add('complete');
        
        // Create download link
        const blob = new Blob([fullTranscription], { type: 'text/plain' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'transcription.txt';
        downloadLink.className = 'download-button';
        downloadLink.textContent = '📥 Download Transcription';
        
        const container = document.getElementById('transcription-container');
        const existingLink = document.getElementById('download-link');
        if (existingLink) {
            existingLink.remove();
        }
        container.appendChild(downloadLink);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const processor = new AudioProcessor();
    
    // File input handling
    document.querySelector('input[type="file"]').addEventListener('change', function(e) {
        const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
        document.getElementById('file-name').textContent = fileName;
        
        const fileLabel = document.getElementById('file-input-label');
        const transcribeBtn = document.getElementById('transcribe-btn');
        
        if (e.target.files[0]) {
            fileLabel.classList.add('file-selected');
            transcribeBtn.disabled = false;
        } else {
            fileLabel.classList.remove('file-selected');
            transcribeBtn.disabled = true;
        }
    });
    
    // Form submission
    document.getElementById('upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.querySelector('input[type="file"]').files[0];
        if (file) {
            await processor.processFile(file);
        }
    });
}); 