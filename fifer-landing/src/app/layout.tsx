import type { Metadata } from "next";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Source_Sans_3, Manrope } from "next/font/google";
import Script from 'next/script'; 

import { siteDetails } from '@/data/siteDetails';

import "./globals.css";

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans' });

export const metadata: Metadata = {
  title: siteDetails.metadata.title,
  description: siteDetails.metadata.description,
  openGraph: {
    title: siteDetails.metadata.title,
    description: siteDetails.metadata.description,
    url: siteDetails.siteUrl,
    type: 'website',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 675,
        alt: siteDetails.siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteDetails.metadata.title,
    description: siteDetails.metadata.description,
    images: ['/images/twitter-image.jpg'],
  },
  // --- VERIFICACIÓN DE ADMITAD ---
  // Esto generará automáticamente: <meta name="verify-admitad" content="3099946505" />
  verification: {
    other: {
      'verify-admitad': '3099946505',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sourceSans.variable} antialiased font-sans`}>
        {siteDetails.googleAnalyticsId && (
          <GoogleAnalytics gaId={siteDetails.googleAnalyticsId} />
        )}
        
        {children}

        {/* --- IMPACT STAT TAG VERIFICATION --- */}
        <Script id="impact-stat-tag" strategy="afterInteractive">
          {`
            (function(i,m,p,a,c,t){
              c.ire_o=p;
              c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};
              t=a.createElement(m);
              var z=a.getElementsByTagName(m)[0];
              t.async=1;
              t.src=i;
              z.parentNode.insertBefore(t,z)
            })('https://utt.impactcdn.com/P-A7161370-3636-4aa4-8330-9e02253a92d91.js','script','impactStat',document,window);
            
            impactStat('transformLinks');
            impactStat('trackImpression');
          `}
        </Script>
      </body>
    </html>
  );
}
