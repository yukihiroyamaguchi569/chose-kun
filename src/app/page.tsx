'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const DEFAULT_TIME = '19:00';

function formatCandidateLabel(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return `${month}/${day}(${weekday}) ${DEFAULT_TIME}〜`;
}

function getCandidateDateKey(label: string) {
  const match = label.match(/^(\d{1,2})\/(\d{1,2})\([^)]+\)/);

  if (!match) {
    return null;
  }

  return `${Number(match[1])}/${Number(match[2])}`;
}

function buildCalendarDays(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<Date | null> = [];

  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [candidatesText, setCandidatesText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const calendarDays = buildCalendarDays(viewMonth);
  const selectedDateKeys = new Set(
    candidatesText
      .split('\n')
      .map(line => getCandidateDateKey(line.trim()))
      .filter((value): value is string => Boolean(value))
  );

  const appendCandidates = (labels: string[]) => {
    setCandidatesText(prev => {
      const existing = prev
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      const merged = [...existing];

      labels.forEach(label => {
        if (!merged.includes(label)) {
          merged.push(label);
        }
      });

      return merged.join('\n');
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !candidatesText.trim()) return;

    setIsSubmitting(true);
    try {
      const candidates = candidatesText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), memo: memo.trim(), candidates }),
      });

      if (!res.ok) throw new Error('Failed to create event');
      const { id } = await res.json();
      router.push(`/event/${id}`);
    } catch {
      alert('イベントの作成に失敗しました。');
      setIsSubmitting(false);
    }
  };

  const addSampleDates = () => {
    const today = new Date();
    const samples: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      samples.push(formatCandidateLabel(d));
    }
    appendCandidates(samples);
  };

  const addCandidateFromCalendar = (date: Date) => {
    appendCandidates([formatCandidateLabel(date)]);
  };

  const moveMonth = (offset: number) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* ヒーロー */}
      <section className="text-center mb-12 animate-fade-up">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-sumi mb-3 tracking-tight">
          みんなの予定を、<br className="md:hidden" />
          <span className="text-aka">サクッと</span>調整
        </h2>
        <p className="text-sumi-light text-sm md:text-base leading-relaxed">
          候補日を決めて共有するだけ。<br />
          参加者は ◯△× で回答。シンプルなスケジュール調整。
        </p>
      </section>

      {/* 作成フォーム */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up animate-fade-up-delay-1">
        <div className="bg-shironeri rounded-2xl shadow-sm border border-sumi/5 p-6 md:p-8 space-y-6">
          {/* STEP 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-aka text-white text-xs font-bold flex items-center justify-center">1</span>
              <label htmlFor="title" className="font-bold text-sumi text-sm">
                イベント名
              </label>
            </div>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例：4月の飲み会"
              required
              className="w-full px-4 py-3 rounded-xl border border-sumi/10 bg-washi/50 text-sumi placeholder:text-usuzumi/60 focus:outline-none focus:ring-2 focus:ring-aka/30 focus:border-aka/40 transition-all text-sm"
            />
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="memo" className="block text-xs font-medium text-usuzumi mb-2">
              メモ（任意）
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="場所や詳細など自由にメモを残せます"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-sumi/10 bg-washi/50 text-sumi placeholder:text-usuzumi/60 focus:outline-none focus:ring-2 focus:ring-aka/30 focus:border-aka/40 transition-all text-sm resize-none"
            />
          </div>

          {/* STEP 2 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-aka text-white text-xs font-bold flex items-center justify-center">2</span>
              <label htmlFor="candidates" className="font-bold text-sumi text-sm">
                候補日時
              </label>
            </div>
            <p className="text-xs text-usuzumi mb-3">
              右のカレンダーをクリックすると、`{DEFAULT_TIME}` 開始の候補を自動追加します
            </p>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <textarea
                  id="candidates"
                  value={candidatesText}
                  onChange={e => setCandidatesText(e.target.value)}
                  placeholder={"3/28(金) 19:00〜\n3/29(土) 19:00〜\n3/30(日) 19:00〜"}
                  required
                  rows={11}
                  className="w-full px-4 py-3 rounded-xl border border-sumi/10 bg-washi/50 text-sumi placeholder:text-usuzumi/60 focus:outline-none focus:ring-2 focus:ring-aka/30 focus:border-aka/40 transition-all text-sm font-mono resize-none"
                />
                <button
                  type="button"
                  onClick={addSampleDates}
                  className="mt-2 text-xs text-fuji hover:text-aka transition-colors"
                >
                  + 直近5日の候補を追加
                </button>
              </div>

              <div className="rounded-2xl border border-sumi/10 bg-white/70 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sumi/10 text-sumi transition-colors hover:border-aka/30 hover:text-aka"
                    aria-label="前の月"
                  >
                    ←
                  </button>
                  <p className="font-serif text-base font-bold text-sumi">
                    {viewMonth.getFullYear()}年 {viewMonth.getMonth() + 1}月
                  </p>
                  <button
                    type="button"
                    onClick={() => moveMonth(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sumi/10 text-sumi transition-colors hover:border-aka/30 hover:text-aka"
                    aria-label="次の月"
                  >
                    →
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-usuzumi">
                  {WEEKDAYS.map(weekday => (
                    <div key={weekday}>{weekday}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-transparent" />;
                    }

                    const isSelected = selectedDateKeys.has(`${date.getMonth() + 1}/${date.getDate()}`);
                    const isToday = formatCandidateLabel(date) === formatCandidateLabel(new Date());

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => addCandidateFromCalendar(date)}
                        className={`aspect-square rounded-xl border text-sm transition-all ${
                          isSelected
                            ? 'border-aka/30 bg-aka text-white shadow-sm'
                            : 'border-sumi/10 bg-shironeri text-sumi hover:border-aka/30 hover:bg-aka/5'
                        } ${isToday ? 'ring-2 ring-kincha/40' : ''}`}
                        aria-label={`${date.getMonth() + 1}月${date.getDate()}日を候補に追加`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-[11px] text-usuzumi">
                  追加済みの日付は赤く表示されます。必要なら左側で直接編集できます。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 送信 */}
        <div className="animate-fade-up animate-fade-up-delay-2">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !candidatesText.trim()}
            className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-aka to-aka-light hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                作成中...
              </span>
            ) : (
              'イベントを作成する'
            )}
          </button>
        </div>
      </form>

      {/* 使い方 */}
      <section className="mt-16 animate-fade-up animate-fade-up-delay-3">
        <div className="text-center mb-8">
          <h3 className="font-serif text-lg font-bold text-sumi inline-block sumi-line">
            つかいかた
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'イベント作成', desc: '候補日時を入力して\nイベントを作成' },
            { step: '2', title: 'URLを共有', desc: '作成されたURLを\nメンバーに送信' },
            { step: '3', title: '◯△×で回答', desc: 'メンバーが回答すると\n結果が一覧で見える' },
          ].map(item => (
            <div key={item.step} className="bg-shironeri rounded-xl border border-sumi/5 p-5 text-center">
              <div className="w-8 h-8 rounded-full bg-washi-dark text-sumi font-serif font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h4 className="font-bold text-sumi text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-usuzumi whitespace-pre-line">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
