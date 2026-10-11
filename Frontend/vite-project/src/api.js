const API_BASE = "/api";


export async function uploadHeadshot(file){
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/upload-headshot`,{
        method: "POST",
        body: form,
    });

    if (!res.ok){
        throw new Error("Failed to upload headshot");
    }
    return res.json();

}

export async function createjob({prompt,numThumbnails, headshot}){
    const res = await fetch(`${API_BASE}/job`,{
        method:"POST",
        headers:{
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            promt,
            numThumbnails:numThumbnails,
            headshot_url: headshotUrl,
        }),
    });
    if (!res.ok){
        throw new Error ("Failed to create job")
    }
    return res.json();
}

export async function subscribeToJob(jobId, {onThumbnailReady, onThumbnailFailed,
    onJobComplete,onError}) {

        const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);

        es.addEventListner("thumbnail_ready", (event)=>{
            onThumbnailReady(JSON.parse(event.data));
        });

        es.addEventListner("thumbnail_failed", (event)=>{

            onThumbnailFailed(JSON.parse(event.data));
        });

        es.addEventListner("job_complete", (event)=>{
            onJobComplete(JSON.parse(event.data));
            es.close();

        });

        es.addEventListner("error", (event)=>{
            onError(event);
            es.close();
        });

        return() => {

            
        }

    }