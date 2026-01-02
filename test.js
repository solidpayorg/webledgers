#!/usr/bin/env node

/**
 * WebLedgers Test Suite
 * Tests for urn:local: URI normalization and core functionality
 */

const { WebLedger, createLedger, loadLedger } = require('./index.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, msg = '') {
  try {
    fn();
    throw new Error(`${msg} Expected function to throw`);
  } catch (e) {
    if (e.message.includes('Expected function to throw')) throw e;
  }
}

console.log('\n=== WebLedgers Test Suite ===\n');

// ============================================
// normalizeURI() tests
// ============================================
console.log('--- normalizeURI() ---');

test('bare name gets urn:local: prefix', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('treasury'), 'urn:local:treasury');
});

test('name with colon looks like URI scheme - unchanged', () => {
  const ledger = new WebLedger();
  // db:primary matches URI pattern (scheme:path), so it's not prefixed
  assertEqual(ledger.normalizeURI('db:primary'), 'db:primary');
});

test('name without colon gets prefix', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('primary'), 'urn:local:primary');
});

test('did: URI unchanged', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('did:nostr:abc123'), 'did:nostr:abc123');
});

test('urn:local: URI unchanged', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('urn:local:foo'), 'urn:local:foo');
});

test('urn:webledger: URI unchanged', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('urn:webledger:pool:sats:GSAT'), 'urn:webledger:pool:sats:GSAT');
});

test('https: URI unchanged', () => {
  const ledger = new WebLedger();
  assertEqual(ledger.normalizeURI('https://example.com/user/1'), 'https://example.com/user/1');
});

test('empty string throws', () => {
  const ledger = new WebLedger();
  assertThrows(() => ledger.normalizeURI(''));
});

test('null throws', () => {
  const ledger = new WebLedger();
  assertThrows(() => ledger.normalizeURI(null));
});

test('undefined throws', () => {
  const ledger = new WebLedger();
  assertThrows(() => ledger.normalizeURI(undefined));
});

// ============================================
// setBalance() with normalization
// ============================================
console.log('\n--- setBalance() with normalization ---');

test('setBalance with bare name creates urn:local: entry', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('treasury', '1000000');
  const entry = ledger.getEntry('urn:local:treasury');
  assertEqual(entry.url, 'urn:local:treasury');
  assertEqual(entry.amount, '1000000');
});

test('setBalance with full URI works', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('did:nostr:abc', '500');
  const entry = ledger.getEntry('did:nostr:abc');
  assertEqual(entry.url, 'did:nostr:abc');
  assertEqual(entry.amount, '500');
});

test('setBalance updates existing urn:local: entry', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('treasury', '1000');
  ledger.setBalance('treasury', '2000');
  const entry = ledger.getEntry('urn:local:treasury');
  assertEqual(entry.amount, '2000');
  assertEqual(ledger.entries.length, 1);
});

// ============================================
// deposit() with normalization
// ============================================
console.log('\n--- deposit() with normalization ---');

test('deposit with bare name creates urn:local: entry', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.deposit('myaccount', '100');
  const entry = ledger.getEntry('urn:local:myaccount');
  assertEqual(entry.url, 'urn:local:myaccount');
  assertEqual(entry.amount, '100');
});

test('deposit increments existing balance', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('myaccount', '100');
  ledger.deposit('myaccount', '50');
  const balance = ledger.getBalance('urn:local:myaccount');
  assertEqual(balance, '150');
});

// ============================================
// withdraw() with normalization
// ============================================
console.log('\n--- withdraw() with normalization ---');

test('withdraw with bare name works', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('treasury', '1000');
  ledger.withdraw('treasury', '300');
  const balance = ledger.getBalance('urn:local:treasury');
  assertEqual(balance, '700');
});

test('withdraw throws on insufficient balance', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.setBalance('treasury', '100');
  assertThrows(() => ledger.withdraw('treasury', '500'));
});

// ============================================
// addEntry() with normalization
// ============================================
console.log('\n--- addEntry() with normalization ---');

test('addEntry with bare name creates urn:local: entry', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.addEntry('pool', '5000');
  const entry = ledger.getEntry('urn:local:pool');
  assertEqual(entry.url, 'urn:local:pool');
});

// ============================================
// Loading ledger with bare names
// ============================================
console.log('\n--- Loading ledger with bare names ---');

test('loadLedger accepts entries with bare names', () => {
  const data = {
    '@context': 'https://w3id.org/webledgers',
    type: 'WebLedger',
    defaultCurrency: 'GSAT',
    entries: [
      { type: 'Entry', url: 'amm', amount: '1000' },
      { type: 'Entry', url: 'treasury', amount: '5000' }
    ]
  };
  const ledger = loadLedger(data);
  assertEqual(ledger.entries.length, 2);
});

test('loadLedger accepts entries with urn:local: URIs', () => {
  const data = {
    '@context': 'https://w3id.org/webledgers',
    type: 'WebLedger',
    defaultCurrency: 'GSAT',
    entries: [
      { type: 'Entry', url: 'urn:local:amm', amount: '1000' }
    ]
  };
  const ledger = loadLedger(data);
  assertEqual(ledger.entries[0].url, 'urn:local:amm');
});

// ============================================
// Validation
// ============================================
console.log('\n--- Validation ---');

test('validate accepts bare name entries', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.entries.push({ type: 'Entry', url: 'treasury', amount: '1000' });
  const result = ledger.validate();
  assertEqual(result.isValid, true);
});

test('validate rejects empty url', () => {
  const ledger = new WebLedger({ defaultCurrency: 'GSAT' });
  ledger.entries.push({ type: 'Entry', url: '', amount: '1000' });
  const result = ledger.validate();
  assertEqual(result.isValid, false);
});

// ============================================
// Multi-currency with normalization
// ============================================
console.log('\n--- Multi-currency ---');

test('setBalance with non-default currency', () => {
  const ledger = new WebLedger({ defaultCurrency: 'satoshi' });
  ledger.setBalance('treasury', '1000', 'GSAT');
  const balance = ledger.getBalance('urn:local:treasury', 'GSAT');
  assertEqual(balance, '1000');
});

// ============================================
// Results
// ============================================
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);
