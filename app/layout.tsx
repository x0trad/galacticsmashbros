import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'GALACTIC DOG SMASH', description: 'Choose your space dog. Smash through the rogue pack. A pixel-art arena survival game.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
