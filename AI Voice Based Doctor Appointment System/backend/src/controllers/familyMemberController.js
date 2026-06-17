const prisma = require('../models/prismaClient');

exports.getFamilyMembers = async (req, res) => {
  try {
    const patientId = req.user.id;
    const members = await prisma.familyMember.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
};

exports.addFamilyMember = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { name, relation, age, gender } = req.body;
    
    if (!name || !relation || !age) {
      return res.status(400).json({ error: 'Name, relation, and age are required' });
    }

    const member = await prisma.familyMember.create({
      data: {
        patientId,
        name,
        relation,
        age: parseInt(age, 10),
        gender
      }
    });
    
    res.status(201).json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add family member' });
  }
};

exports.deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    // Verify ownership
    const member = await prisma.familyMember.findUnique({ where: { id } });
    if (!member || member.patientId !== patientId) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    await prisma.familyMember.delete({ where: { id } });
    res.json({ message: 'Family member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
};
