import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { maybeSendExpectedResponsesNotification } from '@/lib/event-notifications';
import { getSupabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const { name, answers } = await request.json();

  if (!name || !answers) {
    return NextResponse.json({ error: 'name and answers are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('responses')
    .insert({ event_id: eventId, name, answers })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  after(async () => {
    try {
      await maybeSendExpectedResponsesNotification(eventId);
    } catch (notificationError) {
      console.error('Failed to send response progress notification', notificationError);
    }
  });

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const { responseId, name, answers } = await request.json();

  if (!responseId || !name || !answers) {
    return NextResponse.json({ error: 'responseId, name and answers are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('responses')
    .update({ name, answers, updated_at: new Date().toISOString() })
    .eq('id', responseId)
    .eq('event_id', eventId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
