const axios = require('axios');

function getWebhookUrl() {
    return process.env.MAKE_WEBHOOK_URL || 'https://hook.us2.make.com/x6viup2sn727pwtfm4b65vw3ggwl8agx';
}

async function publishMake(payload) {
    const webhookUrl = getWebhookUrl();
    const response = await axios.post(webhookUrl, payload);
    return response.data;
}

async function publishVideo(videoUrl, textContent) {
    return publishMake({
        type: 'reel',
        videoUrl,
        caption: textContent
    });
}

module.exports = { publishVideo, publishMake };
