import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import SecretThread from '../../../../models/SecretThread';
import SecretMessage from '../../../../models/SecretMessage';
import { getSessionUserId } from '../../../../lib/getSessionUserId';
import { notifyUser } from '../../../../lib/sse';

type Params = { params: Promise<{ threadId: string }> };

// GET /api/secret/[threadId] — return thread + messages (current user must be a participant)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { threadId } = await params;
    await dbConnect();

    const thread = await SecretThread.findById(threadId).lean();
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    if (!(thread.participants as string[]).includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const otherId = (thread.participants as string[]).find(id => id !== userId);
    const other = otherId
      ? await User.findById(otherId).select('name email image').lean()
      : null;

    const messages = await SecretMessage.find({ threadId }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({
      thread: {
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
      },
      messages,
    });
  } catch (err) {
    console.error('GET /api/secret/[threadId] error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/secret/[threadId] — send a message
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { threadId } = await params;
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    await dbConnect();

    const thread = await SecretThread.findById(threadId);
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    if (!(thread.participants as string[]).includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message = await SecretMessage.create({
      threadId,
      fromUserId: userId,
      content: content.trim(),
    });

    const msgObj = (message as any).toObject ? (message as any).toObject() : message;
    const otherId = (thread.participants as string[]).find(id => id !== userId);

    // Notify the other participant immediately — don't block on thread preview update
    if (otherId) {
      notifyUser(otherId, { type: 'new_secret_message', threadId, message: msgObj });
    }

    // Update thread preview in the background (fire-and-forget)
    const preview = content.trim().length > 60 ? content.trim().substring(0, 60) + '…' : content.trim();
    SecretThread.findByIdAndUpdate(threadId, { lastMessage: preview, lastAt: new Date() })
      .exec()
      .catch((e: unknown) => console.error('Thread preview update failed:', e));

    return NextResponse.json(msgObj, { status: 201 });
  } catch (err) {
    console.error('POST /api/secret/[threadId] error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
