'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { Transition } from '@headlessui/react';
import { HiOutlineXMark, HiBars3 } from 'react-icons/hi2';
import { FaFingerprint } from 'react-icons/fa';

import Container from './Container';
import TikTokConnectButton from './TikTokConnectButton';
import { siteDetails } from '@/data/siteDetails';
import { menuItems } from '@/data/menuItems';

const Header: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 mx-auto w-full border-b border-white/5 bg-zinc-950/85 backdrop-blur-md md:absolute md:bg-zinc-950/70">
            <Container className="!px-0">
                <nav className="mx-auto flex items-center justify-between px-5 py-3 md:py-8">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <FaFingerprint className="min-w-fit h-7 w-7 text-fifer-yellow" />
                        <span className="manrope cursor-pointer text-xl font-semibold text-white">
                            {siteDetails.siteName}
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <ul className="hidden md:flex space-x-6">
                        {menuItems.map(item => (
                            <li key={item.text}>
                                <Link href={item.url} className="text-zinc-300 transition-colors hover:text-fifer-yellow">
                                    {item.text}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <TikTokConnectButton compact />
                        </li>
                    </ul>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMenu}
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-fifer-yellow text-black focus:outline-none"
                            aria-controls="mobile-menu"
                            aria-expanded={isOpen}
                        >
                            {isOpen ? (
                                <HiOutlineXMark className="h-6 w-6" aria-hidden="true" />
                            ) : (
                                <HiBars3 className="h-6 w-6" aria-hidden="true" />
                            )}
                            <span className="sr-only">Toggle navigation</span>
                        </button>
                    </div>
                </nav>
            </Container>

            {/* Mobile Menu with Transition */}
            <Transition
                show={isOpen}
                enter="transition ease-out duration-200 transform"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-75 transform"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <div id="mobile-menu" className="border-t border-white/10 bg-zinc-950/95 shadow-lg md:hidden">
                    <ul className="flex flex-col space-y-4 px-6 pb-6 pt-1">
                        {menuItems.map(item => (
                            <li key={item.text}>
                                <Link href={item.url} className="block text-zinc-200 hover:text-fifer-yellow" onClick={toggleMenu}>
                                    {item.text}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <a href="/api/tiktok/auth" className="text-white bg-black hover:bg-neutral-800 px-5 py-2 rounded-full block w-fit" onClick={toggleMenu}>
                                Conectar con TikTok
                            </a>
                        </li>
                    </ul>
                </div>
            </Transition>
        </header>
    );
};

export default Header;
