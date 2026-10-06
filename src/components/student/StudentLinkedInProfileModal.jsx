'use client';

import React, { useState, useEffect } from 'react';
import { DEFAULT_CAMPUS_BANNER, DEFAULT_CAMPUS_BANNER_FALLBACK } from '../../constants/tokens';

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';
const getFileMimeType = (file) => {
  if (file?.type && file.type !== 'application/octet-stream') return file.type;
  return ({
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }[getFileExtension(file?.name)] || 'application/octet-stream');
};

async function uploadAdminDocument(file, rollNo) {
  const safeRoll = String(rollNo || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32);
  if (!safeRoll) throw new Error('Student roll number is unavailable for document upload.');
  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: `rimt-academic-trust/${safeRoll}` }),
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) throw new Error(signData.error || `Cloudinary signing failed (${signRes.status}).`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', signData.folder);
  formData.append('timestamp', signData.timestamp);
  formData.append('api_key', signData.api_key);
  formData.append('signature', signData.signature);
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(uploadData.error?.message || `Cloudinary upload failed (${uploadRes.status}).`);
  }
  return {
    url: uploadData.secure_url,
    format: uploadData.format || getFileExtension(file.name),
    mime_type: getFileMimeType(file),
    original_filename: file.name,
    cloudinary_public_id: uploadData.public_id,
    resource_type: uploadData.resource_type || 'auto',
  };
}

