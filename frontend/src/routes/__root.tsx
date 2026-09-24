/// <reference types="vite/client" />

import { useEffect, useState, type ReactNode } from 'react';
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import App from '../app/App';
import appCss from '../styles/index.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'Online Examination System Prototype' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  ssr: false,
});

function RootComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted ? <App /> : null;
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
