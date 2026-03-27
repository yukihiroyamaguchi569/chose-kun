export type Availability = 'maru' | 'sankaku' | 'batsu';

export interface Event {
  id: string;
  title: string;
  memo: string;
  expected_responses: number | null;
  reminder_after_days: number | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  event_id: string;
  label: string;
  sort_order: number;
}

export interface Response {
  id: string;
  event_id: string;
  name: string;
  answers: Record<string, Availability>;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  event_id: string;
  name: string;
  body: string;
  created_at: string;
}

export interface EventNotification {
  event_id: string;
  notification_sent_at: string | null;
  notification_reason: 'expected_responses_reached' | 'reminder_after_days_elapsed' | null;
  created_at: string;
}
