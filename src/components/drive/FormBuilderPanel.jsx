'use client';

import React, { useState } from 'react';
import {
  FORM_FIELD_TYPES,
  DEFAULT_FORM_FIELDS,
  createFormField,
} from '@/lib/driveUtils';

/**
 * FormBuilderPanel — Admin-customizable form builder for event registration
 * Features:
 * - Default fields (Name, Roll No, Email, Phone, Department, Semester)
 * - Add custom fields via field type palette
 * - Drag-to-reorder fields
 * - Live preview of the form
 * - Field property editing (label, placeholder, required, options)
 */
export default function FormBuilderPanel({ formSchema = [], onChange }) {
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [showFieldPalette, setShowFieldPalette] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  // Ensure default fields are included
  const allFields = formSchema.length > 0 ? formSchema : [...DEFAULT_FORM_FIELDS];
  const customFields = allFields.filter((f) => !f.isDefault);
  const defaultFields = allFields.filter((f) => f.isDefault);

  const handleAddField = (type) => {
    const newField = createFormField(type);
    const updatedSchema = [...allFields, newField];
    onChange(updatedSchema);
    setEditingFieldId(newField.id);
    setShowFieldPalette(false);
  };

  const handleUpdateField = (fieldId, updates) => {
    const updated = allFields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    onChange(updated);
  };

  const handleRemoveField = (fieldId) => {
    const updated = allFields.filter((f) => f.id !== fieldId);
    onChange(updated);
    if (editingFieldId === fieldId) setEditingFieldId(null);
  };

  const handleMoveField = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= allFields.length) return;
    const arr = [...allFields];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    onChange(arr);
  };

  const handleAddOption = (fieldId) => {
    const field = allFields.find((f) => f.id === fieldId);
    if (!field) return;
    const opts = [...(field.options || []), `Option ${(field.options || []).length + 1}`];
    handleUpdateField(fieldId, { options: opts });
  };

  const handleUpdateOption = (fieldId, idx, value) => {
    const field = allFields.find((f) => f.id === fieldId);
    if (!field) return;
    const opts = [...(field.options || [])];
    opts[idx] = value;
    handleUpdateField(fieldId, { options: opts });
  };

  const handleRemoveOption = (fieldId, idx) => {
    const field = allFields.find((f) => f.id === fieldId);
    if (!field || (field.options || []).length <= 1) return;
    const opts = (field.options || []).filter((_, i) => i !== idx);
    handleUpdateField(fieldId, { options: opts });
  };

  const getFieldTypeInfo = (type) => {
    return FORM_FIELD_TYPES.find((f) => f.type === type) || FORM_FIELD_TYPES[0];
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-primary">dynamic_form</span>
            Registration Form Builder
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Customize the registration form. Default fields are auto-included. Add custom fields for event-specific data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showPreview
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-border-subtle text-text-primary hover:bg-surface-container shadow-2xs'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{showPreview ? 'edit' : 'preview'}</span>
            <span>{showPreview ? 'Edit Fields' : 'Preview Form'}</span>
          </button>
        </div>
      </div>

      {showPreview ? (
        /* ============= LIVE FORM PREVIEW ============= */
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-rose-50/60 to-white p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
            <span className="material-symbols-outlined text-primary text-lg">visibility</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Live Form Preview</span>
          </div>

          {allFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase flex items-center gap-1">
                {field.label || 'Untitled Field'}
                {field.required && <span className="text-primary">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={field.placeholder || ''}
                  className="w-full p-2.5 rounded-lg bg-white text-text-primary text-xs outline-none border border-border-subtle"
                  disabled
                />
              ) : field.type === 'select' ? (
                <select
                  className="w-full h-10 px-3 rounded-lg bg-white text-text-primary text-xs outline-none border border-border-subtle"
                  disabled
                >
                  <option>{field.placeholder || 'Select...'}</option>
                  {(field.options || []).map((opt, i) => (
                    <option key={i}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'multi_select' ? (
                <div className="flex flex-wrap gap-2">
                  {(field.options || []).map((opt, i) => (
                    <label key={i} className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                      <input type="checkbox" disabled className="rounded border-border-subtle" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="inline-flex items-center gap-2 text-xs text-text-primary">
                  <input type="checkbox" disabled className="rounded border-border-subtle" />
                  <span>{field.placeholder || 'I agree'}</span>
                </label>
              ) : field.type === 'file' ? (
                <div className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-dashed border-border-subtle flex items-center gap-2 text-xs text-text-secondary">
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>Choose file to upload...</span>
                </div>
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  placeholder={field.placeholder || ''}
                  className="w-full h-10 px-3 rounded-lg bg-white text-text-primary text-xs outline-none border border-border-subtle"
                  disabled
                />
              )}
            </div>
          ))}

          <button
            className="w-full mt-2 py-3 rounded-xl bg-primary text-white text-sm font-bold opacity-70 cursor-not-allowed"
            disabled
          >
            Register Now
          </button>
        </div>
      ) : (
        /* ============= FIELD BUILDER ============= */
        <div className="flex flex-col gap-3">
          {/* Default Fields Section */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span>
              Default Fields (Always Included)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {defaultFields.map((field) => (
                <div
                  key={field.id}
                  className="p-2.5 rounded-lg bg-surface-container-low border border-border-subtle flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm text-text-secondary">
                    {getFieldTypeInfo(field.type).icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text-primary truncate">{field.label}</span>
                    <span className="text-[10px] text-text-secondary">{getFieldTypeInfo(field.type).label} • Required</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">edit_note</span>
                Custom Fields ({customFields.length})
              </span>
              <button
                onClick={() => setShowFieldPalette(!showFieldPalette)}
                className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>+ Add Field</span>
              </button>
            </div>

            {/* Field Type Palette */}
            {showFieldPalette && (
              <div className="p-3 rounded-xl bg-tint-blue/40 border border-blue-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-bold text-info-blue uppercase tracking-wider mb-2 block">
                  Choose Field Type
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FORM_FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      onClick={() => handleAddField(ft.type)}
                      className="p-2.5 rounded-lg bg-white border border-border-subtle hover:border-primary hover:shadow-md transition-all flex flex-col items-center gap-1 text-center group"
                    >
                      <span className="material-symbols-outlined text-lg text-text-secondary group-hover:text-primary transition-colors">
                        {ft.icon}
                      </span>
                      <span className="text-[10px] font-bold text-text-primary">{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields List */}
            {customFields.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-2xl text-text-secondary">playlist_add</span>
                <p className="text-xs font-semibold text-text-primary">No custom fields added yet</p>
                <p className="text-[11px] text-text-secondary max-w-xs">
                  Add custom fields like &ldquo;Why do you want to participate?&rdquo;, &ldquo;Team Name&rdquo;, &ldquo;T-shirt Size&rdquo;, etc.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customFields.map((field, idx) => {
                  const fieldTypeInfo = getFieldTypeInfo(field.type);
                  const isEditing = editingFieldId === field.id;
                  const globalIdx = allFields.findIndex((f) => f.id === field.id);

                  return (
                    <div
                      key={field.id}
                      className={`rounded-xl border transition-all ${
                        isEditing
                          ? 'bg-white border-primary/50 shadow-md ring-1 ring-primary/20'
                          : 'bg-surface-container-low border-border-subtle hover:border-primary/30'
                      }`}
                    >
                      {/* Field Header */}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Drag Handle */}
                          <div className="flex flex-col gap-0.5 cursor-grab text-text-secondary hover:text-text-primary">
                            <button
                              onClick={() => handleMoveField(globalIdx, globalIdx - 1)}
                              className="p-0.5 hover:bg-surface-container rounded"
                              disabled={globalIdx <= defaultFields.length}
                            >
                              <span className="material-symbols-outlined text-xs">keyboard_arrow_up</span>
                            </button>
                            <button
                              onClick={() => handleMoveField(globalIdx, globalIdx + 1)}
                              className="p-0.5 hover:bg-surface-container rounded"
                              disabled={globalIdx >= allFields.length - 1}
                            >
                              <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                            </button>
                          </div>

                          <span className="material-symbols-outlined text-base text-text-secondary">
                            {fieldTypeInfo.icon}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-text-primary truncate">
                              {field.label || 'Untitled Field'}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {fieldTypeInfo.label}
                              {field.required ? ' • Required' : ' • Optional'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isEditing ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-container'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isEditing ? 'check' : 'edit'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleRemoveField(field.id)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-rose-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Field Editor (Expanded) */}
                      {isEditing && (
                        <div className="px-3 pb-3 pt-0 flex flex-col gap-3 border-t border-border-subtle mt-0 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase">
                                Field Label *
                              </label>
                              <input
                                value={field.label || ''}
                                onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                placeholder="e.g. Why do you want to participate?"
                                className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase">
                                Placeholder Text
                              </label>
                              <input
                                value={field.placeholder || ''}
                                onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                                placeholder="e.g. Write your answer here..."
                                className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Required Toggle */}
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                              className="rounded border-border-subtle text-primary focus:ring-primary"
                            />
                            <span className="text-xs font-semibold text-text-primary">Required field</span>
                          </label>

                          {/* Options Editor (for select / multi_select) */}
                          {(field.type === 'select' || field.type === 'multi_select') && (
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-text-secondary uppercase">
                                Options
                              </label>
                              {(field.options || []).map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-text-secondary w-4 text-center">{i + 1}</span>
                                  <input
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(field.id, i, e.target.value)}
                                    className="flex-1 h-8 px-2 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                                  />
                                  {(field.options || []).length > 1 && (
                                    <button
                                      onClick={() => handleRemoveOption(field.id, i)}
                                      className="p-1 text-text-secondary hover:text-primary"
                                    >
                                      <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => handleAddOption(field.id)}
                                className="text-xs text-primary font-bold hover:underline self-start flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">add</span>
                                Add Option
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Info Footer */}
          <div className="p-3 rounded-xl bg-tint-green/60 border border-emerald-200/80 text-xs text-success-green flex items-center gap-2 mt-2">
            <span className="material-symbols-outlined text-base">info</span>
            <span>
              Total Fields: {allFields.length} ({defaultFields.length} default + {customFields.length} custom).
              A shareable registration link will be auto-generated when you publish this event.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
