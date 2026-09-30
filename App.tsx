/**
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import ChargeScreen from './src/screens/ChargeScreen';
import { fetchConnectionToken } from './src/api/stripe';

function App() {
  return (
    <SafeAreaProvider>
      <StripeTerminalProvider tokenProvider={fetchConnectionToken}>
        <ChargeScreen />
      </StripeTerminalProvider>
    </SafeAreaProvider>
  );
}

export default App;
