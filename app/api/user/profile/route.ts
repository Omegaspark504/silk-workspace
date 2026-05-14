import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { getSessionUserId } from '../../../../lib/getSessionUserId';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    console.error('GET /api/user/profile error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['name', 'bio', 'phone', 'location', 'website', 'twitter', 'linkedin', 'image', 'preferences'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (update.name !== undefined && (update.name as string).trim().length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    await dbConnect();
    const updated = await User.findByIdAndUpdate(userId, update, { new: true }).select('-passwordHash').lean();
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/user/profile error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
