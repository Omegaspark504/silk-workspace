import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Note from '../../../models/Note';
import { getSessionUserId } from '../../../lib/getSessionUserId';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const notes = await Note.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(notes);
  } catch (err) {
    console.error('GET /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    await dbConnect();
    const note = await Note.create({ ...body, userId });
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
