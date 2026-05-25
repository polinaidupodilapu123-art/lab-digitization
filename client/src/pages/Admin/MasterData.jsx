import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, X, FileSpreadsheet, Plus, RefreshCw, ChevronLeft, ChevronRight, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';



const API = 'http://localhost:5000/api/admin';
const PAGE_SIZE = 10;

const TAB_CONFIG = {
  colleges: {
    label: 'Colleges',
    endpoint: '/colleges',
    uploadType: 'colleges',
    columns: [
      { key: 'collegeCode', header: 'College Code' },
      { key: 'collegeName', header: 'College Name' },
      { key: 'location',    header: 'Location'     },
      { key: 'district',    header: 'District'     },
    ],
  },
  courses: {
    label: 'Courses',
    endpoint: '/courses',
    uploadType: 'courses',
    columns: [
      { key: 'courseCode', header: 'Course Code' },
      { key: 'courseName', header: 'Course Name' },
    ],
  },
  subjects: {
    label: 'Subjects',
    endpoint: '/subjects',
    uploadType: 'subjects',
    columns: [
      { key: 'subCode',       header: 'Sub Code'       },
      { key: 'subName',       header: 'Subject Name'   },
      { key: 'semester',      header: 'Semester'       },
      { key: 'studentChoice', header: 'Student Choice' },
      { key: 'type',          header: 'Type'           },
      { key: 'aliasName',     header: 'Alias Name'     },
      { key: 'maxMarks',      header: 'Max Marks'      },
      { key: 'subPassMarks',  header: 'Pass Marks'     },
    ],
  },
  groups: {
    label: 'Groups',
    endpoint: '/groups',
    uploadType: 'groups',
    columns: [
      { key: 'groupCode',     header: 'Group Code'     },
      { key: 'courseCode',    header: 'Course Code'    },
      { key: 'groupName',     header: 'Group Name'     },
      { key: 'pedagogy1Name', header: 'Pedagogy1 Name' },
      { key: 'pedagogy2Name', header: 'Pedagogy2 Name' },
    ],
  },
  students: {
    label: 'Students',
    endpoint: '/students',
    uploadType: 'students',
    columns: [
      { key: 'regdNo',      header: 'Registration Number' },
      { key: 'fullName',    header: 'Student Name'        },
      { key: 'collegeCode', header: 'College Code'        },
      { key: 'groupCode',   header: 'Group Code'          },
    ],
  },
  papers: {
    label: 'Papers',
    endpoint: '/papers',
    uploadType: 'papers',
    columns: [
      { key: 'paperCode', header: 'Paper Code' },
      { key: 'paperName', header: 'Paper Name' },
      { key: 'semester',  header: 'Semester' },
      { key: 'maxMarks',  header: 'Max Marks', autoCalculated: true },
      { key: 'passMarks', header: 'Pass Marks', autoCalculated: true },
      { 
        key: 'subjectIds', 
        header: 'Subject Code(s)', 
        render: (vals) => Array.isArray(vals) && vals.length > 0 ? (
          <div className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block max-w-[200px] truncate" title={vals.map(s => s.aliasName || s.subCode).join(', ')}>
            {vals.map(s => s.aliasName || s.subCode).join(', ')}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )
      },
    ],
  },
  evaluators: {
    label: 'Evaluators',
    endpoint: '/evaluators',
    uploadType: 'evaluators',
    columns: [
      { key: 'fullName', header: 'Full Name' },
      { key: 'regdNo',   header: 'Email' },
      { key: 'password', header: 'Password', hideInTable: true },
    ]
  },
};

/* ── Pagination component ── */
const Pagination = ({ total, page, onPage }) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <span className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of <span className="font-semibold text-slate-700">{total}</span> records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-3 w-3" /> Prev
        </button>

        {/* Page pills */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  p === page
                    ? 'bg-teal-700 text-white border border-teal-700'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Next <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
};

