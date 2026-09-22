import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'GALACTIC SMASH BROS', description: 'Choose your fighter. Smash through the rogue pack in a pixel-art arena survival game.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
