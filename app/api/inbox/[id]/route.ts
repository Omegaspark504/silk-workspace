import { NextResponse, NextRequest } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Letter from '../../../../models/Letter';
import { getSessionUserId } from '../../../../lib/getSessionUserId';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await request.json();
    await dbConnect();

    const updated = await Letter.findOneAndUpdate({ _id: id, userId }, body, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/inbox/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await dbConnect();
    const deleted = await Letter.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /api/inbox/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
}
