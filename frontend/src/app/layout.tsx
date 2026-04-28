import React from 'react';
import AntdProvider from '@/providers/AntdProvider';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rudraksh Capital - NBFC Software',
  description: 'Financial software for Microfinance and NBFCs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
