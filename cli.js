#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const program = require('commander');
const chalk = require('chalk');
const inquire = require('inquirer');
const pkg = require('./package.json');

class HandledError extends Error {}

program
  .name(pkg.name)
  .version(pkg.version)
  .arguments('<dir>')
  .description('create a project')
  .option('-w, --wrokdir <dir>', 'change work directory')
  .option('-v, --verbose', 'enable verbose output')
  .action(setup)
  .action(wrap(craft));

program.parse(process.argv);

if (program.args.length !== 2) {
  program.help();

  return;
}

function wrap(func) {
  return async (...args) => {
    try {
      await func(...args);
    } catch (error) {
      if (error instanceof HandledError) {
        console.error(chalk.red(error.message));
      } else {
        const util = require('util');
        console.error(chalk.red(util.inspect(error, false, null, true)));
      }
      process.exit(1);
    }
  };
}

function setup() {
  if (program.verbose) {
    process.env.VERBOSE = 'true';
  }
  if (program.wrokdir) {
    process.chdir(program.wrokdir);
    console.log(chalk.yellow(`workdir changed to ${chalk.bold(chalk.blue(process.cwd()))}`));
  }

  process.on('uncaughtException', err => {
    console.error('[uncaughtException]', err);
  });

  process.on('unhandledRejection', (reason, p) => {
    console.error('[unhandledRejection]', p, reason);
  });

  process.on('warning', warning => {
    console.warn('[warning]', warning);
  });
}

/**
 * Copy directory
 *
 * @param {string} src Source directory
 * @param {string} dest Target directory
 * @param {{recursive?: boolean, overwrite?: boolean, symlink?: boolean}} opts Options
 */
function copyDir(src, dest, opts) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
  fs.readdirSync(src).forEach(f => {
    const file = path.join(src, f);
    const tar = path.join(dest, f);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      if (opts && opts.recursive) {
        copyDir(file, tar, opts);
      }
    } else if (stat.isSymbolicLink()) {
      if (opts && opts.symlink) {
        if (!fs.existsSync(tar) || (opts && opts.overwrite)) {
          fs.symlinkSync(fs.readlinkSync(file), tar);
        }
      }
    } else if (!fs.existsSync(tar) || (opts && opts.overwrite)) {
      fs.copyFileSync(file, tar);
    }
  });
}

async function craft(dir) {
  if (!dir) {
    program.help();

    return;
  }
  if (!path.isAbsolute(dir)) {
    dir = path.resolve(process.cwd(), dir);
  }
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    throw new HandledError('directory not empty');
  }
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const { private, lang } = await inquire.prompt([
    {
      name: 'private',
      type: 'confirm',
      message: 'Is your project private?',
      default: false
    },
    {
      type: 'list',
      name: 'lang',
      default: 0,
      choices: ['JavaScript', 'TypeScript'],
      message: 'Choose your project language'
    }
  ]);
  const isJs = lang === 'JavaScript';
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'package name',
      default: path.basename(dir)
    }
  ];
  if (!private) {
    questions.push(
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: '1.0.0'
      },
      {
        type: 'input',
        name: 'description',
        message: 'description'
      },
      {
        type: 'input',
        name: 'main',
        message: 'entry point',
        default: isJs ? 'src/index.js' : 'lib/index.js'
      },
      // {
      //   type: 'input',
      //   name: 'repository',
      //   message: 'git repository'
      // },
      {
        type: 'input',
        name: 'keywords',
        message: 'keywords'
      },
      {
        type: 'input',
        name: 'author',
        message: 'author'
      },
      {
        type: 'input',
        name: 'license',
        message: 'license',
        default: 'ISC'
      }
    );
  }
  const answers = await inquire.prompt(questions);
  let package;
  if (isJs) {
    package = require('./stubs/js/package.json');
  } else {
    package = require('./stubs/ts/package.json');
  }
  const info = { name: answers.name };
  if (private) {
    info.private = true;
  } else {
    if (answers.version) {
      info.version = answers.version;
    }
    if (answers.description) {
      info.description = answers.description;
    }
    if (answers.main) {
      info.main = answers.main;
    }
    // if (answers.repository) {
    //   info.repository = {
    //     type: 'git',
    //     url: 'git+ssh://' + answers.repository
    //   };
    //   info.bugs = { url: '' };
    //   info.homepage = '';
    // }
    if (answers.keywords) {
      info.keywords = answers.keywords.split(',');
    }
    if (answers.author) {
      info.author = answers.author;
    }
    if (answers.license) {
      info.license = answers.license;
    }
  }
  const content = JSON.stringify(Object.assign(info, package), null, 2);
  console.log(`About to write to ${path.join(dir, 'package.json')}:`);
  console.log(content);
  const { confirm } = await inquire.prompt({
    name: 'confirm',
    type: 'confirm',
    message: 'Is this OK?',
    default: true
  });
  if (!confirm) {
    console.log('Aborted.');

    return;
  }
  const folder = isJs ? 'js' : 'ts';
  await copyDir(path.join(__dirname, 'stubs'), dir);
  await copyDir(path.join(__dirname, 'stubs', folder), dir, {
    overwrite: true,
    recursive: true
  });
  fs.writeFileSync(path.join(dir, 'package.json'), content, { encoding: 'utf8' });
  fs.mkdirSync(path.join(dir, 'src'));
  if (!isJs) {
    fs.mkdirSync(path.join(dir, 'lib'));
  }
}
