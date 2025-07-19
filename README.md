# Web Ledgers

[![Version](https://img.shields.io/npm/v/webledgers.svg)](https://www.npmjs.com/package/webledgers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**URI-to-Balance Mapping System for Distributed Ledgers**

Web Ledgers provides a standardized method for mapping Uniform Resource Identifiers (URIs) to numerical balances on the web, enabling distributed ledger systems that transcend platform boundaries.

## 🎯 Overview

Web Ledgers enable seamless value transfer between heterogeneous systems including:

- Social platforms (GitHub, Twitter, YouTube)
- Blockchain networks (Bitcoin addresses, transaction outputs)
- Communication protocols (email, phone)
- Decentralized identity systems (WebID, Nostr DIDs)
- Custom applications (gaming, reputation, carbon credits)

## 🚀 Key Features

- **Universal Identifiers**: Uses URIs for cross-platform compatibility
- **Multi-Currency Support**: Flexible amount formats for different currencies
- **JSON-LD Compliance**: Structured data with semantic web compatibility
- **Interactive CLI**: Beautiful command-line interface with wizards
- **Well-Known Convention**: Follows RFC 5785 for standard file locations
- **Validation System**: Comprehensive validation with warnings and errors
- **Extensible Format**: Support for custom currencies and metadata

## 📦 Installation

```bash
npm install webledgers
```

For global CLI access:

```bash
npm install -g webledgers
```

## 🏗️ Core Concepts

### Web Ledger Structure

A Web Ledger is a JSON-LD document that maps URIs to balances:

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "id": "https://example.com/ledger/1",
  "name": "Universal Web Credits",
  "description": "Cross-platform ledger for web credits",
  "defaultCurrency": "satoshi",
  "created": 1705276800,
  "updated": 1705316200,
  "entries": [
    {
      "type": "Entry",
      "url": "https://github.com/user#this",
      "amount": "100000"
    },
    {
      "type": "Entry",
      "url": "did:nostr:de7ecd1e2976a6adb2ffa5f4db81a7d812c8bb6698aa00dcf1e76adb55efd645",
      "amount": [
        { "currency": "satoshi", "value": "50000" },
        { "currency": "USD", "value": "25.00" }
      ]
    }
  ]
}
```

### Amount Formats

**Simple String Format** (single currency):

```json
{
  "url": "https://github.com/user#this",
  "amount": "100000"
}
```

**Multi-Currency Array Format**:

```json
{
  "url": "https://example.com/profile#me",
  "amount": [
    { "currency": "satoshi", "value": "50000" },
    { "currency": "USD", "value": "25.00" },
    { "currency": "points", "value": "1000" }
  ]
}
```

### Well-Known Directory Convention

Web Ledgers follow RFC 5785 well-known URI conventions:

```
project/
├── .well-known/
│   └── webledgers/
│       └── webledgers.json    ← Default location
├── cli.js
├── index.js
└── package.json
```

## 🎨 Command Line Interface

### Quick Start

```bash
# Interactive mode - full featured workflow
webledgers interactive

# Create a new ledger
webledgers create

# Add entries to existing ledger
webledgers add

# View all balances
webledgers balance

# Query specific balance interactively
webledgers query

# Show complete ledger with metadata
webledgers show

# Validate ledger structure
webledgers validate
```

### Command Reference

#### `webledgers create [options]`

Create a new ledger with interactive wizard.

**Options:**

- `-o, --output <file>` - Output file (default: `.well-known/webledgers/webledgers.json`)

**Example:**

```bash
webledgers create -o my-ledger.json
```

#### `webledgers add [file] [options]`

Add entries to an existing ledger.

**Arguments:**

- `file` - Ledger file path (optional, defaults to well-known location)

**Options:**

- `-f, --file <file>` - Ledger file path

**Example:**

```bash
webledgers add
webledgers add my-ledger.json
```

#### `webledgers balance [file] [options]`

Display all balances in the ledger.

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path
- `-c, --currency <currency>` - Filter by specific currency

**Examples:**

```bash
webledgers balance                    # Show all balances
webledgers balance -c USD            # Show only USD balances
webledgers balance my-ledger.json    # Use specific file
```

#### `webledgers query [file] [options]`

Interactive balance query for specific URI.

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path

**Example:**

```bash
webledgers query
```

#### `webledgers show [file] [options]`

Display complete ledger contents with metadata.

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path
- `-c, --currency <currency>` - Currency for totals display

**Example:**

```bash
webledgers show -c satoshi
```

#### `webledgers validate [file] [options]`

Validate ledger structure and data.

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path

**Example:**

```bash
webledgers validate
```

#### `webledgers total [file] [options]`

Calculate total balances by currency.

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path
- `-c, --currency <currency>` - Specific currency (shows all if not specified)

**Examples:**

```bash
webledgers total              # Show all currency totals
webledgers total -c USD       # Show USD total only
```

#### `webledgers search [file] [options]`

Search entries by criteria (interactive if no criteria specified).

**Arguments:**

- `file` - Ledger file path (optional)

**Options:**

- `-f, --file <file>` - Ledger file path
- `--url <pattern>` - URL pattern to search for
- `--min-amount <amount>` - Minimum amount
- `--max-amount <amount>` - Maximum amount
- `-c, --currency <currency>` - Currency for amount filters

**Examples:**

```bash
webledgers search                                    # Interactive search
webledgers search --url "github"                    # Find GitHub entries
webledgers search --min-amount "1000" -c satoshi    # Find entries with >1000 satoshi
```

#### `webledgers merge [options]`

Merge two ledgers.

**Options:**

- `-a, --first <file>` - First ledger file (default: well-known path)
- `-b, --second <file>` - Second ledger file (required)
- `-o, --output <file>` - Output file (default: well-known path)
- `-s, --strategy <strategy>` - Conflict strategy: `replace`|`add`|`skip` (default: `replace`)

**Example:**

```bash
webledgers merge -b other-ledger.json -s add
```

#### `webledgers interactive`

Full interactive mode with guided workflows.

**Alias:** `webledgers i`

**Example:**

```bash
webledgers interactive
```

## 📚 JavaScript API

### Basic Usage

```javascript
const { WebLedger, createLedger, loadLedger } = require('webledgers')

// Create a new ledger
const ledger = createLedger({
  name: 'My Ledger',
  description: 'A ledger for tracking web credits',
  defaultCurrency: 'satoshi'
})

// Add entries
ledger.addEntry('https://github.com/user#this', '100000')
ledger.addEntry('mailto:user@example.com', [
  { currency: 'USD', value: '50.00' },
  { currency: 'points', value: '1000' }
])

// Query balances
const balance = ledger.getBalance('https://github.com/user#this')
console.log(balance) // "100000"

const usdBalance = ledger.getBalance('mailto:user@example.com', 'USD')
console.log(usdBalance) // "50.00"

// Get totals
const totalSatoshi = ledger.getTotalBalance('satoshi')
const totalUSD = ledger.getTotalBalance('USD')

// Validate
const validation = ledger.validate()
if (validation.isValid) {
  console.log('✅ Ledger is valid')
} else {
  console.log('❌ Validation errors:', validation.errors)
}

// Save to JSON-LD
const jsonData = ledger.toJSON(true) // pretty printed
```

### WebLedger Class Methods

#### Constructor

```javascript
const ledger = new WebLedger(options)
```

**Options:**

- `context` - JSON-LD context URI
- `id` - Ledger identifier URI
- `name` - Human-readable ledger name
- `description` - Ledger description
- `defaultCurrency` - Default currency code
- `created` - Creation timestamp
- `updated` - Last update timestamp

#### Entry Management

```javascript
// Add or update entry
const entry = ledger.addEntry(uri, amount)

// Remove entry
const removed = ledger.removeEntry(uri)

// Get specific entry
const entry = ledger.getEntry(uri)

// Update balance
const updated = ledger.updateBalance(uri, newAmount)
```

#### Querying

```javascript
// Get balance for specific currency
const balance = ledger.getBalance(uri, currency)

// Get total for currency
const total = ledger.getTotalBalance(currency)

// Count entries
const count = ledger.getEntryCount()

// Find entries by criteria
const results = ledger.findEntries({
  url: 'github',
  minAmount: '1000',
  currency: 'satoshi'
})
```

#### Validation

```javascript
// Validate entire ledger
const validation = ledger.validate()
// Returns: { isValid: boolean, errors: string[], warnings: string[] }

// Validate single entry
const entryValidation = ledger.validateEntry(entry)
```

#### Serialization

```javascript
// Export to JSON-LD
const json = ledger.toJSON(pretty)

// Load from data
const ledger = loadLedger(jsonData)
```

#### Ledger Operations

```javascript
// Merge with another ledger
ledger.merge(otherLedger, 'replace') // 'replace', 'add', or 'skip'

// URI validation
const isValid = ledger.isValidURI(uri)
```

### Utility Functions

```javascript
const {
  createLedger,
  loadLedger,
  validateLedgerData,
  generateLedgerId
} = require('webledgers')

// Create new ledger
const ledger = createLedger(options)

// Load from JSON data
const ledger = loadLedger(jsonData)

// Validate without creating instance
const validation = validateLedgerData(rawData)

// Generate unique ID
const id = generateLedgerId()
```

## 🌍 Use Cases & Examples

### Social Platform Credits

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "Social Platform Credits",
  "defaultCurrency": "points",
  "entries": [
    {
      "type": "Entry",
      "url": "https://github.com/alice#this",
      "amount": "2500"
    },
    {
      "type": "Entry",
      "url": "https://twitter.com/bob#this",
      "amount": "1200"
    }
  ]
}
```

### Gaming Rewards

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "Gaming Tournament Rewards",
  "defaultCurrency": "coins",
  "entries": [
    {
      "type": "Entry",
      "url": "did:nostr:abc123...",
      "amount": [
        { "currency": "coins", "value": "1000" },
        { "currency": "gems", "value": "50" }
      ]
    }
  ]
}
```

### Cryptocurrency Tracking

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "Bitcoin Holdings",
  "defaultCurrency": "satoshi",
  "entries": [
    {
      "type": "Entry",
      "url": "bitcoin:1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g",
      "amount": "2100000"
    },
    {
      "type": "Entry",
      "url": "txo:btc:f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16:0",
      "amount": "5000000000"
    }
  ]
}
```

