import '../styles/globals.css';

export const metadata = {
  title: 'RIMT BCA  — T&P Web Admin Portal',
  description: 'Student Management ands Training & Placement Admin Portal with glossy KPIs, cryptographic credential verification, and responsive multi-device design.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=window.sessionStorage;if(s&&s.getItem('rimt_loader_seen')){document.documentElement.setAttribute('data-rimt-loader','seen');}}catch(e){}})();",
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/rimt-logo.png"
          as="image"
          type="image/png"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-[#FAF6F0] text-[#181A1F] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
