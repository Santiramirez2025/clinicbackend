const express = require('express');
const { body } = require('express-validator');
const { verifyClinicToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Controlador placeholder para clínicas
const ClinicController = {
  async getDashboard(req, res) {
    res.json({
      success: true,
      message: 'Clinic dashboard endpoint - En desarrollo',
      data: {
        clinic: req.clinic,
        appointments: [],
        revenue: 0,
        patients: 0
      }
    });
  }
};
