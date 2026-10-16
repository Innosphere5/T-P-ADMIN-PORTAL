'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/driveUtils';

/**
 * AnnouncementsPanel — Timeline and composer for recruitment announcements
 */
export default function AnnouncementsPanel({
  drive,
  onPublishAnnouncement,
  prefilledScheduleDiff = null,
}) {
  const [showComposer, setShowComposer] = useState(Boolean(prefilledScheduleDiff && prefilledScheduleDiff.length > 0));
  const [title, setTitle] = useState(
    prefilledScheduleDiff && prefilledScheduleDiff.length > 0
      ? `Schedule Update: ${drive.title}`
      : ''
  );
  const [type, setType] = useState(
    prefilledScheduleDiff && prefilledScheduleDiff.length > 0
      ? 'SCHEDULE_CHANGE'
      : 'GENERAL'
  );
  const [priority, setPriority] = useState('NORMAL');
  const [message, setMessage] = useState(
    prefilledScheduleDiff && prefilledScheduleDiff.length > 0
      ? `Please note the following schedule adjustments for ${drive.title}:\n` +
          prefilledScheduleDiff
            .map((d) => `• ${d.field}: Changed from "${d.oldVal}" to "${d.newVal}"`)
            .join('\n')
      : ''
  );
  const [composerError, setComposerError] = useState('');

  const announcements = drive?.announcements || [];

  const handlePublish = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setComposerError('Announcement title is required');
      return;
    }
    if (!message.trim()) {
      setComposerError('Announcement message body cannot be empty');
      return;
    }

    onPublishAnnouncement({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
    });

    setTitle('');
    setMessage('');
    setShowComposer(false);
    setComposerError('');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-text-primary">
            Drive Communication &amp; Official Circulars
          </h4>
          <p className="text-xs text-text-secondary">
            Publish verified updates, venue instructions, and schedule changes to candidate timelines
          </p>
        </div>

        <button
          onClick={() => setShowComposer(!showComposer)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white font-label-button text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all"
        >
          <span className="material-symbols-outlined text-sm">campaign</span>
          <span>{showComposer ? 'Close Composer' : '+ New Announcement'}</span>
        </button>
      </div>

      {/* Schedule Diff Alert Banner if passed */}
      {prefilledScheduleDiff && prefilledScheduleDiff.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <span className="material-symbols-outlined text-base">edit_calendar</span>
            <span>Detected Schedule &amp; Venue Adjustments</span>
          </div>
          <p className="text-[11px] text-amber-700">
            Drive parameters were modified. A pre-drafted announcement has been prepared below for verification.
          </p>
          <div className="mt-1 flex flex-col gap-1 text-[11px] font-mono bg-white/70 p-2 rounded-lg border border-amber-100">
            {prefilledScheduleDiff.map((diff, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{diff.field}:</span>
                <span className="text-rose-600 line-through">{diff.oldVal}</span>
                <span className="material-symbols-outlined text-[10px] text-text-secondary">arrow_forward</span>
                <span className="text-emerald-700 font-bold">{diff.newVal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer Form */}
      {showComposer && (
        <form
          onSubmit={handlePublish}
          className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-3.5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle/80">
            <span className="font-bold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">add_comment</span>
              Compose Official Announcement
            </span>
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {composerError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{composerError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Announcement Title *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mandatory Reporting Time & Hall Ticket Instructions"
                className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Notice Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              >
                <option value="GENERAL">General Notice</option>
                <option value="SCHEDULE_CHANGE">Schedule Change</option>
                <option value="INSTRUCTION">Reporting Instruction</option>
                <option value="REGISTRATION_REMINDER">Registration Reminder</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Message Body *
              </label>
              <span className="text-[10px] text-text-secondary">
                {message.length} characters
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide thorough details regarding venue, dress code, documentation, or schedule shifts..."
              className="w-full p-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-text-primary font-semibold">
                <input
                  type="checkbox"
                  checked={priority === 'IMPORTANT'}
                  onChange={(e) => setPriority(e.target.checked ? 'IMPORTANT' : 'NORMAL')}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-amber-800 font-bold">Mark as Urgent / Priority Alert</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>Publish Announcement</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements Timeline */}
      {announcements.length === 0 ? (
        <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-text-secondary">
            <span className="material-symbols-outlined text-xl">notifications_paused</span>
          </div>
          <p className="text-xs font-semibold text-text-primary">No announcements posted for this drive</p>
          <p className="text-[11px] text-text-secondary max-w-sm">
            Use the composer above to publish verified round guidelines, dates, and live instructions.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-xl bg-white border shadow-xs flex flex-col gap-2 transition-all ${
                ann.priority === 'IMPORTANT'
                  ? 'border-amber-300 ring-1 ring-amber-200/50 bg-amber-50/20'
                  : 'border-border-subtle'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.priority === 'IMPORTANT' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-primary border border-rose-200">
                      Urgent
                    </span>
                  )}

                  <span className="font-bold text-sm text-text-primary">{ann.title}</span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-text-secondary">
                    {ann.type === 'SCHEDULE_CHANGE'
                      ? 'Schedule Change'
                      : ann.type === 'INSTRUCTION'
                      ? 'Instruction'
                      : ann.type === 'REGISTRATION_REMINDER'
                      ? 'Reminder'
                      : 'General Notice'}
                  </span>
                </div>

                <span className="text-[11px] text-text-secondary shrink-0">
                  {formatDateTime(ann.publishedAt)}
                </span>
              </div>

              <p className="text-xs text-text-primary whitespace-pre-line leading-relaxed pl-1">
                {ann.message}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 text-[10px] text-text-secondary">
                <span>Published by: {ann.publishedBy || 'HOD BCA Office'}</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Recorded in Portal Timeline
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
