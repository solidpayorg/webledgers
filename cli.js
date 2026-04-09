#!/usr/bin/env node

/**
 * Web Ledgers CLI
 * Interactive command-line interface for Web Ledgers
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { Command } = require('commander');
const ora = require('ora');
const Table = require('cli-table3');
const figlet = require('figlet');
const { version } = require('./package.json');

// Import our Web Ledgers library
const {
  WebLedger,
  Entry,
  createLedger,
  loadLedger,
  validateLedgerData,
  generateLedgerId
} = require('./index.js');

const program = new Command();

// Default paths following RFC 5785 well-known URI conventions
const DEFAULT_LEDGER_PATH = '.well-known/webledgers/webledgers.json';

// CLI Configuration
program
  .name('webledgers')
  .description('Web Ledgers CLI - Manage URI-to-balance mappings')
  .version(version);

/**
 * Display the welcome banner
 */
function displayBanner () {
  console.log(chalk.cyan(figlet.textSync('Web Ledgers', { horizontalLayout: 'fitted' })));
  console.log(chalk.gray(`URI-to-Balance Mapping System v${version}`));
  console.log(chalk.gray(`Default location: ${DEFAULT_LEDGER_PATH}\n`));
}

/**
 * Pretty print a ledger in table format
 */
function displayLedger (ledger, currency = null) {
  const targetCurrency = currency || ledger.defaultCurrency;

  // Metadata table
  const metaTable = new Table({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    colWidths: [20, 50]
  });

  metaTable.push(
    ['Name', ledger.name || chalk.gray('(unnamed)')],
    ['Description', ledger.description || chalk.gray('(no description)')],
    ['ID', ledger.id || chalk.gray('(no id)')],
    ['Default Currency', chalk.yellow(ledger.defaultCurrency)],
    ['Created', new Date(ledger.created * 1000).toLocaleString()],
    ['Updated', new Date(ledger.updated * 1000).toLocaleString()],
    ['Entries', chalk.green(ledger.getEntryCount())],
    ['Total (' + targetCurrency + ')', chalk.green(ledger.getTotalBalance(targetCurrency))]
  );

  console.log(chalk.cyan('\n📊 Ledger Information:'));
  console.log(metaTable.toString());

  // Entries table
  if (ledger.entries.length > 0) {
    const entriesTable = new Table({
      head: [chalk.cyan('URI'), chalk.cyan('Amount'), chalk.cyan('Currency')],
      colWidths: [50, 15, 15]
    });

    ledger.entries.forEach(entry => {
      if (typeof entry.amount === 'string') {
        entriesTable.push([
          entry.url,
          chalk.green(entry.amount),
          chalk.yellow(ledger.defaultCurrency)
        ]);
      } else if (Array.isArray(entry.amount)) {
        entry.amount.forEach((currencyEntry, index) => {
          entriesTable.push([
            index === 0 ? entry.url : '',
            chalk.green(currencyEntry.value),
            chalk.yellow(currencyEntry.currency)
          ]);
        });
      }
    });

    console.log(chalk.cyan('\n💰 Entries:'));
    console.log(entriesTable.toString());
  } else {
    console.log(chalk.yellow('\n📭 No entries in this ledger'));
  }
}

/**
 * Save ledger to file with pretty formatting
 */
