/**
 * Web Ledgers 0.1.2 - JavaScript Implementation
 * Provides lifecycle functions for Web Ledgers as defined in the specification
 */

const crypto = require('crypto');
const { URL } = require('url');

/**
 * WebLedger class representing a complete ledger with metadata and entries
 */
class WebLedger {
  constructor (options = {}) {
    this['@context'] = options.context || 'https://w3id.org/webledgers';
    this.type = 'WebLedger';
    this.id = options.id || null;
    this.name = options.name || null;
    this.description = options.description || null;
    this.created = options.created || Math.floor(Date.now() / 1000);
    this.updated = options.updated || Math.floor(Date.now() / 1000);
    this.defaultCurrency = options.defaultCurrency || 'satoshi';
    this.entries = options.entries || [];
  }

  /**
   * Add a new entry to the ledger
   * @param {string} url - URI identifier
   * @param {string|Array} amount - Balance amount (string for default currency, array for multi-currency)
   * @returns {Entry} The created entry
   */
  addEntry (url, amount) {
    if (!this.isValidURI(url)) {
      throw new Error('Invalid URI provided');
    }

    const entry = new Entry(url, amount);

    // Check if entry already exists and update instead
    const existingIndex = this.entries.findIndex(e => e.url === url);
    if (existingIndex !== -1) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }

