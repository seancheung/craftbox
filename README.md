# craftbox

JavaScript/TypeScript project prototype

## Install

```bash
npm i -g craftbox
```

## Usage

```bash
craftbox -h
```

Output:

```text
Usage: craftbox [options] <dir>

create a project

Options:
  -V, --version        output the version number
  -w, --wrokdir <dir>  change work directory
  -v, --verbose        enable verbose output
  -h, --help           output usage information
```

e.g.

```bash
craftbox myapp
```

### Configs Included:

For Both projects:

- .editorconfig
- .gitattributes
- .gitignore
- .prettierrc
- .prettierignore
- .vscode/
- package.json
- src/
- tests/

For JavaScript projects:

- .eslintrc.json
- .eslintignore

For TypeScript projects:

- tslint.json
- tsconfig.json
- tsconfig.prod.json
- lib/

### Commands Included:

- dev
- watch
- test
- format
- lint
- build(TypeScript only)
- start

## License

See [License](https://github.com/seancheung/craftbox/blob/master/LICENSE)
