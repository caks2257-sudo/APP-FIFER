require('dotenv').config();

module.exports = {
    db: {
        url: process.env.DATABASE_URL,
        supabase: {
            url: process.env.SUPABASE_URL,
            anon: process.env.SUPABASE_ANON_KEY,
            service: process.env.SUPABASE_SERVICE_ROLE_KEY,
            jwt: process.env.SUPABASE_JWT_SECRET
        }
    },
    ai: {
        gemini: process.env.GOOGLE_AI_KEY,
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        groq: process.env.GROQ_API_KEY
    },
    media: {
        elevenlabs: process.env.ELEVENLABS_API_KEY,
        runway: process.env.RUNWAY_API_KEY,
        leonardo: process.env.LEONARDO_AI_KEY,
        vimeo: process.env.VIMEO_ACCESS_TOKEN
    },
    social: {
        ayrshare: process.env.AYRSHARE_API_KEY,
        youtube: {
            id: process.env.YOUTUBE_CLIENT_ID,
            secret: process.env.YOUTUBE_CLIENT_SECRET
        }
    },
    affiliates: {
        amazon: {
            tag: process.env.AMAZON_ASSOCIATES_TAG,
            key: process.env.AMAZON_ACCESS_KEY,
            secret: process.env.AMAZON_SECRET_KEY
        },
        impact: {
            sid: process.env.IMPACT_ACCOUNT_SID,
            token: process.env.IMPACT_AUTH_TOKEN
        },
        clickbank: {
            dev: process.env.CLICKBANK_DEV_KEY,
            clerk: process.env.CLICKBANK_CLERK_KEY,
            nick: process.env.CLICKBANK_ACCOUNT_NICKNAME
        },
        shareasale: {
            id: process.env.SHAREASALE_AFFILIATE_ID,
            token: process.env.SHAREASALE_API_TOKEN,
            secret: process.env.SHAREASALE_API_SECRET
        },
        partnerstack: {
            pk: process.env.PARTNERSTACK_PUBLIC_KEY,
            sk: process.env.PARTNERSTACK_SECRET_KEY
        },
        appsumo: {
            id: process.env.APPSUMO_PARTNER_ID,
            key: process.env.APPSUMO_API_KEY
        }
    },
    settings: {
        interval: parseInt(process.env.DATA_INGESTION_INTERVAL_HOURS) || 24,
        minScore: parseInt(process.env.MIN_POPULARITY_SCORE) || 50,
        redis: process.env.REDIS_URL
    }
};