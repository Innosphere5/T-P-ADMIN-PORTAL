import '../styles/globals.css';

export const metadata = {
  title: 'RIMT BCA  — T&P Web Admin Portal',
  description: 'Student Management ands Training & Placement Admin Portal with glossy KPIs, cryptographic credential verification, and responsive multi-device design.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#F8F9FD] text-[#181A1F] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
