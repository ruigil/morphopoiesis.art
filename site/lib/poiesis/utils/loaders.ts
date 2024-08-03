export const loadWGSL = async (url: string) => {
    return await (await fetch(url)).text()
}
export const loadJSON = async (url: string) => {
    return await (await fetch(url)).json();
}

export const loadTexture = async (url: string) => {
    const response = await fetch(new URL(url, import.meta.url).toString());
    return await createImageBitmap(await response.blob());
}

export const loadWebcam = async () => {
    // Request permission to access the user's camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })

    // Create a video element to capture the video stream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.autoplay = true;

    await video.play();
    const videoSettings = stream.getVideoTracks()[0].getSettings();
    const capabilities = stream.getVideoTracks()[0].getCapabilities();
    
    return { video: video, settings: videoSettings, capabilities: capabilities }; 
}
