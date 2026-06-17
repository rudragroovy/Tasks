const express = require('express');
const router = express.Router();
const familyMemberController = require('../controllers/familyMemberController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', familyMemberController.getFamilyMembers);
router.post('/', familyMemberController.addFamilyMember);
router.delete('/:id', familyMemberController.deleteFamilyMember);

module.exports = router;
