const moduleNameMapper = {
  '^@/assets/(.*)$': '<rootDir>/assets/$1',
  '^@/(.*)$': '<rootDir>/src/$1',
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      moduleNameMapper,
      testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|lucide-react-native|react-native-svg|react-native-qrcode-svg)',
      ],
    },
    {
      // Testes de integração contra um Supabase local real (`npx supabase start`).
      displayName: 'db',
      preset: 'jest-expo/node',
      moduleNameMapper,
      testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/supabase/tests/setup.ts'],
    },
  ],
};
