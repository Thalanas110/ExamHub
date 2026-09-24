export function getAuthHeaders(auth: boolean): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('examhub_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}
