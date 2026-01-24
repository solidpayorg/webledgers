---
name: webledgers
description: Maps URIs to balances for distributed ledger systems using JSON-LD. Use when querying balances across platforms, managing web-based ledgers, or working with URI-to-balance mappings.
---

# webledgers

URI-to-Balance mapping system for distributed ledgers, enabling cross-platform value transfer.

## When to Use

Invoke when you need to:
- Query balances for URIs (GitHub profiles, Bitcoin addresses, DIDs)
- Create or manage web-based ledgers
- Map identifiers to numerical balances
- Work with JSON-LD ledger documents
- Track balances across heterogeneous systems

## Quick Start

```bash
# Install globally
npm install -g webledgers

# Create a new ledger
webledgers create

# Add an entry
webledgers add

# View balances
webledgers balance

# Validate a ledger
webledgers validate ledger.json
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `webledgers create` | Interactive wizard to create a ledger |
| `webledgers add` | Add URI-balance entries |
| `webledgers balance` | Display balances in table format |
| `webledgers validate <file>` | Validate ledger structure |
| `webledgers interactive` | Full interactive mode |
| `webledgers --help` | Show all commands |

## Examples

**Example 1: Create a ledger**

```bash
webledgers create
# Follow wizard prompts
```

Output: `ledger.json` with JSON-LD structure

**Example 2: Ledger structure**

```json
{
  "@context": "https://w3id.org/webledgers",
  "type": "WebLedger",
  "name": "My Ledger",
  "defaultCurrency": "satoshi",
  "entries": [
    {
      "type": "Entry",
      "url": "https://github.com/user#this",
      "amount": "100000"
    }
  ]
}
```

**Example 3: Multi-currency entry**

```json
{
  "url": "did:nostr:abc123...",
  "amount": [
    { "currency": "satoshi", "value": "50000" },
    { "currency": "USD", "value": "25.00" }
  ]
}
```

## Supported URI Schemes

- `https://` - Web profiles, WebID
- `mailto:` - Email addresses
- `tel:` - Phone numbers
- `bitcoin:` - Bitcoin addresses
- `did:nostr:` - Nostr DIDs
- `urn:voucher:` - Custom vouchers
- Any valid URI scheme

## API Reference

### `WebLedger` class

```javascript
import { WebLedger } from 'webledgers';

const ledger = new WebLedger({
  name: 'My Ledger',
  defaultCurrency: 'satoshi'
});

ledger.addEntry('https://github.com/user#this', '100000');
const json = ledger.toJSON();
```

### Key methods

- `addEntry(url, amount)` - Add URI-balance mapping
- `getBalance(url)` - Get balance for URI
- `validate()` - Validate ledger structure
- `toJSON()` - Export as JSON-LD

## References

- [Specification](https://solidpayorg.github.io/webledgers/)
- [GitHub](https://github.com/solidpayorg/webledgers)
- [npm](https://www.npmjs.com/package/webledgers)
