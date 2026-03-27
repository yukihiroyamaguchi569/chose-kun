import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: candError.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}
