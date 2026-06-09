import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';

const ReallocateModal = ({ assignment, onClose, onSuccess }) => {
  const [evaluators, setEvaluators] = useState([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState('');
  const [valuationDeadline, setValuationDeadline] = useState(
    assignment.valuationDeadline ? new Date(assignment.valuationDeadline).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvaluators = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/evaluators`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setEvaluators(res.data);
      } catch (err) {
        setError('Failed to fetch evaluators');
      } finally {
        setLoading(false);
      }
    };
    fetchEvaluators();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvaluator && !valuationDeadline) {
      setError('Please select an evaluator or set a new deadline');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = { assignmentId: assignment._id };
      if (selectedEvaluator) payload.newEvaluatorId = selectedEvaluator;
      if (valuationDeadline) payload.valuationDeadline = valuationDeadline;

      await axios.post(
        `${API_BASE_URL}/api/admin/reallocate-evaluator`,
        payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onSuccess(selectedEvaluator ? 'Assignment successfully re-allocated!' : 'Deadline successfully updated!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-allocate');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 text-white">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Manage Allocation</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer p-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h4 className="block text-sm font-semibold text-slate-700 mb-1.5">Student</h4>
            <p className="text-base text-teal-800 font-medium">{assignment.studentId?.fullName} ({assignment.studentId?.regdNo})</p>
          </div>
          <div>
            <h4 className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</h4>
            <p className="text-base text-slate-800">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select New Evaluator</label>
            {loading ? (
              <p className="text-sm text-slate-500">Loading evaluators...</p>
            ) : (
              <select
                value={selectedEvaluator}
                onChange={(e) => setSelectedEvaluator(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="">-- Keep Current Evaluator --</option>
                {evaluators.map(ev => (
                  <option key={ev._id} value={ev._id} disabled={ev._id === assignment.evaluatorId}>
                    {ev.fullName} ({ev.regdNo}) {ev._id === assignment.evaluatorId ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Evaluation Deadline (Optional)</label>
            <input
              type="date"
              value={valuationDeadline}
              onChange={(e) => setValuationDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm bg-white"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading || (!selectedEvaluator && !valuationDeadline)}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReallocateModal;