    this.updated = Math.floor(Date.now() / 1000);
    return entry;
  }

  /**
   * Remove an entry from the ledger
   * @param {string} url - URI identifier to remove
   * @returns {boolean} True if entry was removed, false if not found
   */
  removeEntry (url) {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(entry => entry.url !== url);

    if (this.entries.length < initialLength) {
      this.updated = Math.floor(Date.now() / 1000);
      return true;
    }
    return false;
  }

  /**
   * Get an entry by URI
   * @param {string} url - URI identifier
   * @returns {Entry|null} The entry or null if not found
   */
  getEntry (url) {
    return this.entries.find(entry => entry.url === url) || null;
  }

  /**
   * Get the balance for a specific URI and currency
   * @param {string} url - URI identifier
   * @param {string} currency - Currency code (optional, defaults to ledger's defaultCurrency)
   * @returns {string|null} Balance amount or null if not found
   */
  getBalance (url, currency = null) {
    const entry = this.getEntry(url);
    if (!entry) return null;

    const targetCurrency = currency || this.defaultCurrency;

    if (typeof entry.amount === 'string') {
      return targetCurrency === this.defaultCurrency ? entry.amount : null;
    }

    if (Array.isArray(entry.amount)) {
      const currencyEntry = entry.amount.find(a => a.currency === targetCurrency);
      return currencyEntry ? currencyEntry.value : null;
    }

    return null;
  }

  /**
   * Update the balance for a specific URI
   * @param {string} url - URI identifier
   * @param {string|Array} amount - New balance amount
   * @returns {Entry|null} Updated entry or null if not found
   */
  updateBalance (url, amount) {
    const entry = this.getEntry(url);
    if (!entry) return null;

    entry.amount = amount;
    this.updated = Math.floor(Date.now() / 1000);
    return entry;
  }

  /**
   * Calculate total balance for a specific currency
   * @param {string} currency - Currency code (optional, defaults to defaultCurrency)
   * @returns {string} Total balance as string
   */
  getTotalBalance (currency = null) {
    const targetCurrency = currency || this.defaultCurrency;
    let total = 0;

    for (const entry of this.entries) {
      const balance = this.getBalance(entry.url, targetCurrency);
      if (balance) {
        total += parseInt(balance, 10);
      }
    }

    return total.toString();
  }

  /**
   * Get count of entries in the ledger
   * @returns {number} Number of entries
   */
  getEntryCount () {
    return this.entries.length;
  }

  /**
   * Validate the ledger structure and all entries
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate () {
    const errors = [];

    // Validate required fields
    if (!this.type || this.type !== 'WebLedger') {
      errors.push('Invalid or missing type field');
    }

    if (!this['@context']) {
      errors.push('Missing @context field');
    }

    if (!Array.isArray(this.entries)) {
      errors.push('Entries must be an array');
    } else {
      // Validate each entry
      this.entries.forEach((entry, index) => {
        const entryValidation = entry.validate ? entry.validate() : this.validateEntry(entry);
        if (!entryValidation.isValid) {
          errors.push(`Entry ${index}: ${entryValidation.errors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single entry object
   * @param {Object} entry - Entry to validate
   * @returns {Object} Validation result
   */
  validateEntry (entry) {
    const errors = [];

    if (!entry.type || entry.type !== 'Entry') {
      errors.push('Invalid or missing type field');
    }

    if (!entry.url || !this.isValidURI(entry.url)) {
      errors.push('Invalid or missing URL field');
    }

    if (!entry.amount) {
      errors.push('Missing amount field');
    } else if (typeof entry.amount === 'string') {
      if (!/^\d+$/.test(entry.amount)) {
        errors.push('String amount must contain only digits');
      }
    } else if (Array.isArray(entry.amount)) {
      entry.amount.forEach((currencyEntry, index) => {
        if (!currencyEntry.currency || typeof currencyEntry.currency !== 'string') {
          errors.push(`Currency entry ${index}: invalid currency field`);
        }
        if (!currencyEntry.value || !/^\d+(\.\d+)?$/.test(currencyEntry.value)) {
          errors.push(`Currency entry ${index}: invalid value field`);
        }
      });
    } else {
      errors.push('Amount must be a string or array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URI
   * @param {string} uri - URI to validate
   * @returns {boolean} True if valid URI
   */
  isValidURI (uri) {
    try {
      new URL(uri);
      return true;
    } catch {
      // Handle special URI schemes that URL constructor might not support
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri);
    }
  }

  /**
   * Serialize the ledger to JSON-LD format
   * @param {boolean} pretty - Whether to pretty-print the JSON
   * @returns {string} JSON-LD representation
   */
  toJSON (pretty = false) {
    const obj = {
      '@context': this['@context'],
      type: this.type,
      ...(this.id && { id: this.id }),
      ...(this.name && { name: this.name }),
      ...(this.description && { description: this.description }),
      created: this.created,
      updated: this.updated,
      defaultCurrency: this.defaultCurrency,
      entries: this.entries
    };

    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  }

  /**
   * Merge another ledger into this one
   * @param {WebLedger} otherLedger - Ledger to merge
   * @param {string} conflictStrategy - 'replace', 'add', or 'skip' for conflicts
   * @returns {WebLedger} This ledger for chaining
   */
  merge (otherLedger, conflictStrategy = 'replace') {
    if (!(otherLedger instanceof WebLedger)) {
      throw new Error('Can only merge with another WebLedger instance');
    }

    for (const entry of otherLedger.entries) {
      const existing = this.getEntry(entry.url);

      if (!existing) {
        this.entries.push(new Entry(entry.url, entry.amount));
      } else if (conflictStrategy === 'replace') {
        this.updateBalance(entry.url, entry.amount);
      } else if (conflictStrategy === 'add') {
        // Add amounts together (only works for same currency)
        const existingBalance = parseInt(this.getBalance(entry.url) || '0', 10);
        const newBalance = parseInt(this.getBalance(entry.url) || '0', 10);
        this.updateBalance(entry.url, (existingBalance + newBalance).toString());
      }
      // 'skip' strategy does nothing for conflicts
    }

    this.updated = Math.floor(Date.now() / 1000);
    return this;
  }

  /**
   * Find entries matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching entries
   */
  findEntries (criteria = {}) {
    return this.entries.filter(entry => {
      if (criteria.url && !entry.url.includes(criteria.url)) return false;
      if (criteria.minAmount) {
        const balance = this.getBalance(entry.url, criteria.currency);
        if (!balance || parseInt(balance, 10) < parseInt(criteria.minAmount, 10)) return false;
      }
      if (criteria.maxAmount) {
        const balance = this.getBalance(entry.url, criteria.currency);
        if (!balance || parseInt(balance, 10) > parseInt(criteria.maxAmount, 10)) return false;
      }
      return true;
    });
  }
}

/**
 * Entry class representing a single URI-to-balance mapping
 */
class Entry {
  constructor (url, amount) {
    this.type = 'Entry';
    this.url = url;
    this.amount = amount;
  }

  /**
   * Validate this entry
   * @returns {Object} Validation result
   */
  validate () {
    const ledger = new WebLedger(); // Temporary instance for validation method
    return ledger.validateEntry(this);
  }

  /**
   * Get balance for a specific currency
   * @param {string} currency - Currency code
   * @param {string} defaultCurrency - Default currency if amount is string
   * @returns {string|null} Balance or null if currency not found
   */
  getBalance (currency, defaultCurrency = 'satoshi') {
    if (typeof this.amount === 'string') {
      return currency === defaultCurrency ? this.amount : null;
    }

    if (Array.isArray(this.amount)) {
      const currencyEntry = this.amount.find(a => a.currency === currency);
      return currencyEntry ? currencyEntry.value : null;
    }

    return null;
  }
}

/**
 * Factory functions and utilities
 */

/**
 * Create a new Web Ledger
 * @param {Object} options - Ledger configuration
 * @returns {WebLedger} New ledger instance
 */
function createLedger (options = {}) {
  return new WebLedger(options);
}

/**
 * Load a ledger from JSON-LD data
 * @param {string|Object} data - JSON string or parsed object
 * @returns {WebLedger} Loaded ledger instance
 */
function loadLedger (data) {
  const obj = typeof data === 'string' ? JSON.parse(data) : data;

  if (obj.type !== 'WebLedger') {
    throw new Error('Invalid ledger format: missing or incorrect type');
  }

  const ledger = new WebLedger({
    context: obj['@context'],
    id: obj.id,
    name: obj.name,
    description: obj.description,
    created: obj.created,
    updated: obj.updated,
    defaultCurrency: obj.defaultCurrency
  });

  // Add entries
  if (obj.entries && Array.isArray(obj.entries)) {
    for (const entryData of obj.entries) {
      ledger.addEntry(entryData.url, entryData.amount);
    }
  }

  return ledger;
}

/**
 * Load ledger from URI (for compatibility with existing function)
 * @param {string} uri - URI to load from
 * @returns {WebLedger|null} Loaded ledger or null if error
 */
function getLedger (uri) {
  try {
    const data = require(uri);
    return loadLedger(data);
  } catch (e) {
    return null;
  }
}

/**
 * Get raw ledger data (for compatibility with existing function)
 * @param {string} uri - URI to load from
 * @returns {Object|null} Raw ledger data or null if error
 */
function getRawLedger (uri) {
  try {
    return require(uri);
  } catch (e) {
    return null;
  }
}

/**
 * Validate Web Ledger data without creating instance
 * @param {Object} data - Raw ledger data
 * @returns {Object} Validation result
 */
function validateLedgerData (data) {
  try {
    const ledger = loadLedger(data);
    return ledger.validate();
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message]
    };
  }
}

/**
 * Generate a unique ledger ID
 * @returns {string} Unique identifier
 */
function generateLedgerId () {
  return crypto.randomBytes(16).toString('hex');
}

// Export classes and functions
module.exports = {
  WebLedger,
  Entry,
  createLedger,
  loadLedger,
  getLedger,
  getRawLedger,
  validateLedgerData,
  generateLedgerId
};
