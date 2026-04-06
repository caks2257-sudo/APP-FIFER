const axios = require('axios');

async function publishVideo(videoUrl, textContent) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL || 'https://hook.us2.make.com/x6viup2sn727pwtfm4b65vw3ggwl8agx';
    const payload = {
        videoUrl,
        caption: textContent
    };

    const response = await axios.post(webhookUrl, payload);

    return response.data;
}

module.exports = { publishVideo };
