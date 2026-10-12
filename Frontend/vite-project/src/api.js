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

// Exchanges the Google ID token for a session cookie; returns the user.
export async function loginWithGoogle(credential) {
    const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
    });
    return parseResponse(res, "Failed to sign in");
}

// Returns the signed in user, or null when there is no valid session.
export async function getCurrentUser() {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (res.status === 401) return null;
    return parseResponse(res, "Failed to load user");
}

export async function logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
    return parseResponse(res, "Failed to sign out");
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
