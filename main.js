// Utility function to determine if MediaRecorder is supported
const isMediaRecorderSupported = () => !!window.MediaRecorder;
 
// Improved function to get a suitable audio format for iOS and other platforms
const getSuitableAudioFormat = () => {
    const formats = [
        "audio/mp4", // Preferred format for iOS
        "audio/webm;codecs=opus",
        "video/mp4", // Works on iOS
        "audio/webm",
    ];
 
    for (let format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
            return format;
        }
    }
 
    return null;
};
 
// Optimized recording function with better iOS support and error handling
const startRecording = () => {
    if (!isMediaRecorderSupported()) {
        alert("MediaRecorder is not supported on this device.");
        return;
    }
 
    window.navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
            isRecording.value = true;
 
            const options = getSuitableAudioFormat();
            if (!options) {
                alert("No suitable audio format found.");
                isRecording.value = false;
                return;
            }
 
            try {
                devRecorder = new MediaRecorder(stream, { mimeType: options, audioBitsPerSecond: 128000 });
                devRecorder.start();
 
                devRecorder.ondataavailable = (e) => {
                    devAudioChunks.push(e.data);
                };
 
                devRecorder.onstop = () => {
                    devBlob = new Blob(devAudioChunks, { type: devRecorder.mimeType });
 
                    const tracks = stream.getAudioTracks();
                    tracks.forEach((track) => {
                        track.stop();
                        track.enabled = false;
                    });
 
                    let formData = new FormData();
                    formData.append("audio", devBlob);
 
                    axios
                        .post(route("constructionreport.process.voice"), formData)
                        .then((response) => {
                            let text = response.data?.text;
                            form.comment = text;
                            form.audios.push(response.data.path);
 
                            alert(response.data.text);
                            alert(response.data.path);
                        })
                        .catch((error) => {
                            // 400 when file empty on serverside
                            alert("Audio-Process-Error: " + error.message);
                        })
                        .finally(() => {
                            isRecording.value = false;
                            devRecorder.ondataavailable = undefined;
                            devRecorder.onstop = undefined;
                            devRecorder = undefined;
                            devAudioChunks = [];
                            devBlob = null;
                        });
                };
            } catch (error) {
                alert("Failed to initialize MediaRecorder: " + error.message);
                isRecording.value = false;
                return;
            }
        })
        .catch((error) => {
            alert("Error accessing microphone: " + error.message);
            isRecording.value = false;
        });
};
 
const stopRecording = () => {
    if (!devRecorder) {
        alert("Recording is not in progress or recorder is not initialized.");
        return;
    }
 
    devRecorder.stop();
};
