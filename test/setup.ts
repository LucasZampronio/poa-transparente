import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock de variáveis globais se necessário
global.fetch = jest.fn() as any;
