/**
 * Returns the API Bearer token. Currently unused (NextAuth/Supabase use session cookies).
 */
export async function getApiToken(): Promise<string | null> {
  return Promise.resolve(null)
}
