import { IFAQ } from "@/types";
import { siteDetails } from "./siteDetails";

export const faqs: IFAQ[] = [
    {
        question: `Is ${siteDetails.siteName} secure?`,
        answer: 'Yes. We use encrypted transport, access control, and role-based permissions to protect affiliate and publication data.',
    },
    {
        question: `Can I use ${siteDetails.siteName} on multiple devices?`,
        answer: 'Absolutely. Your team can operate FIFER from desktop and mobile browsers with synchronized campaign status.',
    },
    {
        question: 'Can I connect TikTok and affiliate sources?',
        answer: `Yes. ${siteDetails.siteName} is designed to orchestrate TikTok publication workflows and affiliate tracking in one operational pipeline.`
    },
    {
        question: 'Do I need technical knowledge to automate content?',
        answer: 'No. FIFER provides guided automations and clear status tracking so marketing and league teams can run workflows without coding.',
    },
    {
        question: 'How is data handled for compliance?',
        answer: 'We process only required operational data, maintain audit logs, and provide legal pages for terms and privacy disclosures.',
    }
];