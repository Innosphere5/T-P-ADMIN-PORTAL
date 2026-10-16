'use client';

import React, { useState } from 'react';
import { deriveRegistrationLinkStatus, formatDateTime } from '@/lib/driveUtils';

/**
 * RegistrationLinksPanel — Manages one or more registration links per drive
 */
export default function RegistrationLinksPanel({ drive, onSaveLink, onDeleteLink }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form fields
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [formError, setFormError] = useState('');

  const links = drive?.registrationLinks || [];

  const handleOpenForm = (linkToEdit = null) => {
    if (linkToEdit) {
      setEditingLink(linkToEdit);
      setLabel(linkToEdit.label || '');
      setUrl(linkToEdit.url || '');
      setOpensAt(linkToEdit.opensAt ? linkToEdit.opensAt.slice(0, 16) : '');
      setClosesAt(linkToEdit.closesAt ? linkToEdit.closesAt.slice(0, 16) : '');
      setEnabled(linkToEdit.enabled !== false);
    } else {
      setEditingLink(null);
      setLabel('');
      setUrl('');
      setOpensAt('');
      setClosesAt(drive.registrationDeadline ? drive.registrationDeadline.slice(0, 16) : '');
      setEnabled(true);
    }
    setFormError('');
    setShowAddForm(true);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setFormError('Please enter a descriptive label for this registration link');
      return;
    }
    if (!url.trim()) {
      setFormError('Please enter a valid destination URL');
      return;
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      setFormError('Registration URL must start with https://');
      return;
    }

    const payload = {
      id: editingLink ? editingLink.id : undefined,
      label: label.trim(),
      url: url.trim(),
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      enabled,
    };

    onSaveLink(payload);
    setShowAddForm(false);
    setEditingLink(null);
  };

  const handleCopy = (id, linkUrl) => {
    navigator.clipboard?.writeText(linkUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top action row */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-text-primary">
            Student Registration Portals &amp; External Forms
          </h4>
          <p className="text-xs text-text-secondary">
            Manage links shared with eligible students for on-campus &amp; corporate registration
          </p>
        </div>

        <button
          onClick={() => handleOpenForm(null)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white font-label-button text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all"
        >
          <span className="material-symbols-outlined text-sm">add_link</span>
          <span>+ Add Registration Link</span>
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitForm}
          className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-text-primary uppercase tracking-wider">
              {editingLink ? 'Edit Registration Link' : 'New Registration Link'}
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Portal Label *
              </label>
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Official Google Form, TCS iON Portal"
                className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Destination URL * (https://)
              </label>
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://forms.google.com/..."
                className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Opens At (Optional)
              </label>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Closes At / Deadline
              </label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary font-semibold">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Enabled &amp; accessible to scholars</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs"
              >
                {editingLink ? 'Update Link' : 'Save Link'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-text-secondary">
            <span className="material-symbols-outlined text-xl">link_off</span>
          </div>
          <p className="text-xs font-semibold text-text-primary">No registration links configured yet</p>
          <p className="text-[11px] text-text-secondary max-w-sm">
            Add a Google Form, Microsoft Form, or corporate careers link so registered students can submit their candidature.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {links.map((link) => {
            const status = deriveRegistrationLinkStatus(link);
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className="p-3.5 rounded-xl bg-white border border-border-subtle shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-tint-blue text-info-blue flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">link</span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-text-primary truncate">{link.label}</span>

                      {status === 'OPEN' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-green text-success-green border border-emerald-200">
                          Active / Open
                        </span>
                      )}
                      {status === 'UPCOMING' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-blue text-info-blue border border-blue-200">
                          Scheduled
                        </span>
                      )}
                      {status === 'CLOSED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-text-secondary border border-border-subtle">
                          Closed
                        </span>
                      )}
                      {status === 'DISABLED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-primary border border-rose-200">
                          Disabled
                        </span>
                      )}
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-info-blue hover:underline truncate max-w-md mt-0.5"
                    >
                      {link.url}
                    </a>

                    <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-1">
                      {link.closesAt && (
                        <span>Deadline: {formatDateTime(link.closesAt)}</span>
                      )}
                      <span>Verified Registrants: — (External source)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleCopy(link.id, link.url)}
                    className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors"
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isCopied ? 'check' : 'content_copy'}
                    </span>
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors"
                    title="Open link in new tab"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>

                  <button
                    onClick={() => handleOpenForm(link)}
                    className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors"
                    title="Edit Link"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>

                  <button
                    onClick={() => onDeleteLink(link.id)}
                    className="p-1.5 rounded-lg border border-border-subtle hover:bg-rose-50 text-text-secondary hover:text-primary transition-colors"
                    title="Delete Link"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
