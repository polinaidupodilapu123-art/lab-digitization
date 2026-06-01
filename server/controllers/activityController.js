const activityLogService = require('../services/admin/activityLogService');
const AppError = require('../utils/appError');

exports.getLogs = async (req, res) => {
  try {
    const { actionType, entityType, page = 1, limit = 50 } = req.query;
    const query = {};

    // Filter by role/user if not SYSTEM_ADMIN
    if (req.user.role !== 'SYSTEM_ADMIN') {
      // By default non-system admins can only see their own logs, OR we could allow them to see specific logs.
      // But the requirement said: "system admin can see every log". For Principal/Evaluator, they see their own?
      query.userId = req.user._id;
    }

    if (actionType) {
      query.actionType = { $in: actionType.split(',') };
    }
    
    if (req.user.role !== 'SYSTEM_ADMIN' && req.user.role !== 'ADMIN') {
      if (query.actionType && query.actionType.$in) {
        query.actionType.$in = query.actionType.$in.filter(type => type !== 'EXPORT_EXCEL');
      } else {
        query.actionType = { ...query.actionType, $ne: 'EXPORT_EXCEL' };
      }
    }

    if (entityType) {
      query.entityType = entityType;
    }

    // "show upto completing the 2 semesters" -> This might be complex depending on current semester, 
    // but the query filter handles the system admin vs user logic. We can restrict by date as a fallback (e.g., last 1 year)
    // if needed. For now, fetching all relevant for the user.

    const result = await activityLogService.getLogs(query, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.logFrontendActivity = async (req, res) => {
  try {
    const { actionType, details, entityId, entityType } = req.body;
    
    if (!actionType) {
      throw new AppError('Action type is required', 400);
    }

    await activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType,
      entityId,
      entityType,
      details
    });

    res.json({ message: 'Activity logged successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
