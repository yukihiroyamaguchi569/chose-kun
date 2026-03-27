import { NextRequest, NextResponse } from 'next/server';
import { notificationsAreConfigured } from '@/lib/event-notifications';
import { getSupabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const {
    title,
    memo,
    candidates,
    expectedResponses,
    reminderAfterDays,
  } = await request.json();

  if (!title || !candidates?.length) {
    return NextResponse.json({ error: 'title and candidates are required' }, { status: 400 });
  }

  const hasNotificationInput = [expectedResponses, reminderAfterDays].some(value => {
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim() !== '';
  });

  const notificationEnabled =
    Number.isInteger(expectedResponses) &&
    expectedResponses > 0 &&
    Number.isInteger(reminderAfterDays) &&
    reminderAfterDays > 0;

  if (hasNotificationInput && !notificationEnabled) {
    return NextResponse.json(
      { error: 'expectedResponses and reminderAfterDays must both be valid values' },
      { status: 400 }
    );
  }

  if (notificationEnabled && !notificationsAreConfigured()) {
    return NextResponse.json(
      { error: 'Slack notification environment variables are not configured' },
      { status: 500 }
    );
  }

  const supabase = getSupabase();
  const id = nanoid(10);

  const { error: eventError } = await supabase
    .from('events')
    .insert({
      id,
      title,
      memo: memo || '',
      expected_responses: notificationEnabled ? expectedResponses : null,
      reminder_after_days: notificationEnabled ? reminderAfterDays : null,
    });

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
    if (notificationEnabled) {
      await getSupabaseAdmin().from('events').delete().eq('id', id);
    }

    return NextResponse.json({ error: candError.message }, { status: 500 });
  }

  if (notificationEnabled) {
    const { error: notificationError } = await getSupabaseAdmin()
      .from('event_notifications')
      .insert({ event_id: id });

    if (notificationError) {
      await getSupabaseAdmin().from('events').delete().eq('id', id);
      return NextResponse.json({ error: notificationError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id });
}