### Reputation System

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "Developer Reputation",
  "defaultCurrency": "reputation-points",
  "entries": [
    {
      "type": "Entry",
      "url": "https://github.com/developer#this",
      "amount": "8500"
    },
    {
      "type": "Entry",
      "url": "mailto:dev@example.com",
      "amount": "6200"
    }
  ]
}
```

### Educational Credits

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "Course Credits",
  "defaultCurrency": "credit-hours",
  "entries": [
    {
      "type": "Entry",
      "url": "mailto:student@university.edu",
      "amount": "120"
    }
  ]
}
```

## 🔧 Validation

Web Ledgers include comprehensive validation with both errors and warnings:

### Validation Levels

**Errors** (prevent ledger from being valid):

- Missing required fields (`entries` array)
- Invalid URI formats
- Malformed amount values
- Invalid currency objects

**Warnings** (recommended but not required):

- Missing `@context` field
- Missing `type` field
- Missing entry type fields

### Example Validation Output

```bash
✅ Ledger is valid!
⚠️  Warnings:
  • Missing @context field (recommended for JSON-LD compliance)
  • Entry 0: Missing or invalid type field (recommended for JSON-LD compliance)
```

## 🌐 Supported URI Schemes

Web Ledgers support any valid URI scheme, including:

- **HTTP/HTTPS**: `https://example.com/profile#me`
- **WebID**: `https://person.example.com/card#i`
- **Email**: `mailto:user@example.com`
- **Phone**: `tel:+15550123456`
- **Bitcoin**: `bitcoin:1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g`
- **Nostr DID**: `did:nostr:abc123...`
- **Custom URNs**: `urn:voucher:xyz789`
- **Social Platforms**: `https://github.com/user#this`