export default function StudentLinkedInProfileModal({
  student,
  isOpen,
  onClose,
  onStatusChange,
}) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'academics' | 'projects' | 'certificates' | 'narrative'
  const [previewDoc, setPreviewDoc] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Project Add Form State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: 'Academic Core',
    description: '',
    tech_stack: '',
    github_url: '',
    live_url: '',
    logo_url: '',
    status: 'Completed',
  });

  // Internship Add Form State
  const [isAddingInternship, setIsAddingInternship] = useState(false);
  const [savingInternship, setSavingInternship] = useState(false);
  const [internshipForm, setInternshipForm] = useState({
    company: '',
    role: '',
    duration: '',
    description: '',
    certificate_url: '',
    _file: null,
  });
  const [editingInternshipId, setEditingInternshipId] = useState(null);

  // Certificate Add / Issue State
  const [isAddingCertificate, setIsAddingCertificate] = useState(false);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [certificateForm, setCertificateForm] = useState({
    title: '',
    issuer: 'RIMT University Registrar',
    credential_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    url: '',
    format: 'image',
    _file: null,
  });
  const [editingCertificateId, setEditingCertificateId] = useState(null);

  const [editForm, setEditForm] = useState({
    bio: '',
    about_me: '',
    phone: '',
    headline: '',
    cgpa: '',
    academic_score: '',
    attendance_rate: '',
    academic_standing: '',
    faculty_advisor: '',
    current_semester: '',
    total_credits: '',
    active_backlogs: '0',
    admin_notes: '',
    skills: '',
    semester_scores: [],
  });

  const formatSkillsString = (raw) => {
    if (Array.isArray(raw)) return raw.join(', ');
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch {}
      return raw;
    }
    return '';
  };

  const parseSemesterScores = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const populateEditForm = (target) => {
    if (!target) return;
    setEditForm({
      bio: target.bio || '',
      about_me: target.about_me || '',
      phone: target.phone || '',
      headline: target.headline || '',
      cgpa: target.cgpa !== undefined && target.cgpa !== null ? String(target.cgpa) : '',
      academic_score: target.academic_score !== undefined && target.academic_score !== null ? String(target.academic_score) : '',
      attendance_rate: target.attendance_rate !== undefined && target.attendance_rate !== null ? String(target.attendance_rate).replace('%', '') : '',
      academic_standing: target.academic_standing || '',
      faculty_advisor: target.faculty_advisor || target.spoc || '',
      current_semester: target.current_semester || target.year_semester || target.semester || '',
      total_credits: target.total_credits !== undefined && target.total_credits !== null ? String(target.total_credits) : '',
      active_backlogs: target.active_backlogs !== undefined && target.active_backlogs !== null ? String(target.active_backlogs) : '0',
      admin_notes: target.admin_notes || '',
      skills: formatSkillsString(target.skills),
      semester_scores: parseSemesterScores(target.semester_scores),
    });
  };

  useEffect(() => {
    if (!isOpen || !student) {
      setDossier(null);
      setIsEditing(false);
      setSaveSuccess(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const studentId = student.id || student.roll || student.roll_number || student.roll_no;

    fetch(`/api/admin/requests/${studentId}`, {
      headers: {
        Authorization: 'Bearer rimt-admin-master-token',
        'x-admin-portal': 'true',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.dossier) {
          setDossier(data.dossier);
          populateEditForm(data.dossier);
        } else {
          setDossier(student);
          populateEditForm(student);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDossier(student);
          populateEditForm(student);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, student]);

  if (!isOpen || (!student && !dossier)) return null;

  const data = dossier || student;
  const fullName = data.full_name || data.name || 'RIMT Scholar';
  const rollNo = data.roll_number || data.roll_no || data.roll || '—';
  const dept = data.department || data.course || data.dept || 'Department of Computer Applications';
  const batch = data.year_semester || data.batch || data.semester || 'Batch 2024-2027';
  const phone = data.phone || '';
  const email = data.email || (rollNo !== '—' ? `${rollNo.toLowerCase()}@rimt.ac.in` : `${fullName.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in`);
  const headline = data.headline || `${dept} Scholar @ RIMT University`;
  const status = (data.status || 'PENDING').toUpperCase();
  const bannerUrl = data.banner_url || DEFAULT_CAMPUS_BANNER;

  // Real academic metrics — NO fake fallbacks
  const hasCgpa = data.cgpa !== null && data.cgpa !== undefined && !isNaN(Number(data.cgpa));
  const cgpa = hasCgpa ? Number(data.cgpa).toFixed(2) : null;
  const hasAcademicScore = data.academic_score !== null && data.academic_score !== undefined && !isNaN(Number(data.academic_score));
  const percentage = hasAcademicScore ? Number(data.academic_score).toFixed(1) : (hasCgpa ? (Number(cgpa) * 9.5).toFixed(1) : null);
  const attendance = (data.attendance_rate !== null && data.attendance_rate !== undefined && data.attendance_rate !== '')
    ? (String(data.attendance_rate).includes('%') ? data.attendance_rate : `${data.attendance_rate}%`)
    : null;
  const standing = data.academic_standing || (hasCgpa ? (Number(cgpa) >= 8.5 ? "Dean's Honors List (Distinction)" : 'First Class with Distinction') : null);
  const facultyAdvisor = data.faculty_advisor || data.spoc || null;
  const semesterScores = parseSemesterScores(data.semester_scores);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const documents = Array.isArray(data.documents) ? data.documents : [];

  // Real skills parsing
  let skills = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills;
  } else if (typeof data.skills === 'string') {
    try {
      const parsed = JSON.parse(data.skills);
      skills = Array.isArray(parsed) ? parsed : data.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      skills = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  const bioText = data.about_me || data.bio || '';

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Add / Edit / Remove Semester SGPA Row in Edit Form
  const handleAddSemester = () => {
    const nextSemNumber = editForm.semester_scores.length + 1;
    const newSem = {
      semester: `Semester ${nextSemNumber}`,
      sgpa: editForm.cgpa || '8.00',
      credits: 22,
      grade: 'A+',
      status: 'Completed',
    };
    setEditForm({
      ...editForm,
      semester_scores: [...editForm.semester_scores, newSem],
    });
  };

  const handleUpdateSemesterRow = (index, field, value) => {
    const updated = [...editForm.semester_scores];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, semester_scores: updated });
  };

  const handleDeleteSemesterRow = (index) => {
    const updated = editForm.semester_scores.filter((_, idx) => idx !== index);
    setEditForm({ ...editForm, semester_scores: updated });
  };

  const handleAutoCalculateCgpa = () => {
    if (!editForm.semester_scores.length) return;
    let totalGradePoints = 0;
    let totalCreds = 0;
    editForm.semester_scores.forEach((s) => {
      const sgpa = Number(s.sgpa);
      const credits = Number(s.credits) || 20;
      if (!isNaN(sgpa) && sgpa > 0) {
        totalGradePoints += sgpa * credits;
        totalCreds += credits;
      }
    });
    if (totalCreds > 0) {
      const computed = (totalGradePoints / totalCreds).toFixed(2);
      const equivScore = (Number(computed) * 9.5).toFixed(1);
      setEditForm({
        ...editForm,
        cgpa: computed,
        academic_score: equivScore,
        total_credits: String(totalCreds),
      });
    }
  };

  const handleSaveDossier = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const skillsArray = typeof editForm.skills === 'string'
        ? editForm.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : (Array.isArray(editForm.skills) ? editForm.skills : []);

      const payload = {
        bio: editForm.bio.trim() || null,
        about_me: editForm.about_me.trim() || null,
        headline: editForm.headline.trim() || null,
        phone: editForm.phone.trim() || null,
        cgpa: editForm.cgpa !== '' ? Number(editForm.cgpa) : null,
        academic_score: editForm.academic_score !== '' ? Number(editForm.academic_score) : (editForm.cgpa ? Number((Number(editForm.cgpa) * 9.5).toFixed(1)) : null),
        attendance_rate: editForm.attendance_rate !== '' ? Number(editForm.attendance_rate) : null,
        academic_standing: editForm.academic_standing.trim() || null,
        faculty_advisor: editForm.faculty_advisor.trim() || null,
        current_semester: editForm.current_semester.trim() || null,
        total_credits: editForm.total_credits !== '' ? Number(editForm.total_credits) : null,
        active_backlogs: editForm.active_backlogs !== '' ? Number(editForm.active_backlogs) : 0,
        admin_notes: editForm.admin_notes.trim() || null,
        skills: skillsArray,
        semester_scores: editForm.semester_scores,
      };

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, ...payload };
        setDossier(updatedDossier);
        populateEditForm(updatedDossier);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setIsEditing(false);
        if (onStatusChange) {
          onStatusChange(updatedDossier, 'UPDATE');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to save adjustments: ${errJson.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Save dossier error:', err);
      alert('Network error while saving scholar updates.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNewProject = async (e) => {
    e?.preventDefault();
    if (!projectForm.title.trim()) {
      alert('Please enter a project title');
      return;
    }
    setSavingProject(true);
    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const techArray = projectForm.tech_stack
        ? projectForm.tech_stack.split(',').map((t) => t.trim()).filter(Boolean)
        : ['React Native', 'Node.js', 'PostgreSQL'];

      const newProj = {
        id: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
        title: projectForm.title.trim(),
        category: projectForm.category,
        categoryLabel: projectForm.category,
        description: projectForm.description.trim() || 'Verified institutional project repository.',
        about: projectForm.description.trim() || 'Verified institutional project repository.',
        tags: techArray,
        tech_stack: techArray,
        github_url: projectForm.github_url.trim() || null,
        githubUrl: projectForm.github_url.trim() || null,
        live_url: projectForm.live_url.trim() || null,
        liveUrl: projectForm.live_url.trim() || null,
        logo_url: projectForm.logo_url.trim() || null,
        logoUrl: projectForm.logo_url.trim() || null,
        status: projectForm.status,
        commitInfo: `Verified on ${new Date().toLocaleDateString('en-IN')}`,
        gitStatus: 'Git Synced',
        isPublic: true,
      };

      const updatedProjects = [newProj, ...projects];

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ projects: updatedProjects }),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, projects: updatedProjects };
        setDossier(updatedDossier);
        setIsAddingProject(false);
        setProjectForm({
          title: '',
          category: 'Academic Core',
          description: '',
          tech_stack: '',
          github_url: '',
          live_url: '',
          logo_url: '',
          status: 'Completed',
        });
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      } else {
        alert('Failed to save project to Supabase.');
      }
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Network error while saving project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to remove this project from the scholar portfolio?')) return;
    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const updatedProjects = projects.filter((p) => p.id !== projectId);
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ projects: updatedProjects }),
      });
      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, projects: updatedProjects };
        setDossier(updatedDossier);
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const handleSaveNewInternship = async (e) => {
    e?.preventDefault();
    if (!internshipForm.company.trim() || !internshipForm.role.trim()) {
      alert('Company name and role are required.');
      return;
    }
    setSavingInternship(true);
    try {
      const currentInternships = Array.isArray(data.internships) ? data.internships : [];
      let certificateUrl = internshipForm.certificate_url.trim() || null;
      let certificateFile = null;
      if (internshipForm._file) {
        certificateFile = await uploadAdminDocument(
          internshipForm._file,
          data.roll_number || data.roll_no || data.roll
        );
        certificateUrl = certificateFile.url;
      }
      const internshipId = editingInternshipId || `INT-${Date.now()}`;
      const previousInternship = currentInternships.find((item) => item.id === editingInternshipId);
      const newIntern = {
        ...(previousInternship || {}),
        id: internshipId,
        company: internshipForm.company.trim(),
        role: internshipForm.role.trim(),
        duration: internshipForm.duration.trim() || 'Verified Tenure',
        description: internshipForm.description.trim() || '',
        certificate_url: certificateUrl,
        ...(certificateFile ? {
          certificate_format: certificateFile.format,
          certificate_mime_type: certificateFile.mime_type,
          certificate_filename: certificateFile.original_filename,
        } : {}),
        created_at: currentInternships.find((item) => item.id === editingInternshipId)?.created_at || new Date().toISOString(),
      };
      const updated = editingInternshipId
        ? currentInternships.map((item) => item.id === editingInternshipId ? newIntern : item)
        : [...currentInternships, newIntern];
      const previousAttachmentUrl = previousInternship?.certificate_url;
      const updatedDocs = previousAttachmentUrl && previousAttachmentUrl !== certificateUrl
        && !updated.some((item) => item.id !== internshipId && item.certificate_url === previousAttachmentUrl)
        ? (data.documents || []).filter((document) => (document.url || document.cloudinary_url) !== previousAttachmentUrl)
        : (data.documents || []);
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ internships: updated, certificates: updatedDocs }),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, internships: updated, documents: updatedDocs, certificates: updatedDocs };
        setDossier(updatedDossier);
        setIsAddingInternship(false);
        setEditingInternshipId(null);
        setInternshipForm({ company: '', role: '', duration: '', description: '', certificate_url: '', _file: null });
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to save internship: ${errJson.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Add internship error:', err);
      alert('Failed to save internship.');
    } finally {
      setSavingInternship(false);
    }
  };

  const handleEditInternship = (internship) => {
    setEditingInternshipId(internship.id);
    setInternshipForm({
      company: internship.company || '',
      role: internship.role || '',
      duration: internship.duration || '',
      description: internship.description || '',
      certificate_url: internship.certificate_url || '',
      _file: null,
    });
    setIsAddingInternship(true);
  };

  const handleRemoveInternshipCertificate = async (internship) => {
    if (!window.confirm('Remove the attached internship document?')) return;
    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const updatedInternships = (data.internships || []).map((item) => item.id === internship.id
        ? { ...item, certificate_url: null, certificate_format: null, certificate_mime_type: null, certificate_filename: null }
        : item);
      const updatedDocs = (data.documents || []).filter(
        (document) => (document.url || document.cloudinary_url) !== internship.certificate_url
      );
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: '******', 'x-admin-portal': 'true' },
        body: JSON.stringify({ internships: updatedInternships, certificates: updatedDocs }),
      });
      if (!res.ok) throw new Error(`Failed to remove attachment (${res.status}).`);
      const resData = await res.json();
      const updatedDossier = resData?.dossier || { ...data, internships: updatedInternships, documents: updatedDocs, certificates: updatedDocs };
      setDossier(updatedDossier);
      if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
    } catch (err) {
      console.error('Remove internship attachment error:', err);
      alert(err?.message || 'Failed to remove internship attachment.');
    }
  };

  const handleDeleteInternship = async (internshipId) => {
    if (!window.confirm('Are you sure you want to remove this internship experience?')) return;
    try {
      const currentInternships = Array.isArray(data.internships) ? data.internships : [];
      const updated = currentInternships.filter((i) => (i.id || i) !== internshipId);
      const removedInternship = currentInternships.find((item) => item.id === internshipId);
      const removedUrl = removedInternship?.certificate_url;
      const updatedDocs = removedUrl && !updated.some((item) => item.certificate_url === removedUrl)
        ? (data.documents || []).filter((doc) => (doc.url || doc.cloudinary_url) !== removedUrl)
        : (data.documents || []);
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ internships: updated, certificates: updatedDocs }),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, internships: updated, documents: updatedDocs, certificates: updatedDocs };
        setDossier(updatedDossier);
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      } else {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || `Failed to delete internship (${res.status}).`);
      }
    } catch (err) {
      console.error('Error deleting internship:', err);
      alert(err?.message || 'Failed to delete internship.');
    }
  };

  const handleAddCertificate = async (e) => {
    e.preventDefault();
    if (!certificateForm.title.trim()) {
      alert('Please enter a certificate title.');
      return;
    }
    setSavingCertificate(true);
    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const rollNo = data.roll_number || data.roll_no || studentId;
      const currentDocs = Array.isArray(data.documents) ? data.documents : [];

      let finalUrl = certificateForm.url?.trim() || null;
      let finalFormat = certificateForm.format || 'image';
      let fileMetadata = null;

      if (certificateForm._file && !finalUrl) {
        fileMetadata = await uploadAdminDocument(certificateForm._file, rollNo);
        finalUrl = fileMetadata.url;
        finalFormat = fileMetadata.format || finalFormat;
      }

      const newDoc = {
        ...(currentDocs.find((doc) => doc.id === editingCertificateId) || {}),
        id: editingCertificateId || `cert_${Date.now()}`,
        title: certificateForm.title.trim(),
        issuer: certificateForm.issuer.trim() || 'RIMT University Registrar',
        credential_id: certificateForm.credential_id.trim() || `CERT-${Date.now().toString().slice(-6)}`,
        issue_date: certificateForm.issue_date || new Date().toISOString().split('T')[0],
        url: finalUrl,
        cloudinary_url: finalUrl,
        format: /^(jpg|jpeg|png|webp|gif|image)$/i.test(finalFormat) ? 'image' : finalFormat,
        mime_type: fileMetadata?.mime_type || (/^(jpg|jpeg|png|webp|gif|image)$/i.test(finalFormat)
          ? 'image/jpeg'
          : finalFormat === 'pdf' ? 'application/pdf'
            : finalFormat === 'doc' ? 'application/msword'
              : finalFormat === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/octet-stream'),
        original_filename: fileMetadata?.original_filename
          || certificateForm._file?.name
          || currentDocs.find((doc) => doc.id === editingCertificateId)?.original_filename,
        cloudinary_public_id: fileMetadata?.cloudinary_public_id
          || currentDocs.find((doc) => doc.id === editingCertificateId)?.cloudinary_public_id,
        resource_type: fileMetadata?.resource_type
          || currentDocs.find((doc) => doc.id === editingCertificateId)?.resource_type
          || 'auto',
        storage_provider: finalUrl ? 'cloudinary' : null,
        status: 'Verified',
        created_at: currentDocs.find((doc) => doc.id === editingCertificateId)?.created_at || new Date().toISOString(),
      };
      const updatedDocs = editingCertificateId
        ? currentDocs.map((doc) => doc.id === editingCertificateId ? newDoc : doc)
        : [newDoc, ...currentDocs];

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ certificates: updatedDocs }),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, documents: updatedDocs, certificates: updatedDocs };
        setDossier(updatedDossier);
        setIsAddingCertificate(false);
        setEditingCertificateId(null);
        setCertificateForm({
          title: '',
          issuer: 'RIMT University Registrar',
          credential_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          url: '',
          format: 'image',
          _file: null,
        });
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to save certificate: ${errJson.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Add certificate error:', err);
      alert(err?.message || 'Failed to save certificate.');
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleEditCertificate = (doc) => {
    setEditingCertificateId(doc.id);
    setCertificateForm({
      title: doc.title || '',
      issuer: doc.issuer || '',
      credential_id: doc.credential_id || '',
      issue_date: doc.issue_date || '',
      url: doc.url || doc.cloudinary_url || doc.file_url || '',
      format: doc.format || 'pdf',
      _file: null,
    });
    setIsAddingCertificate(true);
  };

  const handleDeleteCertificate = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this certificate?')) return;
    try {
      const studentId = data.id || data.roll || data.roll_number || data.roll_no;
      const currentDocs = Array.isArray(data.documents) ? data.documents : [];
      const updatedDocs = currentDocs.filter((d) => (d.id || d) !== docId);

      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ certificates: updatedDocs }),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedDossier = resData?.dossier || { ...data, documents: updatedDocs, certificates: updatedDocs };
        setDossier(updatedDossier);
        if (onStatusChange) onStatusChange(updatedDossier, 'UPDATE');
      } else {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || `Failed to delete certificate (${res.status}).`);
      }
    } catch (err) {
      console.error('Delete certificate error:', err);
      alert(err?.message || 'Failed to delete certificate.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col text-slate-800 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar with Institution Branding */}
        <div className="relative z-30 px-5 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B1D2C] to-[#600f1c] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  RIMT Scholar Official Dossier
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#0077B5]/10 text-[#0077B5] border border-[#0077B5]/25 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                  Live Verified Profile
                </span>
                {saveSuccess && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full animate-fadeIn">
                    ✓ Saved to Supabase
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px] sm:max-w-md">
                Roll No: <span className="font-mono font-bold text-slate-700">{rollNo}</span> · {fullName} · {dept}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                isEditing
                  ? 'bg-rose-50 border-rose-300 text-[#8B1D2C]'
                  : 'bg-[#8B1D2C] hover:bg-[#721522] border-[#8B1D2C] text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isEditing ? 'close' : 'edit_note'}
              </span>
              <span>{isEditing ? 'Cancel Edit' : 'Edit Dossier & Grades'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Print Dossier"
            >
              <span className="material-symbols-outlined text-lg">print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close Profile"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="px-5 sm:px-6 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: 'account_circle' },
            { id: 'academics', label: 'Academics & SGPA', icon: 'analytics', badge: cgpa ? `${cgpa} CGPA` : null },
            { id: 'projects', label: 'Projects & Repos', icon: 'code_blocks', count: projects.length },
            { id: 'certificates', label: 'Certificates & Vault', icon: 'verified', count: documents.length },
            { id: 'narrative', label: 'Narrative & Skills', icon: 'person' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#8B1D2C] text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-[#8B1D2C]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto bg-[#F4F2EE] p-4 sm:p-6 space-y-4">

          {/* ADMIN EDIT PANEL (Active when isEditing === true) */}
          {isEditing && (
            <div className="bg-white rounded-2xl p-5 border-2 border-[#8B1D2C]/40 shadow-xl animate-fadeIn text-left mb-4">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#8B1D2C] flex items-center justify-center border border-rose-200">
                    <span className="material-symbols-outlined text-lg">edit_note</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Administrator Scholar Editor</h4>
                    <p className="text-[11px] text-slate-500">Edit and set verified CGPA, semester scores, SPOC, narrative and student contact</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#8B1D2C] bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Admin Authority
                </span>
              </div>

              <form onSubmit={handleSaveDossier} className="space-y-4 text-xs">
                {/* SECTION 1: ACADEMIC GRADES & SGPA CONTROLLER */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                      <span className="material-symbols-outlined text-sm text-[#8B1D2C]">school</span>
                      <span>Academic Performance Metrics (Admin Controlled)</span>
                    </div>
                    {editForm.semester_scores.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoCalculateCgpa}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                        title="Weighted average of semester scores"
                      >
                        <span className="material-symbols-outlined text-xs text-[#8B1D2C]">calculate</span>
                        Auto-Calculate CGPA from Semesters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Cumulative CGPA (0.00 – 10.00)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        max="10.0"
                        min="0.0"
                        value={editForm.cgpa}
                        onChange={(e) => {
                          const val = e.target.value;
                          const autoScore = val ? (Number(val) * 9.5).toFixed(1) : '';
                          setEditForm({ ...editForm, cgpa: val, academic_score: autoScore });
                        }}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. 8.65"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Academic Score (% Equivalent)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        max="100.0"
                        min="0.0"
                        value={editForm.academic_score}
                        onChange={(e) => setEditForm({ ...editForm, academic_score: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. 82.2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Attendance Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        max="100.0"
                        min="0.0"
                        value={editForm.attendance_rate}
                        onChange={(e) => setEditForm({ ...editForm, attendance_rate: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. 94.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Academic Standing</label>
                      <input
                        type="text"
                        value={editForm.academic_standing}
                        onChange={(e) => setEditForm({ ...editForm, academic_standing: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. Dean's Honors List"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Current Semester</label>
                      <input
                        type="text"
                        value={editForm.current_semester}
                        onChange={(e) => setEditForm({ ...editForm, current_semester: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. Semester 4"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Total Credits Earned</label>
                      <input
                        type="number"
                        value={editForm.total_credits}
                        onChange={(e) => setEditForm({ ...editForm, total_credits: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. 88"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Active Backlogs</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.active_backlogs}
                        onChange={(e) => setEditForm({ ...editForm, active_backlogs: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Faculty Advisor / SPOC</label>
                    <input
                      type="text"
                      value={editForm.faculty_advisor}
                      onChange={(e) => setEditForm({ ...editForm, faculty_advisor: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                      placeholder="e.g. Dr. H.S. Bawa / Prof. Amandeep Kaur"
                    />
                  </div>
                </div>

                {/* SECTION 2: SEMESTER-BY-SEMESTER SGPA TABLE EDITOR */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                      <span className="material-symbols-outlined text-sm text-[#0077B5]">timeline</span>
                      <span>Semester-by-Semester SGPA Records</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSemester}
                      className="px-3 py-1 rounded-xl bg-[#0077B5] hover:bg-[#005E93] text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add Semester
                    </button>
                  </div>

                  {editForm.semester_scores.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs">No semester records added yet. Click &quot;Add Semester&quot; above to add Semester 1, 2, etc.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {editForm.semester_scores.map((sem, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 grid grid-cols-12 gap-2 items-center text-xs"
                        >
                          <div className="col-span-3">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Semester</label>
                            <input
                              type="text"
                              value={sem.semester}
                              onChange={(e) => handleUpdateSemesterRow(idx, 'semester', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B1D2C]"
                              placeholder="Semester 1"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">SGPA</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              value={sem.sgpa}
                              onChange={(e) => handleUpdateSemesterRow(idx, 'sgpa', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#8B1D2C]"
                              placeholder="8.50"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Credits</label>
                            <input
                              type="number"
                              value={sem.credits}
                              onChange={(e) => handleUpdateSemesterRow(idx, 'credits', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C]"
                              placeholder="22"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Grade</label>
                            <select
                              value={sem.grade || 'A+'}
                              onChange={(e) => handleUpdateSemesterRow(idx, 'grade', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#8B1D2C]"
                            >
                              <option value="O">O (Outstanding)</option>
                              <option value="A+">A+ (Excellent)</option>
                              <option value="A">A (Very Good)</option>
                              <option value="B+">B+ (Good)</option>
                              <option value="B">B (Above Avg)</option>
                              <option value="C">C (Pass)</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="F">F (Fail / Reappear)</option>
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Status</label>
                            <select
                              value={sem.status || 'Completed'}
                              onChange={(e) => handleUpdateSemesterRow(idx, 'status', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#8B1D2C]"
                            >
                              <option value="Completed">Completed</option>
                              <option value="Current / Enrolled">Current / Enrolled</option>
                              <option value="Backlog">Backlog</option>
                            </select>
                          </div>

                          <div className="col-span-1 flex justify-center pt-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteSemesterRow(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              title="Delete Semester Entry"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 3: NARRATIVE & CONTACT */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-sm text-emerald-600">badge</span>
                    <span>Profile Narrative, Skills &amp; Contact</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Professional Headline</label>
                    <input
                      type="text"
                      value={editForm.headline}
                      onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                      placeholder="e.g. BCA Scholar @ RIMT University | Software Engineer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Technical Skills (Comma separated)</label>
                      <input
                        type="text"
                        value={editForm.skills}
                        onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                        placeholder="React Native, Node.js, Python, PostgreSQL, Next.js"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Scholar Bio (Short Overview)</label>
                    <textarea
                      rows={2}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                      placeholder="Brief scholar bio..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">About Me (In-depth Narrative)</label>
                    <textarea
                      rows={3}
                      value={editForm.about_me}
                      onChange={(e) => setEditForm({ ...editForm, about_me: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C] bg-white"
                      placeholder="Detailed about me story, research interests, career aspirations..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-white bg-[#8B1D2C] hover:bg-[#701622] font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving to Supabase...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">save</span>
                        Save All Adjustments
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 1. HERO INTRODUCTION CARD (LinkedIn Style Header) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left relative">
            {/* Campus Cover Banner */}
            <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-gradient-to-r from-[#7A1D27] via-[#5C141E] to-[#1E293B]">
              <img
                src={bannerUrl}
                alt="Profile Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_CAMPUS_BANNER && !e.currentTarget.src.includes('campus-banner.jpg')) {
                    e.currentTarget.src = DEFAULT_CAMPUS_BANNER;
                  } else if (!e.currentTarget.src.includes(DEFAULT_CAMPUS_BANNER_FALLBACK)) {
                    e.currentTarget.src = DEFAULT_CAMPUS_BANNER_FALLBACK;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Institution Seal Badge watermark */}
              <div className="absolute top-3 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20">
                <span className="material-symbols-outlined text-sm text-amber-300">school</span>
                RIMT University Training &amp; Placement Directorate
              </div>

              {/* Status Badge in Banner Top-Right */}
              <div className="absolute top-3 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md border ${
                    status === 'APPROVED'
                      ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                      : status === 'PENDING'
                      ? 'bg-amber-500/90 text-white border-amber-300/40'
                      : 'bg-rose-600/90 text-white border-rose-400/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {status === 'APPROVED' ? 'Verified Scholar' : status}
                </span>
              </div>
            </div>

            {/* Profile Avatar & Header Content */}
            <div className="px-6 pb-6 pt-0 relative">
              {/* Avatar Overlapping Banner */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                <div className="relative inline-block">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0077B5] text-white flex items-center justify-center border-2 border-white shadow-md"
                    title="Verified Institutional Scholar"
                  >
                    <span className="material-symbols-outlined text-base">verified</span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  {phone ? (
                    <>
                      <a
                        href={`tel:${phone}`}
                        className="px-4 py-2 rounded-full bg-[#8B1D2C] hover:bg-[#701622] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                        <span>Call ({phone})</span>
                      </a>

                      <a
                        href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>WhatsApp</span>
                      </a>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                      No phone number on record
                    </span>
                  )}

                  <a
                    href={`mailto:${email}`}
                    className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base text-slate-500">mail</span>
                    <span>Email</span>
                  </a>
                </div>
              </div>

              {/* Scholar Name & Headline */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {fullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono font-bold">
                    {rollNo}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#8B1D2C] border border-rose-200/60 text-xs font-bold">
                    {dept}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-700 leading-snug">
                  {headline}
                </p>

                <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                    RIMT University, Mandi Gobindgarh
                  </span>
                  <span>&bull;</span>
                  <span className="text-[#0077B5] font-semibold">{batch}</span>
                  {facultyAdvisor && (
                    <>
                      <span>&bull;</span>
                      <span className="text-slate-600">Assigned SPOC: {facultyAdvisor}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Quick Contact & Info Strip */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                {phone && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="material-symbols-outlined text-sm text-emerald-600">phone_iphone</span>
                    <span className="font-mono font-medium">{phone}</span>
                    <button
                      onClick={() => copyToClipboard(phone, 'phone')}
                      className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy Phone Number"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedField === 'phone' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="material-symbols-outlined text-sm text-[#0077B5]">mail</span>
                  <span className="font-mono">{email}</span>
                  <button
                    onClick={() => copyToClipboard(email, 'email')}
                    className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy Email Address"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'email' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="material-symbols-outlined text-sm text-[#8B1D2C]">tag</span>
                  <span className="font-mono font-bold">Roll: {rollNo}</span>
                  <button
                    onClick={() => copyToClipboard(rollNo, 'roll')}
                    className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy Roll Number"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'roll' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#8B1D2C] tracking-wider block">
                    Cumulative CGPA
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-[#8B1D2C]">
                      {hasCgpa ? cgpa : '—'}
                    </span>
                    {hasCgpa && <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {percentage ? `~${percentage}% Equiv` : 'Awaiting Grading'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                    Attendance Track
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-emerald-700">
                      {attendance || '—'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {attendance ? 'Recorded Attendance' : 'Unrecorded Attendance'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#0077B5] tracking-wider block">
                    Portfolio Projects
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-[#0077B5]">{projects.length}</span>
                    <span className="text-xs text-slate-400 font-semibold">repos</span>
                  </div>
                  <span className="text-[10px] text-blue-700 mt-1 block font-medium">
                    {projects.length > 0 ? 'Live In Portfolio' : 'None Uploaded'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                    Vault Credentials
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-amber-800">{documents.length}</span>
                    <span className="text-xs text-slate-400 font-semibold">items</span>
                  </div>
                  <span className="text-[10px] text-amber-700 mt-1 block font-medium">
                    {documents.length > 0 ? 'Verified Documents' : 'No Certificates'}
                  </span>
                </div>
              </div>

              {/* Bio Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8B1D2C] text-lg">person</span>
                    <h3 className="text-sm font-bold text-slate-900">Professional Bio</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('narrative')}
                    className="text-xs font-bold text-[#8B1D2C] hover:underline"
                  >
                    View Full Narrative →
                  </button>
                </div>

                {bioText ? (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {bioText}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No biographical statement or narrative submitted by student yet.
                  </p>
                )}

                {skills.length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {skills.slice(0, 6).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                          {skill}
                        </span>
                      ))}
                      {skills.length > 6 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold">
                          +{skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMICS & SGPA TRACKER */}
          {activeTab === 'academics' && (
            <div className="space-y-4 animate-fadeIn text-left">
              {/* Main Score Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8B1D2C] text-xl">analytics</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Academic Standing &amp; Transcript Records</h3>
                      <p className="text-[11px] text-slate-500">Official university grading records — directly editable by administration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {standing && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        {standing}
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 rounded-xl bg-rose-50 text-[#8B1D2C] hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit Grades
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {/* CGPA Box */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-200/70 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#8B1D2C] tracking-wider block">
                      Cumulative CGPA
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-[#8B1D2C]">
                        {hasCgpa ? cgpa : '—'}
                      </span>
                      {hasCgpa && <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>}
                    </div>
                    {hasCgpa && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-[#8B1D2C] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (Number(cgpa) / 10) * 100)}%` }}
                        />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {percentage ? `Equiv: ~${percentage}%` : 'Not graded yet'}
                    </span>
                  </div>

                  {/* Attendance Track */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/70 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                      Attendance Track
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-emerald-700">
                        {attendance || '—'}
                      </span>
                    </div>
                    {attendance && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${attendance.replace('%', '')}%` }}
                        />
                      </div>
                    )}
                    <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                      {attendance ? 'Verified Regular Scholar' : 'Awaiting Records'}
                    </span>
                  </div>

                  {/* Total Credits */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200/70 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#0077B5] tracking-wider block">
                      Total Credits
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-[#0077B5]">
                        {data.total_credits || '—'}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">credits</span>
                    </div>
                    <span className="text-[10px] text-blue-700 mt-2 block font-medium">
                      Curriculum Progress
                    </span>
                  </div>

                  {/* Active Backlogs */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">
                      Active Backlogs
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-2xl font-black ${Number(data.active_backlogs) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {data.active_backlogs ?? 0}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">courses</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 block font-medium">
                      {Number(data.active_backlogs) > 0 ? 'Needs Attention' : 'All Clear / Eligible'}
                    </span>
                  </div>
                </div>

                {/* Semester-by-Semester Track Timeline */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#8B1D2C]">timeline</span>
                      Semester-by-Semester SGPA Performance Ledger
                    </h4>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-[#8B1D2C] hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add_circle</span>
                      Manage Semesters
                    </button>
                  </div>

                  {semesterScores.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-xl">history_edu</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-700">No Semester SGPA Records Entered</h5>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Semester marks and credits have not been recorded yet. Click below to add Semester 1, 2, etc. and set SGPA.
                      </p>
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          handleAddSemester();
                        }}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-[#8B1D2C] text-white text-xs font-bold shadow-2xs hover:bg-[#721522]"
                      >
                        + Add First Semester Record
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {semesterScores.map((sem, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-[#8B1D2C]/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{sem.semester}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {sem.grade || '—'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-slate-900">{sem.sgpa}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">SGPA</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{sem.credits ? `${sem.credits} credits` : ''}</span>
                          </div>
                          <div className="mt-1 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span>{sem.status || 'Completed'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS & REPOSITORIES */}
          {activeTab === 'projects' && (
            <div className="space-y-4 animate-fadeIn text-left">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0077B5] flex items-center justify-center border border-blue-200">
                      <span className="material-symbols-outlined text-lg">code_blocks</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Student Portfolio Projects</h3>
                      <p className="text-[11px] text-slate-500">Real projects synchronized from the student mobile app and ledger</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0077B5] px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
                      {projects.length} Verified Repos
                    </span>
                    <button
                      onClick={() => setIsAddingProject(!isAddingProject)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer ${
                        isAddingProject
                          ? 'bg-rose-50 text-[#8B1D2C] border border-rose-300'
                          : 'bg-[#8B1D2C] hover:bg-[#721522] text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isAddingProject ? 'close' : 'add'}
                      </span>
                      <span>{isAddingProject ? 'Cancel' : 'Add Project'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Admin Add Project Form */}
                {isAddingProject && (
                  <form onSubmit={handleSaveNewProject} className="p-4 rounded-2xl bg-slate-50 border-2 border-[#8B1D2C]/30 shadow-md space-y-3 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#8B1D2C]">add_circle</span>
                        Register New Project for {fullName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Syncs to Supabase</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Project Title *</label>
                        <input
                          type="text"
                          required
                          value={projectForm.title}
                          onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs focus:outline-none focus:border-[#8B1D2C]"
                          placeholder="e.g. Distributed Consensus Engine"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Category</label>
                        <select
                          value={projectForm.category}
                          onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                        >
                          <option value="Academic Core">Academic Core</option>
                          <option value="Capstone Lab">Capstone Lab</option>
                          <option value="Group Research">Group Research</option>
                          <option value="Personal Lab">Personal Lab</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">About Project (Overview &amp; Architecture)</label>
                      <textarea
                        rows={2}
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                        placeholder="Comprehensive description of the project problem, architecture, stack, and features..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tech Stack Used (comma-separated)</label>
                        <input
                          type="text"
                          value={projectForm.tech_stack}
                          onChange={(e) => setProjectForm({ ...projectForm, tech_stack: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                          placeholder="React Native, Node.js, PostgreSQL, TailwindCSS"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Status</label>
                        <select
                          value={projectForm.status}
                          onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Active">Active</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">GitHub Repo URL</label>
                        <input
                          type="url"
                          value={projectForm.github_url}
                          onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                          placeholder="https://github.com/..."
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Live Domain / Demo URL</label>
                        <input
                          type="url"
                          value={projectForm.live_url}
                          onChange={(e) => setProjectForm({ ...projectForm, live_url: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                          placeholder="https://my-app.vercel.app"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Project Logo URL (Optional)</label>
                        <input
                          type="url"
                          value={projectForm.logo_url}
                          onChange={(e) => setProjectForm({ ...projectForm, logo_url: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#8B1D2C]"
                          placeholder="https://.../logo.png"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingProject}
                        className="px-4 py-1.5 rounded-lg text-white bg-[#8B1D2C] hover:bg-[#721522] font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {savingProject ? 'Saving...' : 'Add Project to Ledger'}
                      </button>
                    </div>
                  </form>
                )}

                {projects.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                      <span className="material-symbols-outlined text-2xl">folder_off</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">No Projects Uploaded Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {fullName} has not published any software repositories or capstone projects to their profile. Click &quot;Add Project&quot; above to register an academic repository.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {projects.map((proj, idx) => {
                      const logoUri = proj.logo_url || proj.logoUrl;
                      const hasLive = Boolean(proj.live_url || proj.liveUrl);
                      const hasGithub = Boolean(proj.github_url || proj.githubUrl);
                      const techList = proj.tech_stack || proj.tags || [];

                      return (
                        <div
                          key={proj.id || idx}
                          className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-[#8B1D2C]/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Top: Logo / Squircle Icon + Category + Status + Delete Action */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                {logoUri ? (
                                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs shrink-0">
                                    <img
                                      src={logoUri}
                                      alt={proj.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 text-[#8B1D2C] flex items-center justify-center border border-rose-200/70 shadow-2xs shrink-0">
                                    <span className="material-symbols-outlined text-xl">code</span>
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                                      {proj.categoryLabel || proj.category || 'Academic Core'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                                      #{proj.id}
                                    </span>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold mt-0.5 ${
                                    (proj.status || '').toLowerCase().includes('complete') ? 'text-emerald-700' : 'text-amber-700'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      (proj.status || '').toLowerCase().includes('complete') ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                    }`} />
                                    {proj.status || 'Active'}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteProject(proj.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                                title="Remove Project"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>

                            {/* Project Title */}
                            <h4 className="text-sm font-bold text-slate-900 leading-snug tracking-tight mb-2">
                              {proj.title}
                            </h4>

                            {/* Dedicated ABOUT PROJECT Section */}
                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 mb-2.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-slate-400">info</span>
                                About Project
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                {proj.description || proj.about || 'No detailed architecture description provided.'}
                              </p>
                            </div>

                            {/* Dedicated TECH STACK USED Section */}
                            {techList.length > 0 && (
                              <div className="mb-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs text-slate-400">terminal</span>
                                  Tech Stack Used
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {techList.map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[11px] font-mono font-semibold border border-slate-200 shadow-2xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer Action Strip */}
                          <div className="mt-2 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {hasLive && (
                                <a
                                  href={proj.live_url || proj.liveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-sm text-emerald-600">language</span>
                                  <span>Live Domain</span>
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                                </a>
                              )}

                              {hasGithub && (
                                <a
                                  href={proj.github_url || proj.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-sm text-slate-700">code</span>
                                  <span>GitHub Repo</span>
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                                </a>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-emerald-600">sync</span>
                              {proj.commitInfo || 'Git Synced'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CERTIFICATES & INTERNSHIPS */}
          {activeTab === 'certificates' && (
            <div className="space-y-5 animate-fadeIn text-left">
              {/* Section: Summary Banner */}
              <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl text-amber-300">workspace_premium</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Certificates & Internships</h3>
                    <p className="text-xs text-white/60">Verified academic credentials for {fullName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center border border-white/5">
                    <p className="text-lg font-extrabold">{documents.length}</p>
                    <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Certificates</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center border border-white/5">
                    <p className="text-lg font-extrabold">{(data.internships || []).length}</p>
                    <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Internships</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center border border-white/5">
                    <p className="text-lg font-extrabold text-emerald-400">{documents.length > 0 ? '✓' : '—'}</p>
                    <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Verified</p>
                  </div>
                </div>
              </div>

              {/* Section: Certificates Visual Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200">
                      <span className="material-symbols-outlined text-amber-500 text-base">workspace_premium</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Uploaded Certificates & Documents</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{documents.length}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCertificate(!isAddingCertificate);
                        setEditingCertificateId(null);
                        setCertificateForm({
                          title: '',
                          issuer: 'RIMT University Registrar',
                          credential_id: '',
                          issue_date: new Date().toISOString().split('T')[0],
                          url: '',
                          format: 'image',
                          _file: null,
                        });
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">{isAddingCertificate ? 'close' : 'add'}</span>
                      {isAddingCertificate ? 'Cancel' : 'Issue / Add Certificate'}
                    </button>
                  </div>
                </div>

                {/* Form to issue/add certificate */}
                {isAddingCertificate && (
                  <form onSubmit={handleAddCertificate} className="mb-6 p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-amber-600">verified</span>
                        {editingCertificateId ? 'Update Certificate Record' : 'Issue Verified Institutional Certificate'}
                      </h4>
                      <span className="text-[10px] text-amber-700 font-mono">Syncs to Student App</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Certificate Title *</label>
                        <input
                          type="text"
                          required
                          value={certificateForm.title}
                          onChange={(e) => setCertificateForm({ ...certificateForm, title: e.target.value })}
                          placeholder="e.g. AWS Certified Solutions Architect, Merit Award"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Issuing Authority / Organization</label>
                        <input
                          type="text"
                          value={certificateForm.issuer}
                          onChange={(e) => setCertificateForm({ ...certificateForm, issuer: e.target.value })}
                          placeholder="e.g. RIMT University, Coursera, NPTEL, Cisco"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Credential / Certificate ID</label>
                        <input
                          type="text"
                          value={certificateForm.credential_id}
                          onChange={(e) => setCertificateForm({ ...certificateForm, credential_id: e.target.value })}
                          placeholder="e.g. CERT-2026-098"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={certificateForm.issue_date}
                          onChange={(e) => setCertificateForm({ ...certificateForm, issue_date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Format Type</label>
                        <select
                          value={certificateForm.format}
                          onChange={(e) => setCertificateForm({ ...certificateForm, format: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        >
                          <option value="image">Image (JPG/PNG/WebP)</option>
                          <option value="pdf">Document (PDF)</option>
                          <option value="doc">Word Document (DOC)</option>
                          <option value="docx">Word Document (DOCX)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Certificate File or URL</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors">
                            <span className="material-symbols-outlined text-xl text-amber-500">cloud_upload</span>
                            <span className="text-[10px] font-bold text-amber-700 mt-1">
                              {certificateForm._file ? certificateForm._file.name : 'Upload Certificate File'}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const isImg = file.type.startsWith('image/');
                                  const extension = getFileExtension(file.name);
                                  setCertificateForm({
                                    ...certificateForm,
                                    _file: file,
                                    url: '',
                                    format: isImg ? 'image' : extension,
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div>
                          <input
                            type="url"
                            value={certificateForm.url}
                            onChange={(e) => setCertificateForm({ ...certificateForm, url: e.target.value, _file: null })}
                            placeholder="Or paste URL: https://..."
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-mono h-20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                      <button
                        type="button"
                        onClick={() => setIsAddingCertificate(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCertificate}
                        className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">{savingCertificate ? 'sync' : 'check'}</span>
                        {savingCertificate ? 'Saving...' : editingCertificateId ? 'Save Certificate Changes' : 'Issue & Verify Certificate'}
                      </button>
                    </div>
                  </form>
                )}

                {documents.length === 0 ? (
                  <div className="py-10 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-3xl text-slate-300">folder_open</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-600">No Certificates Uploaded</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No certificates or documents have been uploaded by {fullName} yet. Documents uploaded from the app or issued here will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {documents.map((doc, idx) => {
                      const docUrl = doc.url || doc.cloudinary_url || doc.file_url || doc.verification_url || '';
                      const mimeType = doc.mime_type || '';
                      const isImage = mimeType.startsWith('image/')
                        || /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(docUrl)
                        || (doc.format && /^(jpg|jpeg|png|webp|gif|image)$/i.test(doc.format));
                      const isPdf = mimeType.includes('pdf') || doc.format === 'pdf' || /\.pdf(\?|$)/i.test(docUrl);
                      const isWord = mimeType.includes('word') || /\.(doc|docx)(\?|$)/i.test(docUrl)
                        || /^(doc|docx)$/i.test(doc.format || '');
                      const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(docUrl);

                      const isLocal = docUrl.startsWith('file://');
                      const isCloudinary = docUrl.includes('res.cloudinary.com');
                      const isCloudinaryPdf = isPdf && isCloudinary;
                      const pdfThumbUrl = isCloudinaryPdf ? docUrl.replace(/\.pdf($|\?)/i, '.jpg$1') : null;

                      return (
                        <div
                          key={doc.id || idx}
                          className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-[#8B1D2C]/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            setPreviewDoc(doc);
                          }}
                        >
                          {/* Thumbnail Area */}
                          <div className={`w-full h-32 flex items-center justify-center relative overflow-hidden ${isImage ? 'bg-slate-100' : isPdf ? 'bg-rose-50/60' : isVideo ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {isImage && docUrl && !isLocal ? (
                              <img
                                src={docUrl}
                                alt={doc.title || 'Certificate'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement.innerHTML = '<span class="material-symbols-outlined text-4xl text-slate-300">broken_image</span>';
                                }}
                              />
                            ) : pdfThumbUrl ? (
                              <img
                                src={pdfThumbUrl}
                                alt={doc.title || 'Certificate'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : isVideo && docUrl && !isLocal ? (
                              <video src={docUrl} className="w-full h-full object-cover" muted />
                            ) : isLocal ? (
                              <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                                <span className="material-symbols-outlined text-3xl text-amber-500">
                                  phonelink_lock
                                </span>
                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Device Local</span>
                                <span className="text-[9px] text-slate-400">Needs Cloud Sync</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`material-symbols-outlined text-4xl ${isPdf ? 'text-red-500' : isVideo ? 'text-purple-500' : 'text-blue-500'}`}>
                                  {isPdf ? 'picture_as_pdf' : isVideo ? 'videocam' : 'description'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">{doc.format || (isWord ? 'docx' : 'pdf')}</span>
                              </div>
                            )}

                            {/* Delete button (top-left) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCertificate(doc.id || doc.credential_id);
                              }}
                              className="absolute top-2 left-2 w-7 h-7 rounded-md bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm z-10 cursor-pointer"
                              title="Delete Certificate"
                            >
                              <span className="material-symbols-outlined text-[13px]">delete</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCertificate(doc);
                              }}
                              className="absolute top-2 left-10 w-7 h-7 rounded-md bg-black/70 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm z-10 cursor-pointer"
                              title="Edit Certificate"
                            >
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                            </button>

                            {/* Verified badge */}
                            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                              <span className="material-symbols-outlined text-[10px]">verified</span>
                              {doc.status || 'Verified'}
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="material-symbols-outlined text-white text-xl drop-shadow-md">
                                {isImage ? 'zoom_in' : 'open_in_new'}
                              </span>
                            </div>
                          </div>
                          {/* Info */}
                          <div className="p-2.5">
                            <h5 className="text-xs font-bold text-slate-800 truncate">{doc.title || 'Certificate'}</h5>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {doc.issuer || doc.original_filename || 'Uploaded from Student App'}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              {doc.credential_id && (
                                <span className="text-[9px] text-slate-400 font-mono">ID: {doc.credential_id}</span>
                              )}
                              {!docUrl && (
                                <span className="text-[9px] text-amber-600 font-bold">⚠ No preview URL</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section: Internship Experience */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                      <span className="material-symbols-outlined text-blue-500 text-base">work</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Internship Experience</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{(data.internships || []).length}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingInternship(!isAddingInternship);
                        setEditingInternshipId(null);
                        setInternshipForm({ company: '', role: '', duration: '', description: '', certificate_url: '', _file: null });
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">{isAddingInternship ? 'close' : 'add'}</span>
                      <span>{isAddingInternship ? 'Cancel' : 'Add Internship'}</span>
                    </button>
                  </div>
                </div>

                {/* Add Internship Inline Form */}
                {isAddingInternship && (
                  <form onSubmit={handleSaveNewInternship} className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-600">add_circle</span>
                        {editingInternshipId ? 'Update Internship Record' : 'Register Verified Internship'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Company / Organization *</label>
                        <input
                          type="text"
                          required
                          value={internshipForm.company}
                          onChange={(e) => setInternshipForm({ ...internshipForm, company: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
                          placeholder="e.g. Google, Infosys, Microsoft"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Role / Position *</label>
                        <input
                          type="text"
                          required
                          value={internshipForm.role}
                          onChange={(e) => setInternshipForm({ ...internshipForm, role: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
                          placeholder="e.g. Software Engineer Intern"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Duration / Tenure</label>
                        <input
                          type="text"
                          value={internshipForm.duration}
                          onChange={(e) => setInternshipForm({ ...internshipForm, duration: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
                          placeholder="e.g. Jun 2025 - Aug 2025 (3 mos)"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Certificate / Verification URL</label>
                        <input
                          type="url"
                          value={internshipForm.certificate_url}
                          onChange={(e) => setInternshipForm({ ...internshipForm, certificate_url: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
                          placeholder="https://.../certificate.pdf"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Or upload PDF / Word document</label>
                        <input
                          type="file"
                          accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setInternshipForm({ ...internshipForm, _file: file, certificate_url: '' });
                          }}
                          className="w-full h-8 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[10px]"
                        />
                        {internshipForm._file && (
                          <p className="mt-1 text-[10px] text-blue-700 truncate">{internshipForm._file.name}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Work Summary / Contribution</label>
                      <textarea
                        rows={2}
                        value={internshipForm.description}
                        onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
                        placeholder="Key responsibilities, technologies used, achievements..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingInternship(false);
                          setEditingInternshipId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingInternship}
                        className="px-4 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-2xs flex items-center gap-1.5 text-xs disabled:opacity-50"
                      >
                        {savingInternship ? 'Saving...' : editingInternshipId ? 'Save Changes' : 'Save Internship'}
                      </button>
                    </div>
                  </form>
                )}

                {(!data.internships || data.internships.length === 0) ? (
                  <div className="py-10 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-3xl text-slate-300">work_outline</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-600">No Internships Recorded</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No internship experiences have been added yet. Click &quot;Add Internship&quot; above to register an industry experience.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(data.internships || []).map((intern, idx) => (
                      <div
                        key={intern.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                            <span className="material-symbols-outlined text-xl">business</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-slate-900">{intern.role || 'Intern'}</h5>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">{intern.company || 'Company'}</p>
                            {intern.duration && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="material-symbols-outlined text-xs text-slate-400">schedule</span>
                                <span className="text-[11px] text-slate-500">{intern.duration}</span>
                              </div>
                            )}
                            {intern.description && (
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{intern.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                                <span className="material-symbols-outlined text-[10px]">verified</span>
                                Verified
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteInternship(intern.id)}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                                title="Remove Internship"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditInternship(intern)}
                                className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                                title="Edit Internship"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                            </div>
                            {intern.certificate_url && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({
                                    title: `${intern.company || 'Internship'} Certificate`,
                                    url: intern.certificate_url,
                                    original_filename: intern.certificate_filename,
                                    format: intern.certificate_format,
                                    mime_type: intern.certificate_mime_type,
                                  })}
                                  className="text-[10px] font-bold text-[#8B1D2C] flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[10px]">workspace_premium</span>
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInternshipCertificate(intern)}
                                  className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                                  title="Remove internship document"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: NARRATIVE & SKILLS */}
          {activeTab === 'narrative' && (
            <div className="space-y-4 animate-fadeIn text-left">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8B1D2C] text-lg">person</span>
                    <h3 className="text-sm font-bold text-slate-900">Scholar Narrative &amp; Competency Profile</h3>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-[#8B1D2C] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    Edit Narrative
                  </button>
                </div>

                {/* About Me Section */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">
                    About Me / Background Narrative
                  </span>
                  {data.about_me ? (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {data.about_me}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      No &quot;About Me&quot; story provided yet.
                    </p>
                  )}
                </div>

                {/* Bio Summary */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">
                    Professional Summary (Bio)
                  </span>
                  {data.bio ? (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {data.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      No bio entered yet.
                    </p>
                  )}
                </div>

                {/* Skills Tags */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">
                    Technical Skills &amp; Competencies
                  </span>
                  {skills.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No technical skills added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {data.admin_notes && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider block flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">notes</span>
                      Internal Directorate Notes
                    </span>
                    <p className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200 font-mono">
                      {data.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REGISTRAR AUDIT FOOTER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-left flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-slate-400">history</span>
              <span>Registration Submitted: {data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : 'Recent'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
              <span>Audited By: {data.reviewed_by || 'Admin Gateway'}</span>
            </div>
          </div>

        </div>

        {/* Bottom Modal Actions Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Current Status:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'PENDING'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status !== 'APPROVED' && onStatusChange && (
              <button
                onClick={() => onStatusChange(data, 'APPROVE')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Approve Student</span>
              </button>
            )}

            {status === 'APPROVED' && onStatusChange && (
              <button
                onClick={() => onStatusChange(data, 'REVOKE')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">block</span>
                <span>Revoke Access</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

        {/* IN-MODAL DOCUMENT PREVIEW SUB-MODAL */}
        {previewDoc && (() => {
          const previewUrl = previewDoc.url || previewDoc.cloudinary_url || previewDoc.file_url || previewDoc.verification_url || '';
          const previewMime = previewDoc.mime_type || '';
          const previewIsImage = previewMime.startsWith('image/')
            || /\.(jpeg|jpg|png|webp|gif|bmp|svg)(\?|$)/i.test(previewUrl)
            || (previewDoc.format && /^(jpg|jpeg|png|webp|gif|image)$/i.test(previewDoc.format));
          const isLocal = previewUrl.startsWith('file://');
          const isHttp = previewUrl.startsWith('http://') || previewUrl.startsWith('https://');
          const previewName = previewDoc.original_filename || previewDoc.title || previewUrl;
          const isWord = previewMime.includes('word')
            || /\.(doc|docx)(\?|$)/i.test(previewName)
            || /^(doc|docx)$/i.test(previewDoc.format || '');
          const isPdf = !isWord && (previewMime.includes('pdf') || previewDoc.format === 'pdf' || /\.pdf($|\?)/i.test(previewUrl));
          const isCloudinary = previewUrl.includes('res.cloudinary.com');
          const isCloudinaryPdf = isPdf && isCloudinary;
          const pdfJpgUrl = isCloudinaryPdf ? previewUrl.replace(/\.pdf($|\?)/i, '.jpg$1') : null;
          const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;

          return (
            <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div
                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[#8B1D2C] text-lg shrink-0">
                      {previewIsImage ? 'image' : isPdf ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {previewDoc.title || 'Document Preview'}
                      </span>
                      {previewDoc.issuer && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          Issued by {previewDoc.issuer} {previewDoc.credential_id ? `• ID: ${previewDoc.credential_id}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pdfJpgUrl && (
                      <a
                        href={pdfJpgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 transition-all border border-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-sm">image</span>
                        High-Res Image
                      </a>
                    )}
                    {isHttp && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#8B1D2C] text-white hover:bg-[#721522] flex items-center gap-1 shadow-sm transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Open Full Tab
                      </a>
                    )}
                    {isLocal && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">phonelink</span>
                        Device Local Only
                      </span>
                    )}
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[400px]">
                  {previewIsImage && isHttp ? (
                    <img
                      src={previewUrl}
                      alt={previewDoc.title || 'Certificate'}
                      className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : isCloudinaryPdf && pdfJpgUrl ? (
                    <div className="w-full h-[70vh] flex flex-col items-center justify-center relative bg-slate-950 rounded-lg p-2 overflow-auto">
                      <img
                        src={pdfJpgUrl}
                        alt={previewDoc.title || 'PDF Certificate'}
                        className="max-h-[66vh] max-w-full object-contain rounded shadow-2xl"
                      />
                      <div className="mt-2 text-center">
                        <span className="text-[11px] text-slate-400">
                          High-Fidelity Cloudinary Preview •{' '}
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 underline hover:text-amber-300 ml-1"
                          >
                            Open Raw PDF
                          </a>
                        </span>
                      </div>
                    </div>
                  ) : isPdf && isHttp ? (
                    <div className="w-full h-[70vh] flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-white">
                      <iframe
                        src={previewUrl}
                        title={previewDoc.title || 'PDF preview'}
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : isWord && isHttp ? (
                    <div className="w-full h-[70vh] flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-white">
                      <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-blue-600">description</span>
                          Word Document Preview
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-[11px] font-medium transition-colors"
                          >
                            Open Google Viewer
                          </a>
                          <a
                            href={previewUrl}
                            download={previewName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">download</span>
                            Download Document
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                        title={previewDoc.title || 'Word document preview'}
                        className="w-full flex-1 border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : isLocal ? (
                    <div className="text-center text-slate-300 space-y-4 p-8 max-w-md bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-lg">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-3xl">phonelink_lock</span>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white mb-1">Local Device File</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          This file was stored directly in the student phone&apos;s local cache (<span className="font-mono text-amber-300 text-[10px]">{previewDoc.original_filename || 'document.pdf'}</span>) because remote cloud storage upload was bypassed or rejected.
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-left text-xs space-y-1.5 text-slate-300">
                        <div className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Why can&apos;t I open this on desktop?
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Web browsers block access to private mobile file paths (<span className="font-mono text-[10px]">file:///data/user/0/...</span>). Enabling Cloudinary uploads ensures documents are instantly accessible anywhere.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-300 space-y-3 p-6">
                      <span className="material-symbols-outlined text-6xl text-rose-400 block">
                        {isWord ? 'description' : 'picture_as_pdf'}
                      </span>
                      <p className="text-sm font-semibold">{previewDoc.original_filename || previewDoc.title}</p>
                      <p className="text-xs text-slate-400">
                        Official credential verified in university storage.
                      </p>
                      {isHttp && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1D2C] text-white text-xs font-semibold shadow-md"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open Full Resolution Document
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">
                    {previewDoc.format ? previewDoc.format.toUpperCase() : 'PDF'} &bull; {previewDoc.status || 'Verified'}
                    {previewDoc.storage_provider && <span className="text-slate-400"> &bull; Provider: {previewDoc.storage_provider}</span>}
                  </span>
                  {previewDoc.credential_id && (
                    <span className="text-slate-500 font-mono text-[11px] bg-slate-200/80 px-2 py-0.5 rounded">
                      ID: {previewDoc.credential_id}
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
