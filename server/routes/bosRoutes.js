const express = require('express');
const router = express.Router();
const bosController = require('../controllers/bosController');
const { protect } = require('../middleware/authMiddleware');

// Middleware to restrict access strictly to BOS role
const bosOnly = (req, res, next) => {
  if (req.user && req.user.role === 'BOS') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Access restricted to Board of Studies (BOS).' });
  }
};

router.use(protect, bosOnly);

router.get('/pending-principals', bosController.getPendingPrincipals);
router.post('/approve-principal/:id', bosController.approvePrincipal);
router.post('/reject-principal/:id', bosController.rejectPrincipal);

router.get('/evaluated-records', bosController.getEvaluatedRecords);
router.post('/approve-record/:id', bosController.approveRecord);
router.post('/approve-all-records', bosController.approveAllRecords);
router.get('/evaluated-papers', bosController.getEvaluatedPapers);
router.post('/approve-paper', bosController.approvePaper);
router.post('/approve-all-papers', bosController.approveAllPapers);

module.exports = router;