## 🏛️ Architecture

### Core Components

1. **WebLedger Class** - Main ledger management
2. **Entry Class** - Individual URI-balance mappings
3. **CLI Tool** - Interactive command-line interface
4. **Validation System** - Comprehensive structure validation
5. **Serialization** - JSON-LD export/import

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JSON-LD       │    │   WebLedger     │    │   CLI/API       │
│   Data          │◄──►│   Instance      │◄──►│   Interface     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File System   │    │   Validation    │    │   User Input    │
│   Storage       │    │   System        │    │   Wizards       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚦 Getting Started

### 1. Install Web Ledgers

```bash
npm install -g webledgers
```

### 2. Create Your First Ledger

```bash
webledgers create
```

Follow the interactive wizard to set up your ledger.

### 3. Add Some Entries

```bash
webledgers add
```

Use the entry wizard to add URI-balance mappings.

### 4. View Your Balances

```bash
webledgers balance
```

See all balances in a beautiful table format.

### 5. Explore More Commands

```bash
webledgers --help
```

## 📖 Specification

The complete Web Ledgers specification is available at:
**https://solidpayorg.github.io/webledgers/**

The specification defines:

- JSON-LD data models
- Serialization formats
- Interoperability guidelines
- URI scheme support
- Multi-currency handling

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** with tests
4. **Run validation**: `npm test`
5. **Commit changes**: `git commit -m "Add feature"`
6. **Push to branch**: `git push origin feature-name`
7. **Create Pull Request**

### Development Setup

```bash
git clone https://github.com/solidpayorg/webledgers.git
cd webledgers
npm install
./cli.js --help
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Homepage**: https://solidpayorg.github.io/webledgers/
- **Repository**: https://github.com/solidpayorg/webledgers
- **Issues**: https://github.com/solidpayorg/webledgers/issues
- **NPM Package**: https://www.npmjs.com/package/webledgers

## 👥 Community

- **Discussions**: GitHub Discussions
- **Issues**: GitHub Issues
- **W3C Community**: [Web Payments Community Group](https://www.w3.org/community/webpayments/)

---

**Web Ledgers** - Making the web a ledger, one URI at a time. 🌐💰
