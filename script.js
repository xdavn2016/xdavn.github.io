const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev';

const TEXT_BYTE_LIMIT = 300;
const textEncoder = new TextEncoder();

window.onload = async () => {
    document.getElementById('charcount').textContent = `0/${TEXT_BYTE_LIMIT}`;
    try {
        const response = await fetch(`${ENDPOINT}/api/status`);
        const data = await response.json();

        if (data?.data?.available) {
            console.info(`${data.data.meta.dc} is ready to provide service`);
            enableControls();
        } else {
            setError("⚠ Dịch vụ không khả dụng. Vui lòng thử lại sau.");
        }
    } catch (error) {
        setError("🚨 Không thể kết nối API.");
        console.error(error);
    }
};

const setError = (message) => {
    clearAudio();
    const errorBox = document.getElementById('error');
    errorBox.classList.add('show');
    errorBox.style.display = 'block';
    document.getElementById('errortext').innerHTML = message;
    updateProgress("⛔ Đã xảy ra lỗi!");
};

const clearError = () => {
    const errorBox = document.getElementById('error');
    errorBox.classList.remove('show');
    errorBox.style.display = 'none';
    document.getElementById('errortext').innerHTML = '';
};

const setAudio = (audioBlob, text) => {
    const url = URL.createObjectURL(audioBlob);
    document.getElementById('success').classList.add('show');
    document.getElementById('success').style.display = 'block';
    document.getElementById('audio').src = url;
    document.getElementById('generatedtext').innerHTML = `"${text}"`;

    // Cập nhật nút tải xuống
    const downloadLink = document.getElementById('download');
    downloadLink.href = url;
    downloadLink.download = 'tts_audio.mp3';
    downloadLink.classList.remove('hidden');

    updateProgress("✅ Hoàn thành!");
};

const clearAudio = () => {
    document.getElementById('success').classList.remove('show');
    document.getElementById('success').style.display = 'none';
    document.getElementById('audio').src = '';
    document.getElementById('generatedtext').innerHTML = '';
    document.getElementById('download').classList.add('hidden');
};

const disableControls = () => {
    document.getElementById('text').setAttribute('disabled', '');
    document.getElementById('voice').setAttribute('disabled', '');
    document.getElementById('submit').setAttribute('disabled', '');
};

const enableControls = () => {
    document.getElementById('text').removeAttribute('disabled');
    document.getElementById('voice').removeAttribute('disabled');
    document.getElementById('submit').removeAttribute('disabled');
};

const updateProgress = (message) => {
    const progressBox = document.getElementById('progress');
    progressBox.style.display = 'block';
    document.getElementById('progress-text').innerHTML = message;
};

const hideProgress = () => {
    document.getElementById('progress').style.display = 'none';
};

const onTextareaInput = () => {
    const text = document.getElementById('text').value;
    const textEncoded = textEncoder.encode(text);
    document.getElementById('charcount').textContent = `${textEncoded.length}/${TEXT_BYTE_LIMIT}`;

    if (textEncoded.length > TEXT_BYTE_LIMIT) {
        document.getElementById('charcount').style.color = 'red';
    } else {
        document.getElementById('charcount').style.color = 'black';
    }
};

const submitForm = async () => {
    clearError();
    clearAudio();
    disableControls();
    hideProgress();

    const text = document.getElementById('text').value.trim();
    const voice = document.getElementById('voice').value;

    if (!text) {
        setError("⚠ Vui lòng nhập văn bản.");
        enableControls();
        return;
    }

    if (voice === "none") {
        setError("⚠ Vui lòng chọn giọng nói.");
        enableControls();
        return;
    }

    const lines = text.split("\n").filter(line => line.trim() !== "");

    updateProgress(`🔄 Đang xử lý ${lines.length} dòng văn bản...`);

    try {
        const audioBlobs = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            updateProgress(`🎙 Xử lý dòng ${i + 1}/${lines.length}: "${line}"...`);

            const response = await fetch(`${ENDPOINT}/api/generation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: line, voice: voice }),
            });

            const result = await response.json();
            if (!result.data) {
                setError(`🚨 Lỗi khi xử lý dòng: "${line}"`);
                enableControls();
                return;
            }

            const audioBlob = await base64ToBlob(result.data, "audio/mpeg");
            audioBlobs.push(audioBlob);
        }

        updateProgress("🔄 Đang ghép các đoạn âm thanh...");

        const mergedBlob = new Blob(audioBlobs, { type: "audio/mpeg" });
        setAudio(mergedBlob, text);
    } catch (error) {
        setError("🚨 Lỗi không xác định khi tạo âm thanh.");
        console.error(error);
    }

    enableControls();
};

// Chuyển Base64 thành Blob
const base64ToBlob = async (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};
