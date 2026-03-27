'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import type { Event, Candidate, Response, Comment, Availability } from '@/types';

type EventPayload = {
  event: Event;
  candidates: Candidate[];
  responses: Response[];
  comments: Comment[];
};

function isEventPayload(payload: EventPayload | { error?: string } | null): payload is EventPayload {
  return Boolean(payload && 'event' in payload);
}

const AVAILABILITY_OPTIONS: { value: Availability; label: string; color: string; bg: string }[] = [
  { value: 'maru', label: '◯', color: 'text-matcha', bg: 'bg-matcha/10' },
  { value: 'sankaku', label: '△', color: 'text-kincha', bg: 'bg-kincha/10' },
  { value: 'batsu', label: '×', color: 'text-aka', bg: 'bg-aka/10' },
];

function getNextAvailability(current: Availability | undefined): Availability {
  if (!current || current === 'batsu') return 'maru';
  if (current === 'maru') return 'sankaku';
  return 'batsu';
}

function AvailabilityDisplay({ value }: { value: Availability | undefined }) {
  const opt = AVAILABILITY_OPTIONS.find(o => o.value === value);
  if (!opt) return <span className="text-usuzumi/30">—</span>;
  return <span className={`font-bold text-lg ${opt.color}`}>{opt.label}</span>;
}

