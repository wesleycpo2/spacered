/**
 * CONFIGURAÇÃO DO JWT
 * 
 * Define tempos de expiração e secrets para os tokens
 */

export const jwtConfig = {
  // Access Token (curta duração - 15 minutos)
  accessToken: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: '15m', // 15 minutos
  },
  
  // Refresh Token (longa duração - 7 dias)
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    expiresIn: '7d', // 7 dias
  },
};
