import React from 'react';
import Image from 'next/image';

import TikTokConnectButton from './TikTokConnectButton';

import { heroDetails } from '@/data/hero';

const Hero: React.FC = () => {
    return (
        <section
            id="hero"
            className="relative flex items-center justify-center overflow-hidden pb-0 pt-32 md:pt-40 px-5"
        >
            <div className="absolute left-0 top-0 bottom-0 -z-10 w-full bg-gradient-to-b from-fifer-navy via-[#0a0f1a] to-fifer-dark" />
            <div className="absolute left-0 top-0 bottom-0 -z-10 w-full opacity-40">
                <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,rgba(234,179,8,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(234,179,8,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_40%,#000_55%,transparent_100%)]" />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[var(--background)] to-transparent" />

            <div className="text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-fifer-yellow/90">
                    FIFER × IA deportiva
                </p>
                <h1 className="text-4xl md:text-6xl md:leading-tight font-bold text-white max-w-lg md:max-w-2xl mx-auto">{heroDetails.heading}</h1>
                <p className="mt-4 text-zinc-300 max-w-lg mx-auto">{heroDetails.subheading}</p>
                <div className="mt-6 flex flex-col sm:flex-row items-center sm:gap-4 w-fit mx-auto">
                    <TikTokConnectButton />
                </div>
                <Image
                    src={heroDetails.centerImageSrc}
                    width={384}
                    height={340}
                    quality={100}
                    sizes="(max-width: 768px) 100vw, 384px"
                    priority={true}
                    unoptimized={true}
                    alt="app mockup"
                    className='relative mt-12 md:mt-16 mx-auto z-10'
                />
            </div>
        </section>
    );
};

export default Hero;
