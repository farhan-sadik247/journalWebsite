import './globals.scss';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { InitializeFounder } from '@/components/InitializeFounder';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Global Journal of Advanced Technology - Innovating the Future, One Breakthrough at a Time',
  description: 'Global Journal of Advanced Technology (GJADT) - A premier platform for publishing cutting-edge research in advanced technology. Innovating the Future, One Breakthrough at a Time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <InitializeFounder />
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
