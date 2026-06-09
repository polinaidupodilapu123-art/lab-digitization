const ActivityLog = require('../../models/ActivityLog');

exports.logActivity = async ({ userId, userRole, actionType, entityId, entityType, details }) => {
  try {
    const log = new ActivityLog({
      userId,
      userRole,
      actionType,
      entityId,
      entityType,
      details
    });
    await log.save();
  } catch (err) {
    console.error('Failed to save activity log:', err.message);
  }
};

exports.getLogs = async (query = {}, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const logs = await ActivityLog.find(query)
    .populate('userId', 'fullName role regdNo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
  const total = await ActivityLog.countDocuments(query);
  return { logs, total };
};
