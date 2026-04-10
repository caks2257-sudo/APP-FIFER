import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

import { siteDetails } from "@/data/siteDetails";
import "./globals.css";

const fontOpenSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const fontMontserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: siteDetails.metadata.title,
  description: siteDetails.metadata.description,
  appleWebApp: {
    capable: true,
    title: "FIFER",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontOpenSans.variable} ${fontMontserrat.variable}`}
    >
      <body className={`${fontOpenSans.className} font-sans antialiased`}>
        {siteDetails.googleAnalyticsId && (
          <GoogleAnalytics gaId={siteDetails.googleAnalyticsId} />
        )}

        {children}

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
