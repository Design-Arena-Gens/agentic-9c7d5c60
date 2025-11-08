import './globals.css';

export const metadata = {
  title: 'Stock Cycle Analysis',
  description: 'FFT-based cycle analysis for Indian stocks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="max-w-6xl mx-auto p-6">
          <header className="mb-8">
            <h1 className="text-2xl font-bold">Indian Stocks Cycle Analysis</h1>
            <p className="text-slate-600">Detect dominant market cycles using FFT</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
