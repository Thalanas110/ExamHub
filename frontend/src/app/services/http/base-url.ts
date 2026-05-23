const envPhpBaseUrl = (import.meta.env.VITE_PHP_BASE_URL as string | undefined)?.trim();

const FRONTEND_DEV_PORTS = new Set(['3000', '4173', '5173', '8080']);

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function inferPhpBaseUrlFromWindow(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost/group8/api';
  }

  const { hostname, origin, pathname, port, protocol } = window.location;
  const normalizedPath = pathname.toLowerCase();

  // Laragon/XAMPP folder host mode (http://localhost/group8/...)
  if (normalizedPath === '/group8' || normalizedPath.startsWith('/group8/')) {
    return `${origin}/group8/api`;
  }

  // Frontend dev servers should call the PHP backend host directly.
  if (FRONTEND_DEV_PORTS.has(port)) {
    // Use Vite proxy in development to avoid browser CORS preflights.
    return '/api';
  }

  // Laragon virtual host mode (http://group8.test/...)
  return `${origin}/api`;
}

export const PHP_BASE_URL = stripTrailingSlashes(
  envPhpBaseUrl && envPhpBaseUrl !== '' ? envPhpBaseUrl : inferPhpBaseUrlFromWindow(),
);
