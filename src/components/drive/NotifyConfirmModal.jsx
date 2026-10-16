'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/driveUtils';

/**
 * NotifyConfirmModal — Shared confirmation dialog before notifying students
 * Prevents accidental or duplicate dispatches with explicit audience preview
 */
export default function NotifyConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  event = 'NEW_DRIVE',
  drive,
  audienceEstimate = 0,
  defaultTitle = '',
  defaultBody = '',
  isSending = false,
  isBackendConnected = false,
}) {
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [editableTitle, setEditableTitle] = useState(defaultTitle);
  const [editableBody, setEditableBody] = useState(defaultBody);

  // Sync state if defaultTitle/Body changes
  React.useEffect(() => {
    setEditableTitle(defaultTitle);
    setEditableBody(defaultBody);
    setConfirmedCheckbox(false);
  }, [defaultTitle, defaultBody, isOpen]);

  if (!isOpen) return null;

  // Check if previously dispatched
  const previousDispatches = (drive?.notifications || []).filter((n) => n.event === event);
  const lastDispatched = previousDispatches[0];

  const handleSend = () => {
    onConfirm({
      event,
      title: editableTitle,
      body: editableBody,
      audienceCount: audienceEstimate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Solid Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-white/80 p-6 z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
        {/* Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
              Student Notification Dispatch
            </span>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              Confirm Publication &amp; Notification
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Warning if Gateway is not connected */}
        {!isBackendConnected && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-700 text-base shrink-0 mt-0.5">
              cloud_off
            </span>
            <div className="flex flex-col">
              <span className="font-bold">Notification Gateway Standby</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The external push/SMS delivery endpoint is not connected yet. This action will log the publication into the drive timeline and session records, but will not send external notifications to physical phones.
              </p>
            </div>
          </div>
        )}

        {/* Warning if previously sent (Double-send guard) */}
        {lastDispatched && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">
              history
            </span>
            <div className="flex flex-col">
              <span className="font-bold">Prior Notification Recorded</span>
              <span className="text-[11px] text-rose-800">
                A &quot;{event}&quot; notice was already dispatched on{' '}
                {formatDateTime(lastDispatched.sentAt)}. Sending again will dispatch a second alert to candidates.
              </span>
            </div>
          </div>
        )}

        {/* Target Audience Summary */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle text-xs flex flex-col gap-1.5">
          <span className="font-bold text-text-secondary text-[11px] uppercase tracking-wider">
            Target Audience Scope
          </span>
          <div className="flex items-center justify-between">
            <span className="text-text-primary font-semibold">
              Eligible Approved Scholars:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-white font-mono font-bold text-xs">
              {audienceEstimate} scholars
            </span>
          </div>
          <span className="text-[10px] text-text-secondary">
            Restricted to verified accounts in the approved directory.
          </span>
        </div>

        {/* Editable Message Preview */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-text-secondary uppercase">
            Notification Title Preview
          </label>
          <input
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-xs font-semibold text-text-primary outline-none focus:border-primary"
          />

          <label className="text-[11px] font-bold text-text-secondary uppercase mt-1">
            Notification Body Preview
          </label>
          <textarea
            rows={3}
            value={editableBody}
            onChange={(e) => setEditableBody(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-surface-container-low border border-border-subtle text-xs text-text-primary outline-none focus:border-primary font-sans leading-relaxed"
          />
        </div>

        {/* Confirmation Checkbox */}
        <div className="pt-2 border-t border-border-subtle">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-text-primary">
            <input
              type="checkbox"
              checked={confirmedCheckbox}
              onChange={(e) => setConfirmedCheckbox(e.target.checked)}
              className="mt-0.5 rounded text-primary focus:ring-primary"
            />
            <span className="font-semibold">
              I verify that all drive parameters, criteria, and timings are accurate and authorized by the T&amp;P Cell.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 rounded-lg bg-surface-container text-text-secondary hover:text-text-primary text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!confirmedCheckbox || isSending || !editableTitle.trim()}
            className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, rgb(155, 29, 44) 0%, rgb(110, 21, 33) 100%)',
            }}
          >
            <span className="material-symbols-outlined text-sm">
              {isSending ? 'hourglass_top' : 'send'}
            </span>
            <span>{isSending ? 'Processing Dispatch...' : 'Confirm & Dispatch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
