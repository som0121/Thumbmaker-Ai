const API_BASE = "/api";

async function parseResponse(res, fallbackMessage) {
    if (!res.ok) {
        let detail;
        try {
            detail = (await res.json()).detail;
        } catch {
            // body was not JSON
        }
        throw new Error(typeof detail === "string" ? detail : fallbackMessage);
    }
    return res.json();
}

export async function uploadHeadshot(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/upload-headshot`, {
        method: "POST",
        body: formData,
    });
    return parseResponse(res, "Failed to upload headshot");
}

export async function createJob({ prompt, numThumbnails, headshotUrl }) {
    const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt,
            num_thumbnails: numThumbnails,
            headshot_url: headshotUrl,
        }),
    });
    return parseResponse(res, "Failed to create job");
}

// Returns an unsubscribe function that closes the stream.
export function subscribeToJob(jobId, { onThumbnailReady, onThumbnailFailed, onJobComplete, onError }) {
    const es = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);

    es.addEventListener("thumbnail_ready", (event) => {
        onThumbnailReady(JSON.parse(event.data));
    });

    es.addEventListener("thumbnail_failed", (event) => {
        onThumbnailFailed(JSON.parse(event.data));
    });

    es.addEventListener("job_completed", (event) => {
        es.close();
        onJobComplete(JSON.parse(event.data));
    });

    // fires for both the server's "error" event and a dropped connection
    es.addEventListener("error", (event) => {
        es.close();
        onError(event);
    });

    return () => es.close();
}
