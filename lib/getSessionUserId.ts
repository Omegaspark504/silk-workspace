import { getToken } from 'next-auth/jwt';
import { cookies, headers } from 'next/headers';

export async function getSessionUserId(): Promise<string | null> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    // Build a minimal req-shaped object that next-auth's getToken expects
    const cookieMap: Record<string, string> = {};
    cookieStore.getAll().forEach(({ name, value }) => {
      cookieMap[name] = value;
    });

    const token = await getToken({
      req: { cookies: cookieMap, headers: headerStore } as any,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    return token?.sub ?? null;
  } catch {
    return null;
  }
}
