import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = getSupabaseAdmin();

  const [eventRes, candRes, respRes, commRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).single(),
    supabase.from('candidates').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('responses').select('*').eq('event_id', eventId).order('created_at'),
    supabase.from('comments').select('*').eq('event_id', eventId).order('created_at'),
  ]);

  if (eventRes.error || !eventRes.data) {
    return NextResponse.json({ error: 'イベントが見つかりませんでした' }, { status: 404 });
  }

  if (candRes.error || respRes.error || commRes.error) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    event: eventRes.data,
    candidates: candRes.data || [],
    responses: respRes.data || [],
    comments: commRes.data || [],
  });
}
