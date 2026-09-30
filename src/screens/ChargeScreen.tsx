import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { CURRENCY } from '../config/stripe';
import { createDirectChargePaymentIntent } from '../api/stripe';

function dollarsToCents(dollars: string): number {
  const value = Number.parseFloat(dollars);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export default function ChargeScreen() {
  const [locationId, setLocationId] = useState('tml_GrgNpgwceMg2b7');
  const [amount, setAmount] = useState('10.00');
  const [applicationFee, setApplicationFee] = useState('1.00');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [useSimulatedReader, setUseSimulatedReader] = useState(false);
  const discoveryMethodRef = useRef<'appsOnDevices' | 'internet'>(
    'appsOnDevices',
  );
  const connectingRef = useRef(false);

  const appendLog = useCallback((line: string) => {
    console.log(`[TerminalDemo] ${line}`);
    setLog(prev => [...prev, line]);
  }, []);

  const {
    initialize,
    discoverReaders,
    connectReader,
    retrievePaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: async readers => {
      if (readers.length === 0 || readerConnected) {
        return;
      }
      appendLog(`Discovered ${readers.length} reader(s), connecting…`);
      const { reader, error } =
        discoveryMethodRef.current === 'appsOnDevices'
          ? await connectReader({
              discoveryMethod: 'appsOnDevices',
              reader: readers[0],
            })
          : await connectReader({
              discoveryMethod: 'internet',
              reader: readers[0],
            });
      if (error) {
        appendLog(`Connect error: ${error.message}`);
        return;
      }
      appendLog(`Connected to reader: ${reader?.serialNumber ?? 'simulated'}`);
      setReaderConnected(true);
    },
  });

  const connectToReader = useCallback(async () => {
    if (connectingRef.current) {
      appendLog('Ignoring re-entrant connect call (already connecting).');
      return;
    }
    connectingRef.current = true;
    setBusy(true);
    setReaderConnected(false);
    appendLog('Initializing Terminal SDK…');
    const { error: initError } = await initialize();
    if (initError) {
      appendLog(`Initialize error: ${initError.message}`);
      setBusy(false);
      connectingRef.current = false;
      return;
    }

    discoveryMethodRef.current = useSimulatedReader
      ? 'internet'
      : 'appsOnDevices';
    appendLog(
      useSimulatedReader
        ? 'Discovering simulated reader…'
        : 'Discovering local reader (apps on devices)…',
    );
    const { error: discoverError } = await discoverReaders(
      useSimulatedReader
        ? {
            discoveryMethod: 'internet',
            simulated: true,
            locationId: locationId.startsWith('tml_') ? locationId : undefined,
          }
        : { discoveryMethod: 'appsOnDevices' },
    );
    if (discoverError) {
      appendLog(`Discover error: ${discoverError.message}`);
    }
    setBusy(false);
    connectingRef.current = false;
  }, [initialize, discoverReaders, locationId, useSimulatedReader, appendLog]);

  const chargeWithDirectConnectFee = useCallback(async () => {
    if (!readerConnected) {
      appendLog('Connect a reader first.');
      return;
    }
    setBusy(true);

    appendLog('Creating PaymentIntent on the client (direct charge)…');
    let created;
    try {
      created = await createDirectChargePaymentIntent({
        amount: dollarsToCents(amount),
        currency: CURRENCY,
        applicationFeeAmount: dollarsToCents(applicationFee),
      });
    } catch (e) {
      appendLog(`Create PaymentIntent error: ${(e as Error).message}`);
      setBusy(false);
      return;
    }
    appendLog(`Created PaymentIntent ${created.id}`);

    const { paymentIntent, error: retrieveError } = await retrievePaymentIntent(
      created.clientSecret,
    );
    if (retrieveError || !paymentIntent) {
      appendLog(`Retrieve PaymentIntent error: ${retrieveError?.message}`);
      setBusy(false);
      return;
    }

    appendLog('Collecting payment method…');
    const { paymentIntent: collected, error: collectError } =
      await collectPaymentMethod({ paymentIntent });
    if (collectError || !collected) {
      appendLog(`Collect error: ${collectError?.message}`);
      setBusy(false);
      return;
    }

    appendLog('Confirming PaymentIntent…');
    const { paymentIntent: confirmed, error: confirmError } =
      await confirmPaymentIntent({ paymentIntent: collected });
    if (confirmError || !confirmed) {
      appendLog(`Confirm error: ${confirmError?.message}`);
      setBusy(false);
      return;
    }

    appendLog(`Charge ${confirmed.status}: ${confirmed.id}`);
    setBusy(false);
  }, [
    readerConnected,
    amount,
    applicationFee,
    retrievePaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    appendLog,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stripe Terminal · Connect Direct Charge</Text>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Use simulated reader (emulator testing)</Text>
        <Switch value={useSimulatedReader} onValueChange={setUseSimulatedReader} />
      </View>

      <Text style={styles.label}>Reader location ID (optional if already registered)</Text>
      <TextInput
        style={styles.input}
        value={locationId}
        onChangeText={setLocationId}
        placeholder="tml_1234"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Charge amount (USD)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Application fee (USD)</Text>
      <TextInput
        style={styles.input}
        value={applicationFee}
        onChangeText={setApplicationFee}
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        style={[styles.button, readerConnected && styles.buttonSecondary]}
        onPress={connectToReader}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {readerConnected
            ? 'Reader connected ✓'
            : useSimulatedReader
            ? 'Connect simulated reader'
            : 'Connect local reader (apps on devices)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !readerConnected && styles.buttonDisabled]}
        onPress={chargeWithDirectConnectFee}
        disabled={busy || !readerConnected}
      >
        <Text style={styles.buttonText}>Charge</Text>
      </TouchableOpacity>

      {busy && <ActivityIndicator style={styles.spinner} />}

      <View style={styles.logContainer}>
        {log.map((line, index) => (
          <Text key={index} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#635bff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonSecondary: {
    backgroundColor: '#0a8a3f',
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  spinner: {
    marginTop: 16,
  },
  logContainer: {
    marginTop: 24,
  },
  logLine: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
});
