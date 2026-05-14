import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import SecretThread from '../../../models/SecretThread';
import SecretMessage from '../../../models/SecretMessage';
import { getSessionUserId } from '../../../lib/getSessionUserId';

// GET /api/secret — list all threads for the current user, enriched with the other person's info
export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const threads = await SecretThread.find({ participants: userId })
      .sort({ lastAt: -1 })
      .lean();

    // Enrich each thread with the other participant's user info
    const enriched = await Promise.all(
      threads.map(async (thread) => {
        const otherId = (thread.participants as string[]).find(id => id !== userId);
        const other = otherId
          ? await User.findById(otherId).select('name email image').lean()
          : null;
        return {
          ...thread,
          other: other
            ? {
                id: otherId,
                name: (other as any).name,
                email: (other as any).email,
                image: (other as any).image && !(other as any).image.startsWith('data:')
                  ? (other as any).image
                  : null,
              }
            : null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/secret error:', err);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }
}

// POST /api/secret — find or create a thread with another user (by email)
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }
    if (email.trim().toLowerCase() === (await User.findById(userId).select('email').lean() as any)?.email) {
      return NextResponse.json({ error: 'You cannot start a secret thread with yourself' }, { status: 400 });
    }

    await dbConnect();

    const other = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email image').lean();
    if (!other) {
      return NextResponse.json({ error: `No Silk account found for "${email.trim()}"` }, { status: 404 });
    }

    const otherId = (other as any)._id.toString();
    const participants = [userId, otherId].sort(); // deterministic order

    // Upsert: find existing or create new thread
    let thread = await SecretThread.findOne({ participants }).lean();
    if (!thread) {
      thread = await SecretThread.create({ participants, lastMessage: '', lastAt: new Date() });
      thread = (thread as any).toObject ? (thread as any).toObject() : thread;
    }

    return NextResponse.json({
      threadId: (thread as any)._id.toString(),
      other: {
        id: otherId,
        name: (other as any).name,
        email: (other as any).email,
        image: (other as any).image && !(other as any).image.startsWith('data:')
          ? (other as any).image
          : null,
      },
    });
  } catch (err) {
    console.error('POST /api/secret error:', err);
    return NextResponse.json({ error: 'Failed to start thread' }, { status: 500 });
  }
}
