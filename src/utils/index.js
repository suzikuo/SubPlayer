export const userAgent = window.navigator.userAgent;
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

export function getExt(url) {
    return url.trim().toLowerCase().split('.').pop();
}

export function sleep(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function download(url, name) {
    const elink = document.createElement('a');
    elink.style.display = 'none';
    elink.href = url;
    elink.download = name;
    document.body.appendChild(elink);
    elink.click();
    document.body.removeChild(elink);
}

export function getKeyCode(event) {
    const tag = document.activeElement.tagName.toUpperCase();
    const editable = document.activeElement.getAttribute('contenteditable');
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && editable !== '' && editable !== 'true') {
        return Number(event.keyCode);
    }
}

export function isPlaying($video) {
    return !!($video.currentTime > 0 && !$video.paused && !$video.ended && $video.readyState > 2);
}

export const getVideoDimensions = (file) =>
    new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = url;

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.removeAttribute('src');
            video.load();
        };

        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({ width: 1920, height: 1080 });
        }, 8000);

        video.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            const width = video.videoWidth || 1920;
            const height = video.videoHeight || 1080;
            cleanup();
            resolve({ width, height });
        };

        video.onerror = () => {
            clearTimeout(timeoutId);
            cleanup();
            resolve({ width: 1920, height: 1080 });
        };
    });
