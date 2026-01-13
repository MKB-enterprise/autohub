import '@testing-library/jest-dom'

// Para testes unitários/API (não de componentes React)
// Apenas setup básico sem mocks de router/navigation

// Setup env vars para testes
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-change-in-production'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/autohub_test'

