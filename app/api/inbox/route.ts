import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Letter from '../../../models/Letter';
import User from '../../../models/User';
import { getSessionUserId } from '../../../lib/getSessionUserId';
import { notifyUser } from '../../../lib/sse';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const letters = await Letter.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(letters);
  } catch (err) {
    console.error('GET /api/inbox error:', err);
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, content } = await request.json();

    if (!to?.trim())      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });

    await dbConnect();

    // Look up recipient by email
    const recipient = await User.findOne({ email: to.trim().toLowerCase() }).select('_id name').lean();
    if (!recipient) {
      return NextResponse.json({ error: `No Silk account found for "${to.trim()}"` }, { status: 404 });
    }

    // Get sender info
    const senderUser = await User.findById(userId).lean();
    const senderName  = (senderUser as any)?.name  || 'Unknown';
    const senderEmail = (senderUser as any)?.email || '';
    const senderImg   = (senderUser as any)?.image || '';
    // Don't embed base64 avatars in the letter record
    const avatar = (senderImg && !senderImg.startsWith('data:')) ? senderImg : '';

    const preview = content.length > 120 ? content.substring(0, 120) + '…' : content;

    const letter = await Letter.create({
      userId:      (recipient as any)._id.toString(),
      fromUserId:  userId,
      sender:      senderName,
      senderEmail,
      avatar,
      subject,
      preview,
      content,
      time: 'Just now',
      isRead: false,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isSystem: false,
    });

    // Push real-time notification to the recipient
    notifyUser((recipient as any)._id.toString(), {
      type: 'new_letter',
      letter: (letter as any).toObject ? (letter as any).toObject() : letter,
    });

    return NextResponse.json({ ok: true, letterId: letter._id, recipientName: (recipient as any).name || to }, { status: 201 });
  } catch (err) {
    console.error('POST /api/inbox error:', err);
    return NextResponse.json({ error: 'Failed to send letter' }, { status: 500 });
  }
}
