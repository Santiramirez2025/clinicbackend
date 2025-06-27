
// ============================================================================
// BEAUTY POINTS ROUTES - ✨ SISTEMA DE FIDELIZACIÓN
// ============================================================================

// GET /api/beauty-points - Resumen de puntos
app.get('/api/beauty-points', authenticateToken, (req, res) => {
    // Version demo simplificada
    const user = DEMO_USER;
    const pointsMultiplier = user.vipStatus ? 2 : 1;
    
    res.json({
      success: true,
      data: {
        currentPoints: user.beautyPoints,
        vipMultiplier: pointsMultiplier,
        level: {
          current: Math.floor(user.beautyPoints / 100),
          pointsToNext: 100 - (user.beautyPoints % 100),
          nextLevelPoints: Math.ceil(user.beautyPoints / 100) * 100 + 100
        },
        history: [
          {
            date: '2025-06-01',
            treatment: 'Ritual Purificante', 
            pointsEarned: user.vipStatus ? 100 : 50,
            iconName: 'sparkles'
          },
          {
            date: '2025-05-15',
            treatment: 'Drenaje Relajante',
            pointsEarned: user.vipStatus ? 140 : 70,
            iconName: 'waves'
          }
        ],
        availableRewards: [
          {
            id: 'discount_10',
            name: 'Descuento 10%',
            description: 'Descuento en tu próximo tratamiento', 
            pointsCost: 100,
            isAvailable: user.beautyPoints >= 100
          },
          {
            id: 'facial_free',
            name: 'Facial Gratuito',
            description: 'Limpieza facial básica sin costo',
            pointsCost: 250,
            isAvailable: user.beautyPoints >= 250
          }
        ],
        nextRewards: [
          {
            id: 'premium_treatment',
            name: 'Tratamiento Premium',
            pointsCost: 500,
            isAvailable: false
          }
        ]
      }
    });
  });
  
  // POST /api/beauty-points/redeem - Canjear recompensa  
  app.post('/api/beauty-points/redeem', authenticateToken, (req, res) => {
    const { rewardId } = req.body;
    
    const rewards = {
      'discount_10': { name: 'Descuento 10%', cost: 100 },
      'facial_free': { name: 'Facial Gratuito', cost: 250 }
    };
    
    const reward = rewards[rewardId];
    if (!reward) {
      return res.status(400).json({
        success: false,
        error: { message: 'Recompensa no válida' }
      });
    }
    
    if (DEMO_USER.beautyPoints < reward.cost) {
      return res.status(400).json({
        success: false, 
        error: { message: 'Puntos insuficientes' }
      });
    }
    
    // Simular descuento de puntos
    DEMO_USER.beautyPoints -= reward.cost;
    
    res.json({
      success: true,
      message: `¡Recompensa canjeada exitosamente! 🎉`,
      data: {
        redemption: {
          id: `redemption_${Date.now()}`,
          rewardName: reward.name,
          pointsUsed: reward.cost,
          redeemedAt: new Date()
        },
        remainingPoints: DEMO_USER.beautyPoints
      }
    });
  });