function saveLedger (ledger, filename) {
  const spinner = ora(`Saving ledger to ${filename}`).start();

  try {
    // Create directory structure if it doesn't exist
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonData = ledger.toJSON(true);
    fs.writeFileSync(filename, jsonData, 'utf8');
    spinner.succeed(chalk.green(`Ledger saved to ${filename}`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to save ledger: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Load ledger from file
 */
function loadLedgerFromFile (filename) {
  const spinner = ora(`Loading ledger from ${filename}`).start();

  try {
    if (!fs.existsSync(filename)) {
      spinner.fail(chalk.red(`File not found: ${filename}`));
      process.exit(1);
    }

    const data = fs.readFileSync(filename, 'utf8');
    
    // Handle empty file - create new ledger with defaults
    if (!data || data.trim() === '') {
      spinner.info(chalk.yellow(`Empty file found, creating new ledger`));
      const ledger = createLedger({
        name: 'Web Ledger',
        defaultCurrency: 'btc',
        id: `urn:ledger:${generateLedgerId()}`
      });
      return ledger;
    }

    const ledger = loadLedger(JSON.parse(data));
    spinner.succeed(chalk.green(`Ledger loaded from ${filename}`));
    return ledger;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to load ledger: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Interactive ledger creation wizard
 */
async function createLedgerWizard () {
  console.log(chalk.cyan('\n🧙‍♂️ Ledger Creation Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.yellow('What is the name of your ledger?'),
      validate: input => input.length > 0 || 'Name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: chalk.yellow('Provide a description (optional):')
    },
    {
      type: 'list',
      name: 'defaultCurrency',
      message: chalk.yellow('Choose default currency:'),
      choices: [
        { name: '₿ Bitcoin (btc)', value: 'btc' },
        { name: '₿ Bitcoin (satoshi)', value: 'satoshi' },
        { name: '💵 US Dollar (USD)', value: 'USD' },
        { name: '💶 Euro (EUR)', value: 'EUR' },
        { name: '🏆 Points', value: 'points' },
        { name: '⭐ Reputation', value: 'reputation-points' },
        { name: '🌱 Carbon Credits (tCO2e)', value: 'tCO2e' },
        { name: '🎓 Credits', value: 'credit-hours' },
        { name: '🔧 Custom...', value: 'custom' }
      ]
    },
    {
      type: 'input',
      name: 'customCurrency',
      message: chalk.yellow('Enter custom currency name:'),
      when: answers => answers.defaultCurrency === 'custom',
      validate: input => input.length > 0 || 'Currency name is required'
    },
    {
      type: 'confirm',
      name: 'generateId',
      message: chalk.yellow('Generate a unique ID for this ledger?'),
      default: true
    }
  ]);

  const currency = answers.defaultCurrency === 'custom' ? answers.customCurrency : answers.defaultCurrency;

  const ledger = createLedger({
    name: answers.name,
    description: answers.description || undefined,
    defaultCurrency: currency,
    id: answers.generateId ? `urn:ledger:${generateLedgerId()}` : undefined
  });

  console.log(chalk.green('\n✅ Ledger created successfully!'));
  return ledger;
}

/**
 * Interactive entry addition wizard
 */
async function addEntryWizard (ledger) {
  console.log(chalk.cyan('\n➕ Add Entry Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: chalk.yellow('Enter the URI:'),
      validate: input => {
        if (!input.length) return 'URI is required';
        try {
          return ledger.isValidURI(input) || 'Invalid URI format';
        } catch {
          return 'Invalid URI format';
        }
      }
    },
    {
      type: 'list',
      name: 'amountType',
      message: chalk.yellow('How do you want to specify the amount?'),
      choices: [
        { name: `Simple amount in ${ledger.defaultCurrency}`, value: 'simple' },
        { name: 'Multi-currency amount', value: 'multi' }
      ]
    },
    {
      type: 'input',
      name: 'simpleAmount',
      message: chalk.yellow(`Enter amount in ${ledger.defaultCurrency}:`),
      when: answers => answers.amountType === 'simple',
      validate: input => /^\d+$/.test(input) || 'Amount must be a positive integer'
    }
  ]);

  let amount;

  if (answers.amountType === 'simple') {
    amount = answers.simpleAmount;
  } else {
    // Multi-currency wizard
    const currencies = [];
    let addMore = true;

    while (addMore) {
      const currencyAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'currency',
          message: chalk.yellow(`Currency ${currencies.length + 1} - Enter currency code:`),
          validate: input => input.length > 0 || 'Currency code is required'
        },
        {
          type: 'input',
          name: 'value',
          message: chalk.yellow('Enter amount:'),
          validate: input => /^\d+(\.\d+)?$/.test(input) || 'Amount must be a positive number'
        }
      ]);

      currencies.push({
        currency: currencyAnswer.currency,
        value: currencyAnswer.value
      });

      const continueAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.yellow('Add another currency?'),
          default: false
        }
      ]);

      addMore = continueAnswer.continue;
    }

    amount = currencies;
  }

  try {
    const entry = ledger.addEntry(answers.url, amount);
    console.log(chalk.green('\n✅ Entry added successfully!'));

    // Show the added entry
    const entryTable = new Table({
      head: [chalk.cyan('Property'), chalk.cyan('Value')]
    });

    entryTable.push(
      ['URI', entry.url],
      ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
    );

    console.log(entryTable.toString());
    return entry;
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to add entry: ${error.message}`));
  }
}

/**
 * Interactive wizard for depositing to balance
 */
async function depositWizard (ledger) {
  console.log(chalk.cyan('\n💰 Deposit Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: chalk.yellow('Enter the URI:'),
      validate: input => {
        if (!input.length) return 'URI is required';
        try {
          return ledger.isValidURI(input) || 'Invalid URI format';
        } catch {
          return 'Invalid URI format';
        }
      }
    },
    {
      type: 'input',
      name: 'amount',
      message: chalk.yellow('Enter the deposit amount:'),
      validate: input => /^\d+(\.\d+)?$/.test(input) || 'Amount must be a positive number'
    },
    {
      type: 'input',
      name: 'currency',
      message: chalk.yellow(`Enter currency (leave empty for default: ${ledger.defaultCurrency}):`),
      default: ''
    }
  ]);

  const currency = answers.currency.trim() || null;

  try {
    const entry = ledger.deposit(answers.url, answers.amount, currency);
    console.log(chalk.green('\n✅ Deposit successful!'));

    // Show the updated entry
    const entryTable = new Table({
      head: [chalk.cyan('Property'), chalk.cyan('Value')]
    });

    entryTable.push(
      ['URI', entry.url],
      ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
    );

    console.log(entryTable.toString());
    return entry;
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to deposit: ${error.message}`));
    throw error;
  }
}