function getSummary(candidates: Candidate[], responses: Response[]) {
  return candidates.map(c => {
    let maru = 0, sankaku = 0, batsu = 0;
    responses.forEach(r => {
      const a = r.answers[c.id];
      if (a === 'maru') maru++;
      else if (a === 'sankaku') sankaku++;
      else batsu++;
    });
    return { candidateId: c.id, label: c.label, maru, sankaku, batsu, score: maru * 2 + sankaku };
  });
}

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initializedRef = useRef(false);

  // 回答フォーム
  const [respondName, setRespondName] = useState('');
  const [respondAnswers, setRespondAnswers] = useState<Record<string, Availability>>({});
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // コメント（回答フォームに統合）
  const [respondComment, setRespondComment] = useState('');

  // URL共有
  const [copied, setCopied] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const payload = (await res.json().catch(() => null)) as EventPayload | { error?: string } | null;

      if (!res.ok || !isEventPayload(payload)) {
        const errorMessage =
          payload && !isEventPayload(payload) ? payload.error : 'イベントが見つかりませんでした';
        setError(errorMessage || 'イベントが見つかりませんでした');
        return;
      }

      setEvent(payload.event);
      const cands = payload.candidates || [];
      setCandidates(cands);
      setResponses(payload.responses || []);
      setComments(payload.comments || []);

      // 初回ロード時はデフォルトで全候補を◯に
      if (!initializedRef.current) {
        const defaults: Record<string, Availability> = {};
        cands.forEach(c => { defaults[c.id] = 'maru'; });
        setRespondAnswers(defaults);
        initializedRef.current = true;
      }
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const toggleAnswer = (candidateId: string) => {
    setRespondAnswers(prev => ({
      ...prev,
      [candidateId]: getNextAvailability(prev[candidateId]),
    }));
  };

  const startEdit = (response: Response) => {
    setEditingResponseId(response.id);
    setRespondName(response.name);
    setRespondAnswers(response.answers);
    setRespondComment('');
  };

  const cancelEdit = () => {
    setEditingResponseId(null);
    setRespondName('');
    setRespondComment('');
    // デフォルト全◯に戻す
    const defaults: Record<string, Availability> = {};
    candidates.forEach(c => { defaults[c.id] = 'maru'; });
    setRespondAnswers(defaults);
  };

  const submitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondName.trim()) return;

    setIsSubmitting(true);
    try {
      const url = `/api/events/${eventId}/responses`;
      const body = editingResponseId
        ? { responseId: editingResponseId, name: respondName.trim(), answers: respondAnswers }
        : { name: respondName.trim(), answers: respondAnswers };

      const res = await fetch(url, {
        method: editingResponseId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      // コメントがあれば一緒に送信
      if (respondComment.trim()) {
        await fetch(`/api/events/${eventId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: respondName.trim(), body: respondComment.trim() }),
        });
      }

      cancelEdit();
      await fetchEvent();
    } catch {
      alert('回答の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-aka/30 border-t-aka rounded-full animate-spin" />
        <p className="text-usuzumi text-sm mt-4">読み込み中...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-aka font-bold mb-2">{error || 'エラーが発生しました'}</p>
        <Link href="/" className="text-sm text-fuji hover:underline">トップに戻る</Link>
      </div>
    );
  }

  const summary = getSummary(candidates, responses);
  const bestScore = Math.max(...summary.map(s => s.score), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* イベントヘッダー */}
      <div className="animate-fade-up mb-8">
        <div className="bg-shironeri rounded-2xl border border-sumi/5 p-6 md:p-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-sumi mb-2">
            {event.title}
          </h2>
          {event.memo && (
            <p className="text-sm text-sumi-light whitespace-pre-wrap mt-2">{event.memo}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={copyUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-sumi/10 bg-washi hover:bg-washi-dark transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-matcha" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  コピーしました
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  URLをコピー
                </>
              )}
            </button>
            <span className="inline-flex items-center px-3 py-2 rounded-full text-xs text-usuzumi bg-washi">
              回答: {responses.length}人
            </span>
          </div>
        </div>
      </div>

      {/* 結果テーブル */}
      {responses.length > 0 && (
        <div className="animate-fade-up animate-fade-up-delay-1 mb-8">
          <h3 className="font-serif font-bold text-sumi text-lg mb-4 sumi-line inline-block">回答一覧</h3>
          <div className="bg-shironeri rounded-2xl border border-sumi/5 overflow-hidden mt-4">
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sumi/10">
                    <th className="sticky left-0 bg-shironeri z-10 text-left px-4 py-3 font-medium text-usuzumi text-xs min-w-[100px]">
                      日程
                    </th>
                    {responses.map(r => (
                      <th key={r.id} className="px-3 py-3 font-medium text-sumi text-xs text-center min-w-[70px]">
                        <button
                          onClick={() => startEdit(r)}
                          className="hover:text-fuji transition-colors"
                          title="クリックで編集"
                        >
                          {r.name}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3 font-medium text-usuzumi text-xs text-center min-w-[50px]">◯</th>
                    <th className="px-3 py-3 font-medium text-usuzumi text-xs text-center min-w-[50px]">△</th>
                    <th className="px-3 py-3 font-medium text-usuzumi text-xs text-center min-w-[50px]">×</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, i) => (
                    <tr
                      key={s.candidateId}
                      className={`border-b border-sumi/5 last:border-0 ${s.score === bestScore && bestScore > 0 ? 'bg-matcha/5' : ''}`}
                    >
                      <td className="sticky left-0 bg-shironeri z-10 px-4 py-3 font-medium text-sumi text-xs whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {s.score === bestScore && bestScore > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-matcha flex-shrink-0" />
                          )}
                          {s.label}
                        </span>
                      </td>
                      {responses.map(r => (
                        <td key={r.id} className="px-3 py-3 text-center">
                          <AvailabilityDisplay value={r.answers[candidates[i].id]} />
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center text-xs font-bold text-matcha">{s.maru}</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-kincha">{s.sankaku}</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-aka">{s.batsu}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 回答フォーム */}
      <div className="animate-fade-up animate-fade-up-delay-2 mb-8">
        <h3 className="font-serif font-bold text-sumi text-lg mb-4 sumi-line inline-block">
          {editingResponseId ? '回答を編集' : '出欠を入力'}
        </h3>
        <form onSubmit={submitResponse} className="bg-shironeri rounded-2xl border border-sumi/5 p-6 mt-4">
          <div className="mb-4">
            <label htmlFor="respondName" className="block text-xs font-medium text-usuzumi mb-1.5">
              あなたの名前
            </label>
            <input
              id="respondName"
              type="text"
              value={respondName}
              onChange={e => setRespondName(e.target.value)}
              placeholder="名前を入力"
              required
              className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-sumi/10 bg-washi/50 text-sumi placeholder:text-usuzumi/60 focus:outline-none focus:ring-2 focus:ring-aka/30 focus:border-aka/40 transition-all text-sm"
            />
          </div>

          <p className="text-xs text-usuzumi mb-3">各候補をクリックして ◯→△→× を切り替え</p>

          <div className="space-y-2 mb-6">
            {candidates.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 group"
              >
                <button
                  type="button"
                  onClick={() => toggleAnswer(c.id)}
                  className={`answer-btn w-10 h-10 rounded-xl flex items-center justify-center border text-lg font-bold ${
                    respondAnswers[c.id]
                      ? AVAILABILITY_OPTIONS.find(o => o.value === respondAnswers[c.id])?.bg + ' border-transparent'
                      : 'bg-washi border-sumi/10'
                  }`}
                >
                  {respondAnswers[c.id] ? (
                    <AvailabilityDisplay value={respondAnswers[c.id]} />
                  ) : (
                    <span className="text-usuzumi/30 text-sm">—</span>
                  )}
                </button>
                <span className="text-sm text-sumi">{c.label}</span>
              </div>
            ))}
          </div>

          {/* コメント入力（回答と一緒に送信） */}
          <div className="mb-6">
            <label htmlFor="respondComment" className="block text-xs font-medium text-usuzumi mb-1.5">
              コメント（任意）
            </label>
            <textarea
              id="respondComment"
              value={respondComment}
              onChange={e => setRespondComment(e.target.value)}
              placeholder="ひとことメッセージがあれば..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-sumi/10 bg-washi/50 text-sumi placeholder:text-usuzumi/60 focus:outline-none focus:ring-2 focus:ring-aka/30 focus:border-aka/40 transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !respondName.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-aka to-aka-light hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : editingResponseId ? '更新する' : '回答する'}
            </button>
            {editingResponseId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2.5 rounded-xl text-sm text-usuzumi border border-sumi/10 hover:bg-washi transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* コメント一覧 */}
      {comments.length > 0 && (
        <div className="animate-fade-up animate-fade-up-delay-3">
          <h3 className="font-serif font-bold text-sumi text-lg mb-4 sumi-line inline-block">コメント</h3>
          <div className="space-y-3 mt-4">
            {comments.map(c => (
              <div key={c.id} className="bg-shironeri rounded-xl border border-sumi/5 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sumi text-sm">{c.name}</span>
                  <span className="text-[10px] text-usuzumi">
                    {new Date(c.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-sumi-light whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
