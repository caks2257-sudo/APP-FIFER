class VideoApiClient {
  async generateVideo(script, options = {}) {
    void options;
    console.log("🎬 Solicitando video a API Premium...");

    if (process.env.FEATURE_PREMIUM_VIDEO !== "true") {
      return {
        ok: false,
        error: "FEATURE_PREMIUM_VIDEO disabled",
        video_url: "",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const suffix = Date.now();
    return {
      ok: true,
      job_id: `mock-video-${suffix}`,
      video_url: `https://fifer-assets.s3.amazonaws.com/mock-video-${suffix}.mp4`,
      script_preview: String(script || "").slice(0, 120),
    };
  }

  async checkStatus(jobId) {
    return {
      ok: true,
      job_id: String(jobId || ""),
      status: "completed",
      video_url: "",
    };
  }
}

module.exports = {
  VideoApiClient,
};

