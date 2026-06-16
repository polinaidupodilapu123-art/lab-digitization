const bosService = require('../services/bosService');
const activityLogService = require('../services/admin/activityLogService');

exports.getPendingPrincipals = async (req, res) => {
  try {
    const result = await bosService.getPendingPrincipals();
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.approvePrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const result = await bosService.approvePrincipal(id, note);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'APPROVE_PRINCIPAL',
      entityId: id,
      entityType: 'User',
      details: { note, description: `Approved principal registration for principal ${id}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: 'Principal registration approved successfully.', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.rejectPrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const result = await bosService.rejectPrincipal(id, note);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'REJECT_PRINCIPAL',
      entityId: id,
      entityType: 'User',
      details: { note, description: `Rejected principal registration for principal ${id}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: 'Principal registration rejected successfully.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getEvaluatedRecords = async (req, res) => {
  try {
    const result = await bosService.getEvaluatedRecords();
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.approveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bosService.approveRecord(id);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'APPROVE_RECORD',
      entityId: id,
      entityType: 'Assignment',
      details: { description: `Approved evaluated record ${id}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: 'Record approved successfully.', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.approveAllRecords = async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await bosService.approveAllRecords(mode);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'APPROVE_ALL_RECORDS',
      details: { description: `Approved all evaluated records for mode: ${mode}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: `All ${mode} records approved successfully.`, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getEvaluatedPapers = async (req, res) => {
  try {
    const result = await bosService.getEvaluatedPapers();
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.approvePaper = async (req, res) => {
  try {
    const { studentId, paperId, mode } = req.body;
    const result = await bosService.approvePaper(studentId, paperId, mode);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'APPROVE_PAPER',
      entityId: paperId,
      entityType: 'Paper',
      details: { description: `Approved paper ${paperId} for student ${studentId} (${mode})` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: 'Paper approved successfully.', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.approveAllPapers = async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await bosService.approveAllPapers(mode);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'APPROVE_ALL_PAPERS',
      details: { description: `Approved all papers for mode: ${mode}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ success: true, message: `All ${mode} papers approved successfully.`, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
