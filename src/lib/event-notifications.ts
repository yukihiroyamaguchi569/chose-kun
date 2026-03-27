import type { Candidate, Event, EventNotification, Response } from '@/types';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type NotificationReason = NonNullable<EventNotification['notification_reason']>;

type NotificationContext = {
  event: Event;
  notification: EventNotification;
  candidates: Candidate[];
  responses: Response[];
  responseCount: number;
};

type SendProgressNotificationResult =
  | { sent: false; reason: 'disabled' | 'already_sent' | 'target_not_met' | 'not_due' | 'missing_context' }
  | { sent: true; reason: NotificationReason; eventId: string };

export function notificationsAreConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SLACK_WEBHOOK_URL);
}

function getEventUrl(eventId: string) {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (baseUrl) {
    return new URL(`/event/${eventId}`, baseUrl).toString();
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/event/${eventId}`;
  }

  return '';
}

async function sendSlackMessage(text: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Slack webhook environment variable is not set.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to send Slack message: ${errorBody}`);
  }
}

function buildSummary(candidates: Candidate[], responses: Response[]) {
  return candidates.map(candidate => {
    let maru = 0;
    let sankaku = 0;

    responses.forEach(response => {
      const answer = response.answers[candidate.id];

      if (answer === 'maru') {
        maru += 1;
      } else if (answer === 'sankaku') {
        sankaku += 1;
      }
    });

    return {
      label: candidate.label,
      maru,
      sankaku,
      score: maru * 2 + sankaku,
    };
  });
}

function formatBestCandidates(candidates: Candidate[], responses: Response[]) {
  if (candidates.length === 0) {
    return '候補日時はまだ登録されていません。';
  }

  const summary = buildSummary(candidates, responses);
  const bestScore = Math.max(...summary.map(item => item.score), 0);

  if (bestScore === 0) {
    return '現時点では有力候補はまだありません。';
  }

  return summary
    .filter(item => item.score === bestScore)
    .slice(0, 3)
    .map(item => `${item.label}（◯${item.maru} / △${item.sankaku}）`)
    .join('\n');
}

function buildSlackMessage(context: NotificationContext, reason: NotificationReason) {
  const responseTarget = context.event.expected_responses;
  const responseLine = responseTarget
    ? `${context.responseCount}/${responseTarget}人が回答しました。`
    : `${context.responseCount}人が回答しました。`;
  const eventUrl = getEventUrl(context.event.id);
  const urlLine = eventUrl ? `イベントURL: ${eventUrl}` : '';

  const text = [
    reason === 'expected_responses_reached'
      ? `:white_check_mark: 「${context.event.title}」が目安人数に達しました`
      : `:hourglass_flowing_sand: 「${context.event.title}」の回答状況をお知らせします`,
    responseLine,
    reason === 'reminder_after_days_elapsed'
      ? `${context.event.reminder_after_days}日が経過したため、現在の回答状況を通知しています。`
      : '',
    '',
    '現時点の有力候補:',
    formatBestCandidates(context.candidates, context.responses),
    urlLine,
  ]
    .filter(Boolean)
    .join('\n');

  return { text };
}

async function getNotificationContext(eventId: string): Promise<NotificationContext | null> {
  const supabase = getSupabaseAdmin();

  const [eventResult, notificationResult, candidatesResult, responsesResult] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).single(),
    supabase.from('event_notifications').select('*').eq('event_id', eventId).single(),
    supabase.from('candidates').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('responses').select('*').eq('event_id', eventId).order('created_at'),
  ]);

  if (
    eventResult.error ||
    notificationResult.error ||
    candidatesResult.error ||
    responsesResult.error ||
    !eventResult.data ||
    !notificationResult.data
  ) {
    return null;
  }

  return {
    event: eventResult.data,
    notification: notificationResult.data,
    candidates: candidatesResult.data || [],
    responses: responsesResult.data || [],
    responseCount: responsesResult.data?.length || 0,
  };
}

async function markNotificationSent(eventId: string, reason: NotificationReason) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('event_notifications')
    .update({
      notification_sent_at: new Date().toISOString(),
      notification_reason: reason,
    })
    .eq('event_id', eventId)
    .is('notification_sent_at', null);

  if (error) {
    throw new Error(`Failed to update notification state: ${error.message}`);
  }
}

async function sendProgressNotification(
  context: NotificationContext,
  reason: NotificationReason
): Promise<SendProgressNotificationResult> {
  if (context.notification.notification_sent_at) {
    return { sent: false, reason: 'already_sent' };
  }

  if (!context.event.expected_responses || !context.event.reminder_after_days) {
    return { sent: false, reason: 'disabled' };
  }

  if (reason === 'expected_responses_reached' && context.responseCount < context.event.expected_responses) {
    return { sent: false, reason: 'target_not_met' };
  }

  if (reason === 'reminder_after_days_elapsed') {
    const dueAt = new Date(context.event.created_at);
    dueAt.setDate(dueAt.getDate() + context.event.reminder_after_days);

    if (Date.now() < dueAt.getTime()) {
      return { sent: false, reason: 'not_due' };
    }
  }

  const { text } = buildSlackMessage(context, reason);
  await sendSlackMessage(text);
  await markNotificationSent(context.event.id, reason);

  return { sent: true, reason, eventId: context.event.id };
}

export async function maybeSendExpectedResponsesNotification(eventId: string) {
  if (!notificationsAreConfigured()) {
    return { sent: false, reason: 'disabled' } satisfies SendProgressNotificationResult;
  }

  const context = await getNotificationContext(eventId);

  if (!context) {
    return { sent: false, reason: 'missing_context' } satisfies SendProgressNotificationResult;
  }

  return sendProgressNotification(context, 'expected_responses_reached');
}

export async function sendDueReminderNotifications() {
  if (!notificationsAreConfigured()) {
    return { checked: 0, sent: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: pendingNotifications, error } = await supabase
    .from('event_notifications')
    .select('event_id')
    .is('notification_sent_at', null);

  if (error) {
    throw new Error(`Failed to load pending notifications: ${error.message}`);
  }

  let sent = 0;

  for (const row of pendingNotifications || []) {
    const context = await getNotificationContext(row.event_id);

    if (!context) {
      continue;
    }

    const result = await sendProgressNotification(context, 'reminder_after_days_elapsed');

    if (result.sent) {
      sent += 1;
    }
  }

  return {
    checked: pendingNotifications?.length || 0,
    sent,
  };
}
