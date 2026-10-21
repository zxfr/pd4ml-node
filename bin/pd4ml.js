#!/usr/bin/env node
'use strict';
// The pd4ml command: install/list PD4ML builds, show the version, run a bridge server, convert.
const { spawn } = require('child_process');
const path = require('path');
const pd4ml = require('..');
const installer = require('../lib/installer');
const { Bridge } = require('../lib/bridge');

const USAGE = `usage: pd4ml <command> [options]

  install [VERSION] [--snapshots] [--jakarta] [--home DIR] [--force] [--no-bouncycastle]
                      download a PD4ML build (default: the most recent 4.* release), or update to it
  list [--snapshots] [--jakarta]
                      the versions in the PD4ML repository (* the installed one)
  version             the PD4ML version the module runs (downloads it on first use)
  serve [--port N]    run a bridge server (default port 8723) for PD4ML_BRIDGE=tcp://127.0.0.1:N
  convert INPUT OUTPUT [--format pdf|docx|rtf|png] [--page-size A4] [--landscape]
          [--margins 10,10,10,10] [--width PX] [--engine v42|v40] [--spec pdf/a-2b]
          [--footer HTML] [--bookmarks]
                      convert a file or URL; the format follows OUTPUT's extension by default

  PD4ML_CLASSPATH / PD4ML_CLASSPATH_FILE / PD4ML_HOME / PD4ML_JAVA choose the build and Java.
  https://pd4ml.com/docs/`;

const FLAGS = new Set(['snapshots', 'jakarta', 'force', 'no-bouncycastle', 'landscape', 'bookmarks']);

function parse(argv) {
  const positional = [];
  const named = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const eq = a.indexOf('=');
    const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
    if (eq > 0) named[name] = a.slice(eq + 1);
    else if (!FLAGS.has(name) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) named[name] = argv[++i];
    else named[name] = true;
  }
  return { positional, named };
}

function convert({ positional, named }) {
  if (positional.length !== 2) throw new Error('convert: INPUT and OUTPUT expected');
  const [input, output] = positional;
  const format = String(named.format || path.extname(output).slice(1)).toLowerCase();
  const pd = new pd4ml.PD4ML({ htmlWidth: named.width ? Number(named.width) : undefined, engine: named.engine });
  if (named['page-size']) {
    const size = pd4ml.PageSize.getInstance(String(named['page-size']).toLowerCase());
    if (!size) throw new Error(`unknown page size '${named['page-size']}'`);
    pd.setPageSize(named.landscape ? size.rotate() : size);
  } else if (named.landscape) {
    pd.setPageSize(pd4ml.PageSize.A4.rotate());
  }
  if (named.margins) {
    let mm = String(named.margins).split(',').map(s => Number(s.trim()));
    if (mm.length === 1) mm = [mm[0], mm[0], mm[0], mm[0]];
    if (mm.length !== 4 || mm.some(Number.isNaN)) throw new Error('--margins: one or four values (mm)');
    pd.setPageMargins(new pd4ml.PageMargins(mm[0], mm[1], mm[2], mm[3], pd4ml.Units.MM));
  }
  if (named.footer) pd.setPageFooter(String(named.footer), 30, '1+');
  if (named.bookmarks) pd.generateBookmarksFromHeadings(true);
  pd.readHTML(input);
  switch (format) {
    case 'pdf': pd.writePDF(output, named.spec || null); break;
    case 'docx': pd.writeDOCX(output); break;
    case 'rtf': pd.writeRTF(output); break;
    case 'png': {
      const pages = pd.renderPng();
      if (pages.length === 1) {
        require('fs').writeFileSync(output, pages[0]);
      } else {
        const stem = output.replace(/\.png$/i, '');
        pages.forEach((p, i) => require('fs').writeFileSync(`${stem}-${i + 1}.png`, p));
      }
      break;
    }
    default: throw new Error(`unknown format '${format}' (pdf, docx, rtf, png)`);
  }
}

function main(argv) {
  const [command, ...rest] = argv;
  if (!command || ['-h', '--help', 'help'].includes(command)) {
    console.log(USAGE);
    return command ? 0 : 2;
  }
  const args = parse(rest);
  const n = args.named;
  switch (command) {
    case 'install':
      console.log(installer.install(args.positional[0] || 'latest', {
        snapshots: !!n.snapshots, jakarta: !!n.jakarta, home: n.home, force: !!n.force, bouncycastle: !n['no-bouncycastle'],
      }));
      return 0;
    case 'list': {
      const installed = installer.installedVersion();
      for (const v of installer.sortVersions(installer.availableVersions())) {
        if (!n.snapshots && v.endsWith('-SNAPSHOT')) continue;
        if (v.includes('-jakarta') !== !!n.jakarta) continue;
        console.log((v === installed ? '* ' : '  ') + v);
      }
      return 0;
    }
    case 'version':
      console.log(pd4ml.version());
      return 0;
    case 'serve': {
      const port = Number(n.port || 8723);
      const cmd = Bridge.command(undefined, port);
      console.error(`PD4ML bridge on tcp://127.0.0.1:${port} (Ctrl+C to stop)`);
      const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
      child.on('exit', code => process.exit(code === null ? 1 : code));
      return null;
    }
    case 'convert':
      convert(args);
      return 0;
    default:
      console.error(`pd4ml: unknown command '${command}'\n\n${USAGE}`);
      return 2;
  }
}

try {
  const code = main(process.argv.slice(2));
  if (code !== null) process.exitCode = code;
} catch (e) {
  console.error('pd4ml: ' + e.message);
  process.exitCode = 1;
}