/* ── Custom Search Dropdown ── */
const CustomSearchDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const selectedOption = options.find(opt => String(opt.value) === String(value));
    if (selectedOption && !isOpen) {
      setSearch(selectedOption.label);
    } else if (!isOpen) {
      setSearch(value || '');
    }
  }, [value, options, isOpen]);

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(search.toLowerCase()) || 
    String(opt.value).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto top-full left-0 origin-top custom-scrollbar">
          {filteredOptions.map((opt, i) => (
            <div
              key={i}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 cursor-pointer truncate"
              title={opt.label}
              onClick={() => {
                setSearch(opt.label);
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span className="font-semibold text-teal-700 mr-2">{opt.value}</span>
              <span className="text-slate-500">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Custom Multi Select Dropdown ── */
const CustomMultiSelectDropdown = ({ values = [], onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    const current = Array.isArray(values) ? values : [];
    if (current.includes(val)) {
      onChange(current.filter(v => v !== val));
    } else {
      onChange([...current, val]);
    }
  };

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(search.toLowerCase()) || 
    String(opt.value).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="w-full min-h-[38px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-1 items-center cursor-text focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:border-teal-500 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        {(Array.isArray(values) ? values : []).map((val) => {
          const opt = options.find(o => String(o.value) === String(val));
          return (
            <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-md">
              <span className="font-semibold">{val}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleOption(val); }} 
                className="hover:text-red-500 transition-colors p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-slate-800 min-w-[100px]"
          placeholder={(!Array.isArray(values) || values.length === 0) ? placeholder : ''}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
        />
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto top-full left-0 origin-top custom-scrollbar">
          {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => {
            const isSelected = (Array.isArray(values) ? values : []).includes(opt.value);
            return (
              <div
                key={i}
                className={`px-3 py-2 text-sm cursor-pointer truncate flex items-center gap-2 ${isSelected ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'}`}
                title={opt.label}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(opt.value);
                  setSearch('');
                }}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300'}`}>
                  {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                </div>
                <span className="font-semibold text-teal-700">{opt.value}</span>
                <span className="text-slate-500">{opt.label}</span>
              </div>
            );
          }) : (
            <div className="px-3 py-2 text-sm text-slate-500">No matching subjects</div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Generic Edit/Add Modal ── */
const RecordModal = ({ record, cfg, tabKey, token, onClose, onSuccess }) => {
  const isNew = !record;
  const initialData = { ...record };
  if (!isNew && tabKey === 'papers' && initialData.subjectIds) {
    initialData.subjectIds = initialData.subjectIds.map(s => s.subCode || s);
  }
  if (!isNew && tabKey === 'evaluators' && initialData.subjects) {
    initialData.subjects = initialData.subjects.map(s => s._id || s);
  }
  const [formData, setFormData] = useState(initialData || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);

  useEffect(() => {
    if (tabKey === 'papers' || tabKey === 'evaluators') {
      axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setSubjectOptions(sorted);
        })
        .catch(err => console.error(err));
    }
    if (tabKey === 'papers') {
      axios.get(`${API}/semesters`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setSemesterOptions(res.data))
        .catch(err => console.error(err));
    }
  }, [tabKey, token]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Live calculation for autoCalculated fields
  useEffect(() => {
    if (tabKey === 'papers' && formData.subjectIds && Array.isArray(formData.subjectIds)) {
      let calcMax = 0;
      let calcPass = 0;
      formData.subjectIds.forEach(subCode => {
         const subject = subjectOptions.find(s => s.subCode === subCode);
         if (subject) {
            calcMax += (Number(subject.maxMarks) || 0);
            calcPass += (Number(subject.subPassMarks) || 0);
         }
      });
      setFormData(prev => {
        if (prev.maxMarks === calcMax && prev.passMarks === calcPass) return prev;
        return { ...prev, maxMarks: calcMax, passMarks: calcPass };
      });
    }
  }, [formData.subjectIds, tabKey, subjectOptions]);

  const handleChange = (e, key) => {
    setFormData(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        // Create new record
        await axios.post(`${API}/record/${tabKey}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onSuccess(tabKey, 'Record created successfully!');
      } else {
        // Update existing record
        await axios.put(`${API}/record/${tabKey}/${record._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onSuccess(tabKey, 'Record updated successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Edit2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{isNew ? 'Add' : 'Edit'} {cfg.label}</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer rounded-md p-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-visible flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex items-start gap-2">
              <span>✕ {error}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {[...cfg.columns].sort((a, b) => (a.autoCalculated ? 1 : 0) - (b.autoCalculated ? 1 : 0)).map(col => (
              <div key={col.key}>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  {col.header}
                </label>
                {tabKey === 'papers' && col.key === 'subjectIds' ? (
                  <CustomMultiSelectDropdown
                    values={formData[col.key] || []}
                    onChange={(val) => handleChange({ target: { value: val } }, col.key)}
                    placeholder="Search and select subjects..."
                    options={subjectOptions
                      .filter(sub => !formData.semester || !sub.semester || String(sub.semester).trim().includes(String(formData.semester).trim()))
                      .map(sub => ({ value: sub.subCode, label: sub.subName }))
                    }
                  />
                ) : tabKey === 'evaluators' && col.key === 'subjects' ? (
                  <CustomMultiSelectDropdown
                    values={formData[col.key] || []}
                    onChange={(val) => handleChange({ target: { value: val } }, col.key)}
                    placeholder="Search and select subjects..."
                    options={subjectOptions.map(sub => ({ value: sub._id, label: `${sub.subCode} - ${sub.subName}` }))}
                  />
                ) : tabKey === 'papers' && col.key === 'semester' ? (
                  <CustomSearchDropdown
                    value={formData[col.key]}
                    onChange={(val) => handleChange({ target: { value: val } }, col.key)}
                    placeholder="Select semester..."
                    options={semesterOptions.map(sem => ({ value: sem, label: `Semester ${sem}` }))}
                  />
                ) : col.autoCalculated ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      disabled
                      value={formData[col.key] !== undefined ? formData[col.key] : ''}
                      placeholder="Auto-calculated from subjects"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-teal-700 font-semibold cursor-not-allowed"
                    />
                    <p className="text-[10px] text-teal-600 font-medium italic">Calculated automatically on save.</p>
                  </div>
                ) : (
                  <input
                    type={col.key === 'password' ? 'password' : 'text'}
                    value={formData[col.key] || ''}
                    placeholder={(!isNew && col.key === 'password') ? "Leave blank to keep unchanged" : ""}
                    onChange={(e) => handleChange(e, col.key)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Upload Modal ── */
const UploadModal = ({ tabKey, cfg, token, onClose, onSuccess }) => {
  const [file, setFile]               = useState(null);
  const [semester, setSemester]       = useState('');
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [rowErrors, setRowErrors]     = useState([]);
  const [missingCols, setMissingCols] = useState([]);
  const [result, setResult]           = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const reset = () => { setError(''); setRowErrors([]); setMissingCols([]); setResult(null); };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first.'); return; }
    setUploading(true);
    reset();
    const formData = new FormData();
    formData.append('file', file);
    if (semester) {
      formData.append('semester', semester);
    }
    try {
      const res = await axios.post(`${API}/bulk-upload/${cfg.uploadType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      setResult({ message: res.data.message, successCount: res.data.successCount });
      setRowErrors(res.data.errors || []);
      setFile(null);
      const errors = res.data.errors || [];
      if ((res.data.successCount || 0) > 0) {
        if (errors.length === 0) {
          onSuccess(tabKey); // Full success -> close modal
        } else {
          onSuccess(tabKey, null, true); // Partial success -> refresh table but keep modal open to show errors
        }
      }
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Failed to upload. Check your file and try again.');
      setMissingCols(data?.missingColumns || []);
      setRowErrors(data?.errors || []);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <UploadCloud className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Upload {cfg.label} Data</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer rounded-md p-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Info badge */}
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-5">
            <FileSpreadsheet className="h-4 w-4 text-teal-600 flex-shrink-0" />
            <span className="text-sm text-teal-700 font-medium">
              Uploading data for: <span className="font-bold">{cfg.label}</span>
            </span>
          </div>

          {/* Semester Dropdown (Only for students and subjects) */}
          {(cfg.uploadType === 'students' || cfg.uploadType === 'subjects') && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Semester</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm bg-slate-50"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">-- Select Semester --</option>
                <option value="1-1">1-1</option>
                <option value="1-2">1-2</option>
                <option value="2-1">2-1</option>
                <option value="2-2">2-2</option>
                <option value="3-1">3-1</option>
                <option value="3-2">3-2</option>
                <option value="4-1">4-1</option>
                <option value="4-2">4-2</option>
              </select>
            </div>
          )}

          {/* Drop zone */}
          {!result && (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => document.getElementById(`upload-input-${tabKey}`).click()}
            >
              <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to browse or drag &amp; drop</p>
              <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls files</p>
              <input
                id={`upload-input-${tabKey}`}
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => { setFile(e.target.files[0]); reset(); }}
              />
            </div>
          )}

          {/* Selected file chip */}
          {file && !result && (
            <div className="mt-3 flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-100">
              <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
              <span className="truncate font-medium">{file.name}</span>
              <button onClick={() => { setFile(null); reset(); }} className="ml-auto text-slate-400 hover:text-red-500 flex-shrink-0 cursor-pointer rounded-md">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Missing columns */}
          {missingCols.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm font-semibold text-orange-700 mb-2">⚠️ Missing required columns in your Excel file:</p>
              <ul className="space-y-1">
                {missingCols.map((col, i) => (
                  <li key={i} className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-md font-mono">{col}</li>
                ))}
              </ul>
              <p className="text-xs text-orange-500 mt-2">The first row must contain exactly these column headers.</p>
            </div>
          )}

          {/* General error */}
          {error && missingCols.length === 0 && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 flex items-start gap-2">
              <span className="text-red-500 text-base leading-none">✕</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl border ${rowErrors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className={`h-5 w-5 flex-shrink-0 ${rowErrors.length === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                <p className={`text-sm font-semibold ${rowErrors.length === 0 ? 'text-green-700' : 'text-yellow-700'}`}>{result.message}</p>
              </div>
              {rowErrors.length === 0 && (
                <button onClick={onClose} className="mt-2 text-xs text-green-600 hover:underline cursor-pointer rounded-md">Close modal</button>
              )}
            </div>
          )}

          {/* Row-level errors */}
          {rowErrors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-red-700 mb-2">⚠️ {rowErrors.length} row(s) had errors:</p>
              <div className="border border-red-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th className="px-3 py-2 text-left w-16">Row #</th>
                      <th className="px-3 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowErrors.map((e, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-1.5 font-mono text-red-500 font-semibold">{e.row}</td>
                        <td className="px-3 py-1.5 text-slate-700">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold text-white transition-colors ${
                !file || uploading ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-700 hover:bg-teal-800 cursor-pointer'
              }`}
            >
              {uploading && <RefreshCw className="h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading…' : `Upload ${cfg.label}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
/* ── Main Component ── */
const MasterData = () => {
  const [activeTab, setActiveTab]   = useState('colleges');
  const [tableData, setTableData]   = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [modalTab, setModalTab]     = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [addRecord, setAddRecord]   = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [globalMsg, setGlobalMsg]   = useState('');
  const [pages, setPages]           = useState({}); // { students: 1, colleges: 1, … }
  const [searchQuery, setSearchQuery] = useState(''); // Global search state

  const token = localStorage.getItem('token');

  const currentPage = pages[activeTab] || 1;
  const setPage = (p) => setPages(prev => ({ ...prev, [activeTab]: p }));

  const fetchTab = useCallback(async (tab, force = false) => {
    if (!force && tableData[tab]) return;
    setLoadingTab(true);
    try {
      const res = await axios.get(`${API}${TAB_CONFIG[tab].endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter out truly empty records (all key fields blank)
      const cleaned = (res.data || []).filter(row =>
        Object.values(row).some(v => v !== null && v !== undefined && v !== '' && v !== 0)
      );
      // Sort newly created/added records on top
      const sorted = cleaned.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTableData(prev => ({ ...prev, [tab]: sorted }));
    } catch {
      setTableData(prev => ({ ...prev, [tab]: [] }));
    } finally {
      setLoadingTab(false);
    }
  }, [tableData, token]);

  useEffect(() => {
    fetchTab(activeTab);
    setPage(1); // reset page on tab switch
    setSearchQuery(''); // reset search on tab switch
  }, [activeTab]);

  const refreshTab = () => {
    fetchTab(activeTab, true);
    setPage(1);
    setSearchQuery('');
  };

  const handleUploadSuccess = (tab, customMessage, keepModalOpen = false) => {
    fetchTab(tab, true);
    setGlobalMsg(customMessage || `${TAB_CONFIG[tab].label} data uploaded successfully!`);
    if (!keepModalOpen) {
      setModalTab(null);
      setEditRecord(null);
      setAddRecord(false);
    }
    setPages(prev => ({ ...prev, [tab]: 1 }));
    setSearchQuery('');
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(`${API}/record/${activeTab}/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTab(activeTab, true);
      setGlobalMsg('Record deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const cfg       = TAB_CONFIG[activeTab];
  const allRows   = tableData[activeTab] || [];
  
  // Apply Search Filter
  const filteredRows = allRows.filter(row => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    // Check if any of the displayed columns contain the search query
    return cfg.columns.some(col => {
      const val = row[col.key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(lowerQuery);
    });
  });

  const totalRows = filteredRows.length;
  // If search query changes, and current page is out of bounds, pagedRows will just be empty, 
  // but it's better to force page 1 when user types. We'll handle this in the input onChange.
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="px-4 py-6 w-full">

      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Master Data Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">Upload, manage, and edit foundational system data via Excel sheets.</p>
      </div>

      {/* Global success banner */}
      {globalMsg && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center gap-3 text-green-700 text-sm border border-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{globalMsg}</span>
          <button onClick={() => setGlobalMsg('')} className="ml-auto text-green-400 hover:text-green-600 cursor-pointer rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {Object.entries(TAB_CONFIG).map(([id, t]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
              activeTab === id
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-t-0 border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
          <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium">{cfg.label}</span>
            {!loadingTab && (
              <span className="text-xs text-slate-400 ml-1">({totalRows} {searchQuery ? 'matched' : 'records'})</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder={`Search ${cfg.label}...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Go to page 1 when searching
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <svg className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setPage(1); }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={refreshTab}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-200 cursor-pointer flex-shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTab ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setAddRecord(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-teal-700 border border-slate-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Record
            </button>
            {activeTab !== 'evaluators' && (
              <button
                onClick={() => setModalTab(activeTab)}
                className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer flex-shrink-0"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload {cfg.label}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {loadingTab ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mr-3" />
              <span className="text-sm">Loading {cfg.label.toLowerCase()} data…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-10 whitespace-nowrap">#</th>
                  {cfg.columns.filter(col => !col.hideInTable).map(col => (
                    <th key={col.key} className="px-4 py-3 text-left whitespace-nowrap">{col.header}</th>
                  ))}
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={cfg.columns.filter(col => !col.hideInTable).length + 2} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <UploadCloud className="h-10 w-10 mb-3 text-slate-300" />
                        <p className="text-sm font-medium">
                          {searchQuery ? `No matches found for "${searchQuery}".` : `No ${cfg.label.toLowerCase()} records found.`}
                        </p>
                        {!searchQuery && (
                          <p className="text-xs mt-1">
                            Click{' '}
                            <button
                              onClick={() => setModalTab(activeTab)}
                              className="text-teal-600 font-semibold hover:underline cursor-pointer rounded-md"
                            >
                              Upload {cfg.label}
                            </button>{' '}
                            to import records.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, i) => {
                    const globalIndex = (currentPage - 1) * PAGE_SIZE + i;
                    const rowId = row._id || globalIndex;
                    const isExpanded = expandedRows[rowId];
                    return (
                      <React.Fragment key={rowId}>
                        <tr className={`border-b border-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                          <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{globalIndex + 1}</td>
                          {cfg.columns.filter(col => !col.hideInTable).map(col => (
                            <td key={col.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                              {col.render
                                ? col.render(row[col.key])
                                : (row[col.key] ?? <span className="text-slate-300">—</span>)
                              }
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {activeTab === 'papers' && (
                              <button
                                onClick={() => setExpandedRows(prev => ({...prev, [rowId]: !prev[rowId]}))}
                                className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50 mr-1"
                                title={isExpanded ? "Hide Details" : "View Details"}
                              >
                                {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => setEditRecord(row)}
                              className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50 mr-1"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row._id)}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && activeTab === 'papers' && Array.isArray(row.subjectIds) && (
                          <tr className="bg-slate-100/50 border-b border-slate-200">
                            <td colSpan={cfg.columns.length + 2} className="px-4 py-3">
                              <div className="flex flex-wrap gap-2 pl-14">
                                {row.subjectIds.map((v, idx) => (
                                  <span key={idx} className="text-[11px] leading-tight bg-white text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200 shadow-sm">
                                    <span className="font-bold text-teal-700">{v.subCode}</span> &nbsp;&mdash;&nbsp; {v.subName}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loadingTab && allRows.length > PAGE_SIZE && (
          <div className="flex-shrink-0">
            <Pagination total={totalRows} page={currentPage} onPage={setPage} />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {modalTab && (
        <UploadModal
          tabKey={modalTab}
          cfg={TAB_CONFIG[modalTab]}
          token={token}
          onClose={() => setModalTab(null)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Edit/Add Modal */}
      {(editRecord || addRecord) && (
        <RecordModal
          record={editRecord}
          cfg={TAB_CONFIG[activeTab]}
          tabKey={activeTab}
          token={token}
          onClose={() => { setEditRecord(null); setAddRecord(false); }}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default MasterData;
