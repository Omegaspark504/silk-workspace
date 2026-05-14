import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

export async function POST(request: NextRequest) {
  try {
    const { email, password, callbackUrl } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Only store a URL reference in the JWT — base64 data URLs are too large for a cookie
    const imageRef = (user.image && !user.image.startsWith('data:')) ? user.image : null;

    const token = await encode({
      token: {
        sub: user._id.toString(),
        name: user.name,
        email: user.email,
        image: imageRef,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const dest = callbackUrl || '/inbox';
    const response = NextResponse.json({ ok: true, redirectTo: dest });

    const isSecure = request.url.startsWith('https');
    const cookieName = isSecure
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Custom signin error:', error);
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
  }
}
