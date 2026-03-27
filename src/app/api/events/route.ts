import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { title, memo, candidates } = await request.json();

    if (!title || !candidates?.length) {
      return NextResponse.json({ error: 'title and candidates are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const id = nanoid(10);

    const { error: eventError } = await supabase
      .from('events')
      .insert({ id, title, memo: memo || '' });

    if (eventError) {
      console.error('Failed to insert event', { message: eventError.message, code: eventError.code });
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    const candidateRows = candidates.map((label: string, i: number) => ({
      event_id: id,
      label,
      sort_order: i,
    }));

    const { error: candError } = await supabase
      .from('candidates')
      .insert(candidateRows);

    if (candError) {
      console.error('Failed to insert candidates', { message: candError.message, code: candError.code, eventId: id });
      return NextResponse.json({ error: candError.message }, { status: 500 });
    }

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while creating event';
    console.error('Unexpected error in /api/events', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