/**
 * Interactive wizard for withdrawing from balance
 */
async function withdrawWizard (ledger) {
  console.log(chalk.cyan('\n💸 Withdraw Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: chalk.yellow('Enter the URI:'),
      validate: input => {
        if (!input.length) return 'URI is required';
        try {
          return ledger.isValidURI(input) || 'Invalid URI format';
        } catch {
          return 'Invalid URI format';
        }
      }
    },
    {
      type: 'input',
      name: 'amount',
      message: chalk.yellow('Enter the withdrawal amount:'),
      validate: input => /^\d+(\.\d+)?$/.test(input) || 'Amount must be a positive number'
    },
    {
      type: 'input',
      name: 'currency',
      message: chalk.yellow(`Enter currency (leave empty for default: ${ledger.defaultCurrency}):`),
      default: ''
    }
  ]);

  const currency = answers.currency.trim() || null;

  try {
    const entry = ledger.withdraw(answers.url, answers.amount, currency);
    console.log(chalk.green('\n✅ Withdrawal successful!'));

    // Show the updated entry
    const entryTable = new Table({
      head: [chalk.cyan('Property'), chalk.cyan('Value')]
    });

    entryTable.push(
      ['URI', entry.url],
      ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
    );

    console.log(entryTable.toString());
    return entry;
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to withdraw: ${error.message}`));
    throw error;
  }
}

/**
 * Interactive wizard for setting balance
 */
async function setBalanceWizard (ledger) {
  console.log(chalk.cyan('\n⚖️  Set Balance Wizard\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: chalk.yellow('Enter the URI:'),
      validate: input => {
        if (!input.length) return 'URI is required';
        try {
          return ledger.isValidURI(input) || 'Invalid URI format';
        } catch {
          return 'Invalid URI format';
        }
      }
    },
    {
      type: 'input',
      name: 'amount',
      message: chalk.yellow('Enter the amount:'),
      validate: input => /^\d+(\.\d+)?$/.test(input) || 'Amount must be a positive number'
    },
    {
      type: 'input',
      name: 'currency',
      message: chalk.yellow(`Enter currency (leave empty for default: ${ledger.defaultCurrency}):`),
      default: ''
    }
  ]);

  const currency = answers.currency.trim() || null;

  try {
    const entry = ledger.setBalance(answers.url, answers.amount, currency);
    console.log(chalk.green('\n✅ Balance set successfully!'));

    // Show the updated entry
    const entryTable = new Table({
      head: [chalk.cyan('Property'), chalk.cyan('Value')]
    });

    entryTable.push(
      ['URI', entry.url],
      ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
    );

    console.log(entryTable.toString());
    return entry;
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to set balance: ${error.message}`));
    throw error;
  }
}

