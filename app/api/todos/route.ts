import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Todo from '../../../models/Todo';
import { getSessionUserId } from '../../../lib/getSessionUserId';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const todos = await Todo.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(todos);
  } catch (err) {
    console.error('GET /api/todos error:', err);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    await dbConnect();
    const todo = await Todo.create({ ...body, userId });
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    console.error('POST /api/todos error:', err);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
