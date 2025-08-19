// ============================================================================
// src/routes/professional.routes.js - Professionals API Routes
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

const prisma = new PrismaClient();

// ============================================================================
// GET /api/professionals - Get all active professionals
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { clinicId, specialtyId } = req.query;
    
    const where = {
      isActive: true,
      ...(clinicId && { clinicId }),
      ...(specialtyId && { 
        specialties: {
          some: { id: specialtyId }
        }
      })
    };

    const professionals = await prisma.professional.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rating: true,
        isActive: true,
        isAvailable: true,
        profileImageUrl: true,
        specialties: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { firstName: 'asc' }
      ]
    });

    // Format for frontend compatibility
    const formattedProfessionals = professionals.map(prof => ({
      ...prof,
      name: `${prof.firstName} ${prof.lastName}`,
      specialties: prof.specialties.map(s => s.name)
    }));

    res.json({
      success: true,
      data: formattedProfessionals,
      total: formattedProfessionals.length
    });

  } catch (error) {
    console.error('❌ Error fetching professionals:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error retrieving professionals' }
    });
  }
});

// ============================================================================
// GET /api/professionals/:id - Get professional details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await prisma.professional.findFirst({
      where: { 
        id,
        isActive: true 
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rating: true,
        isActive: true,
        isAvailable: true,
        profileImageUrl: true,
        bio: true,
        specialties: {
          select: {
            id: true,
            name: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        error: { message: 'Professional not found' }
      });
    }

    // Format for frontend
    const formattedProfessional = {
      ...professional,
      name: `${professional.firstName} ${professional.lastName}`,
      specialties: professional.specialties.map(s => s.name)
    };

    res.json({
      success: true,
      data: formattedProfessional
    });

  } catch (error) {
    console.error('❌ Error fetching professional:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error retrieving professional details' }
    });
  }
});

module.exports = router;