/**
 * Interactive balance query wizard
 */
async function queryBalanceWizard (ledger) {
  console.log(chalk.cyan('\n🔍 Balance Query Wizard\n'));

  const uris = ledger.entries.map(entry => entry.url);

  if (uris.length === 0) {
    console.log(chalk.yellow('No entries in this ledger to query.'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'url',
      message: chalk.yellow('Select URI to query:'),
      choices: uris
    },
    {
      type: 'input',
      name: 'currency',
      message: chalk.yellow(`Currency (default: ${ledger.defaultCurrency}):`),
      default: ledger.defaultCurrency
    }
  ]);

  const balance = ledger.getBalance(answers.url, answers.currency);

  if (balance !== null) {
    console.log(chalk.green(`\n💰 Balance: ${balance} ${answers.currency}`));
  } else {
    console.log(chalk.red(`\n❌ No balance found for ${answers.currency}`));
  }
}

/**
 * Validation display with colors
 */
function displayValidation (validation) {
  if (validation.isValid) {
    console.log(chalk.green('\n✅ Ledger is valid!'));
  } else {
    console.log(chalk.red('\n❌ Ledger validation failed:'));
    validation.errors.forEach(error => {
      console.log(chalk.red(`  • ${error}`));
    });
  }

  // Display warnings if any
  if (validation.warnings && validation.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    validation.warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`));
    });
  }
}

// CLI Commands

program
  .command('create')
  .description('Create a new ledger (interactive wizard)')
  .option('-o, --output <file>', `output file (default: ${DEFAULT_LEDGER_PATH})`)
  .action(async (options) => {
    displayBanner();
    const ledger = await createLedgerWizard();

    const filename = options.output || DEFAULT_LEDGER_PATH;
    saveLedger(ledger, filename);

    console.log(chalk.cyan('\nLedger preview:'));
    displayLedger(ledger);
  });

program
  .command('add')
  .description('Add entries to an existing ledger')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .action(async (options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    let addMore = true;
    while (addMore) {
      await addEntryWizard(ledger);

      const continueAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.yellow('Add another entry?'),
          default: false
        }
      ]);

      addMore = continueAnswer.continue;
    }

    saveLedger(ledger, filename);
    console.log(chalk.cyan('\nUpdated ledger:'));
    displayLedger(ledger);
  });

program
  .command('deposit [uri] [amount] [currency]')
  .description('Deposit (increment) balance for a specific URI')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-u, --uri <uri>', 'URI to deposit to')
  .option('-a, --amount <amount>', 'deposit amount')
  .option('-c, --currency <currency>', 'currency (optional, uses ledger default if not specified)')
  .action(async (uri, amount, currency, options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    // Use command line arguments if provided, otherwise use options, otherwise interactive
    const targetUri = uri || options.uri;
    const targetAmount = amount || options.amount;
    const targetCurrency = currency || options.currency || null;

    if (targetUri && targetAmount) {
      // Non-interactive mode
      try {
        // Normalize URI (auto-prefix bare names with urn:local:)
        const normalizedUri = ledger.normalizeURI(targetUri);

        if (!/^\d+(\.\d+)?$/.test(targetAmount)) {
          console.log(chalk.red('❌ Amount must be a positive number'));
          process.exit(1);
        }

        const entry = ledger.deposit(normalizedUri, targetAmount, targetCurrency);
        console.log(chalk.green(`✅ Deposited ${targetAmount} ${targetCurrency || ledger.defaultCurrency} to ${normalizedUri}`));

        // Show the updated entry
        const entryTable = new Table({
          head: [chalk.cyan('Property'), chalk.cyan('Value')]
        });

        entryTable.push(
          ['URI', entry.url],
          ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
        );

        console.log(entryTable.toString());
      } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
      }
    } else {
      // Interactive mode
      await depositWizard(ledger);
    }

    saveLedger(ledger, filename);
    console.log(chalk.cyan('\nUpdated ledger:'));
    displayLedger(ledger);
  });

program
  .command('withdraw [uri] [amount] [currency]')
  .description('Withdraw (decrement) balance for a specific URI')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-u, --uri <uri>', 'URI to withdraw from')
  .option('-a, --amount <amount>', 'withdrawal amount')
  .option('-c, --currency <currency>', 'currency (optional, uses ledger default if not specified)')
  .action(async (uri, amount, currency, options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    // Use command line arguments if provided, otherwise use options, otherwise interactive
    const targetUri = uri || options.uri;
    const targetAmount = amount || options.amount;
    const targetCurrency = currency || options.currency || null;

    if (targetUri && targetAmount) {
      // Non-interactive mode
      try {
        // Normalize URI (auto-prefix bare names with urn:local:)
        const normalizedUri = ledger.normalizeURI(targetUri);

        if (!/^\d+(\.\d+)?$/.test(targetAmount)) {
          console.log(chalk.red('❌ Amount must be a positive number'));
          process.exit(1);
        }

        const entry = ledger.withdraw(normalizedUri, targetAmount, targetCurrency);
        console.log(chalk.green(`✅ Withdrew ${targetAmount} ${targetCurrency || ledger.defaultCurrency} from ${normalizedUri}`));

        // Show the updated entry
        const entryTable = new Table({
          head: [chalk.cyan('Property'), chalk.cyan('Value')]
        });

        entryTable.push(
          ['URI', entry.url],
          ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
        );

        console.log(entryTable.toString());
      } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
      }
    } else {
      // Interactive mode
      await withdrawWizard(ledger);
    }

    saveLedger(ledger, filename);
    console.log(chalk.cyan('\nUpdated ledger:'));
    displayLedger(ledger);
  });

program
  .command('set-balance [uri] [amount] [currency]')
  .description('Set balance for a specific URI')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-u, --uri <uri>', 'URI to set balance for')
  .option('-a, --amount <amount>', 'balance amount')
  .option('-c, --currency <currency>', 'currency (optional, uses ledger default if not specified)')
  .action(async (uri, amount, currency, options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    // Use command line arguments if provided, otherwise use options, otherwise interactive
    const targetUri = uri || options.uri;
    const targetAmount = amount || options.amount;
    const targetCurrency = currency || options.currency || null;

    if (targetUri && targetAmount) {
      // Non-interactive mode
      try {
        // Normalize URI (auto-prefix bare names with urn:local:)
        const normalizedUri = ledger.normalizeURI(targetUri);

        if (!/^\d+(\.\d+)?$/.test(targetAmount)) {
          console.log(chalk.red('❌ Amount must be a positive number'));
          process.exit(1);
        }

        const entry = ledger.setBalance(normalizedUri, targetAmount, targetCurrency);
        console.log(chalk.green(`✅ Set balance for ${normalizedUri} to ${targetAmount} ${targetCurrency || ledger.defaultCurrency}`));

        // Show the updated entry
        const entryTable = new Table({
          head: [chalk.cyan('Property'), chalk.cyan('Value')]
        });

        entryTable.push(
          ['URI', entry.url],
          ['Amount', typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount, null, 2)]
        );

        console.log(entryTable.toString());
      } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
      }
    } else {
      // Interactive mode
      await setBalanceWizard(ledger);
    }

    saveLedger(ledger, filename);
    console.log(chalk.cyan('\nUpdated ledger:'));
    displayLedger(ledger);
  });

program
  .command('show [file]')
  .description('Display ledger contents')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-c, --currency <currency>', 'currency to display totals for')
  .action((file, options) => {
    displayBanner();
    const filename = options.file || file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);
    displayLedger(ledger, options.currency);
  });

program
  .command('query')
  .description('Query balance for specific URI (interactive)')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .action(async (options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);
    await queryBalanceWizard(ledger);
  });

program
  .command('balance [file]')
  .description('Display all balances in the ledger')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-c, --currency <currency>', 'filter by specific currency (shows all if not specified)')
  .action((file, options) => {
    const filename = options.file || file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    if (ledger.entries.length === 0) {
      console.log(chalk.yellow('📭 No entries in this ledger'));
      return;
    }

    // Create balances table
    const balancesTable = new Table({
      head: [chalk.cyan('URI'), chalk.cyan('Amount'), chalk.cyan('Currency')],
      colWidths: [50, 15, 15]
    });

    let hasResults = false;

    ledger.entries.forEach(entry => {
      if (typeof entry.amount === 'string') {
        // Simple amount in default currency
        if (!options.currency || options.currency === ledger.defaultCurrency) {
          balancesTable.push([
            entry.url,
            chalk.green(entry.amount),
            chalk.yellow(ledger.defaultCurrency)
          ]);
          hasResults = true;
        }
      } else if (Array.isArray(entry.amount)) {
        // Multi-currency amounts
        entry.amount.forEach((currencyEntry, index) => {
          if (!options.currency || options.currency === currencyEntry.currency) {
            balancesTable.push([
              index === 0 ? entry.url : '', // Only show URI on first row
              chalk.green(currencyEntry.value),
              chalk.yellow(currencyEntry.currency)
            ]);
            hasResults = true;
          }
        });
      }
    });

    if (!hasResults) {
      console.log(chalk.yellow(`No balances found for currency: ${options.currency}`));
      return;
    }

    console.log(chalk.cyan('\n💰 All Balances:'));
    console.log(balancesTable.toString());

    // Show totals by currency
    const currencies = new Set();
    ledger.entries.forEach(entry => {
      if (typeof entry.amount === 'string') {
        currencies.add(ledger.defaultCurrency);
      } else if (Array.isArray(entry.amount)) {
        entry.amount.forEach(curr => currencies.add(curr.currency));
      }
    });

    if (currencies.size > 1 || !options.currency) {
      const totalTable = new Table({
        head: [chalk.cyan('Currency'), chalk.cyan('Total')]
      });

      currencies.forEach(currency => {
        if (!options.currency || options.currency === currency) {
          const total = ledger.getTotalBalance(currency);
          if (total !== '0') {
            totalTable.push([
              chalk.yellow(currency),
              chalk.green(total)
            ]);
          }
        }
      });

      if (totalTable.length > 0) {
        console.log(chalk.cyan('\n🧮 Totals:'));
        console.log(totalTable.toString());
      }
    }
  });

program
  .command('validate [file]')
  .description('Validate ledger structure and data')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .action((file, options) => {
    displayBanner();
    const filename = options.file || file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);
    const validation = ledger.validate();
    displayValidation(validation);

    if (!validation.isValid) {
      process.exit(1);
    }
  });

program
  .command('total [file]')
  .description('Calculate total balance for currency (shows all currencies if none specified)')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-c, --currency <currency>', 'currency (shows all currencies if not specified)')
  .action((file, options) => {
    const filename = options.file || file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    if (options.currency) {
      // Show specific currency total
      const total = ledger.getTotalBalance(options.currency);
      console.log(chalk.green(`💰 ${total} ${options.currency}`));
    } else {
      // Show all currencies
      const currencies = new Set([ledger.defaultCurrency]);
      ledger.entries.forEach(entry => {
        if (Array.isArray(entry.amount)) {
          entry.amount.forEach(curr => currencies.add(curr.currency));
        }
      });

      const totalTable = new Table({
        head: [chalk.cyan('Currency'), chalk.cyan('Total')]
      });

      currencies.forEach(currency => {
        const total = ledger.getTotalBalance(currency);
        if (total !== '0') {  // Only show currencies with non-zero balances
          totalTable.push([
            chalk.yellow(currency),
            chalk.green(total)
          ]);
        }
      });

      if (totalTable.length > 0) {
        console.log(chalk.cyan('\n🧮 Total Balances:'));
        console.log(totalTable.toString());
      } else {
        console.log(chalk.yellow('No balances found in this ledger.'));
      }
    }
  });

program
  .command('merge')
  .description('Merge two ledgers')
  .option('-a, --first <file>', `first ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .requiredOption('-b, --second <file>', 'second ledger file')
  .option('-o, --output <file>', `output merged ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('-s, --strategy <strategy>', 'conflict strategy: replace|add|skip', 'replace')
  .action((options) => {
    displayBanner();

    const spinner = ora('Merging ledgers').start();

    try {
      const firstFile = options.first || DEFAULT_LEDGER_PATH;
      const outputFile = options.output || DEFAULT_LEDGER_PATH;

      const ledger1 = loadLedgerFromFile(firstFile);
      const ledger2 = loadLedgerFromFile(options.second);

      ledger1.merge(ledger2, options.strategy);
      spinner.succeed('Ledgers merged successfully');

      saveLedger(ledger1, outputFile);

      console.log(chalk.cyan('\nMerged ledger:'));
      displayLedger(ledger1);
    } catch (error) {
      spinner.fail(`Merge failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search entries by criteria (interactive if no criteria specified)')
  .option('-f, --file <file>', `ledger file (default: ${DEFAULT_LEDGER_PATH})`)
  .option('--url <pattern>', 'URL pattern to search for')
  .option('--min-amount <amount>', 'minimum amount')
  .option('--max-amount <amount>', 'maximum amount')
  .option('-c, --currency <currency>', 'currency for amount filters')
  .action(async (options) => {
    displayBanner();
    const filename = options.file || DEFAULT_LEDGER_PATH;
    const ledger = loadLedgerFromFile(filename);

    let criteria = {};
    if (options.url) criteria.url = options.url;
    if (options.minAmount) criteria.minAmount = options.minAmount;
    if (options.maxAmount) criteria.maxAmount = options.maxAmount;
    if (options.currency) criteria.currency = options.currency;

    // If no criteria provided, use interactive search
    if (Object.keys(criteria).length === 0) {
      console.log(chalk.cyan('\n🔍 Interactive Search Wizard\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: chalk.yellow('URL pattern to search for (optional):')
        },
        {
          type: 'input',
          name: 'minAmount',
          message: chalk.yellow('Minimum amount (optional):'),
          validate: input => !input || /^\d+$/.test(input) || 'Must be a number'
        },
        {
          type: 'input',
          name: 'maxAmount',
          message: chalk.yellow('Maximum amount (optional):'),
          validate: input => !input || /^\d+$/.test(input) || 'Must be a number'
        },
        {
          type: 'input',
          name: 'currency',
          message: chalk.yellow('Currency for amount filters (optional):')
        }
      ]);

      criteria = {};
      if (answers.url) criteria.url = answers.url;
      if (answers.minAmount) criteria.minAmount = answers.minAmount;
      if (answers.maxAmount) criteria.maxAmount = answers.maxAmount;
      if (answers.currency) criteria.currency = answers.currency;
    }

    const results = ledger.findEntries(criteria);

    if (results.length === 0) {
      console.log(chalk.yellow('No entries match the search criteria.'));
      return;
    }

    const table = new Table({
      head: [chalk.cyan('URI'), chalk.cyan('Amount')]
    });

    results.forEach(entry => {
      table.push([
        entry.url,
        typeof entry.amount === 'string' ? entry.amount : JSON.stringify(entry.amount)
      ]);
    });

    console.log(chalk.cyan(`\n🔍 Found ${results.length} matching entries:`));
    console.log(table.toString());
  });

program
  .command('interactive')
  .alias('i')
  .description('Interactive mode - full featured wizard')
  .action(async () => {
    displayBanner();

    let ledger = null;
    let filename = null;
    let exit = false;

    while (!exit) {
      const mainAction = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.yellow('What would you like to do?'),
          choices: [
            { name: '📝 Create new ledger', value: 'create' },
            { name: '📂 Load existing ledger', value: 'load' },
            ...(ledger ? [
              { name: '➕ Add entry', value: 'add' },
              { name: '💰 Deposit to balance', value: 'deposit' },
              { name: '💸 Withdraw from balance', value: 'withdraw' },
              { name: '⚖️ Set balance', value: 'setBalance' },
              { name: '👀 Show ledger', value: 'show' },
              { name: '🔍 Query balance', value: 'query' },
              { name: '🧮 Show totals', value: 'totals' },
              { name: '✅ Validate ledger', value: 'validate' },
              { name: '💾 Save ledger', value: 'save' }
            ] : []),
            { name: '🚪 Exit', value: 'exit' }
          ]
        }
      ]);

      switch (mainAction.action) {
        case 'create':
          ledger = await createLedgerWizard();
          break;

        case 'load':
          const loadAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'filename',
              message: chalk.yellow('Enter filename to load:'),
              validate: input => fs.existsSync(input) || 'File does not exist'
            }
          ]);
          ledger = loadLedgerFromFile(loadAnswer.filename);
          filename = loadAnswer.filename;
          console.log(chalk.green('Ledger loaded successfully!'));
          break;

        case 'add':
          await addEntryWizard(ledger);
          break;

        case 'deposit':
          await depositWizard(ledger);
          break;

        case 'withdraw':
          await withdrawWizard(ledger);
          break;

        case 'setBalance':
          await setBalanceWizard(ledger);
          break;

        case 'show':
          displayLedger(ledger);
          break;

        case 'query':
          await queryBalanceWizard(ledger);
          break;

        case 'totals':
          const currencies = new Set([ledger.defaultCurrency]);
          ledger.entries.forEach(entry => {
            if (Array.isArray(entry.amount)) {
              entry.amount.forEach(curr => currencies.add(curr.currency));
            }
          });

          const totalTable = new Table({
            head: [chalk.cyan('Currency'), chalk.cyan('Total')]
          });

          currencies.forEach(currency => {
            totalTable.push([
              chalk.yellow(currency),
              chalk.green(ledger.getTotalBalance(currency))
            ]);
          });

          console.log(chalk.cyan('\n🧮 Total Balances:'));
          console.log(totalTable.toString());
          break;

        case 'validate':
          const validation = ledger.validate();
          displayValidation(validation);
          break;

        case 'save':
          const saveAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'filename',
              message: chalk.yellow('Enter filename to save:'),
              default: filename || DEFAULT_LEDGER_PATH
            }
          ]);
          saveLedger(ledger, saveAnswer.filename);
          filename = saveAnswer.filename;
          break;

        case 'exit':
          exit = true;
          break;
      }

      if (!exit) {
        console.log(chalk.gray('\n' + '─'.repeat(50)));
      }
    }

    console.log(chalk.cyan('\n👋 Goodbye!'));
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  displayBanner();
  program.outputHelp();
} 