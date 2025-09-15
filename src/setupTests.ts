import '@testing-library/jest-dom';

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web'
  }
}));

jest.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: jest.fn().mockImplementation(() => ({
    checkConnectionsConsistency: jest.fn().mockResolvedValue({ result: true }),
    isConnection: jest.fn().mockResolvedValue({ result: false }),
    createConnection: jest.fn().mockResolvedValue({
      open: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ values: [] }),
      close: jest.fn().mockResolvedValue(undefined)
    }),
    closeConnection: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock do Network
jest.mock('@capacitor/network', () => ({
  Network: {
    getStatus: jest.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() })
  }
}));