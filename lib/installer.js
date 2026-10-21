'use strict';
// Downloads a PD4ML build from the PD4ML Maven repository and makes it the module's default:
//
//   pd4ml install                    the most recent 4.* release (also: npx pd4ml install)
//   pd4ml install --snapshots        the most recent 4.* build, snapshots included
//   pd4ml install 4.0.23fx2          an exact version
//
// or install() / installAsync() from code. The jar is stored in the user's cache directory
// (PD4ML_HOME to choose another) with the Bouncy Castle jars PD4ML needs for encryption and
// signing, every file verified against its published SHA-1 checksum. With no build installed
// or configured, the first use of PD4ML downloads one (PD4ML_AUTO_INSTALL=0 turns that off).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { InstallError } = require('./errors');

const REPOSITORY = 'https://pd4ml.com/maven2';
const CENTRAL = 'https://repo1.maven.org/maven2';
const GROUP_PATH = 'com/pd4ml/pd4ml';
/** The Bouncy Castle version PD4ML is built against (https://pd4ml.com/docs/#2.-obtaining-pd4ml). */
const BOUNCYCASTLE_VERSION = '1.84';
const BOUNCYCASTLE = ['bcprov-jdk18on', 'bcpkix-jdk18on', 'bcutil-jdk18on'];
const MANIFEST = 'installed.json';
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:fx(\d+)(?:a(\d+))?)?(-jakarta)?(-SNAPSHOT)?$/;

// ------------------------------------------------------------------------------------- versions

/**
 * An ordering key for a PD4ML version (4.1.1, 4.0.23fx2, 4.0.23fx1a1, 4.1.2-SNAPSHOT), or null
 * for an unknown form. A snapshot sorts below its release, an fxNaM pre-release below fxN.
 */
function versionKey(version) {
  const m = VERSION.exec(version);
  if (!m) return null;
  const n = i => (m[i] === undefined ? 0 : Number(m[i]));
  return [n(1), n(2), n(3), n(4), m[5] === undefined ? 1 : 0, n(5), m[7] === undefined ? 1 : 0];
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Versions sorted oldest first (unknown forms dropped). */
function sortVersions(versions) {
  return versions.filter(v => versionKey(v)).sort((a, b) => compareKeys(versionKey(a), versionKey(b)));
}

/** The most recent `major`.* version: releases only unless `snapshots`, -jakarta only with `jakarta`. */
function selectVersion(versions, { major = 4, snapshots = false, jakarta = false } = {}) {
  const candidates = sortVersions(versions.filter(v => {
    const k = versionKey(v);
    return k && k[0] === major && (snapshots || !v.endsWith('-SNAPSHOT')) && v.includes('-jakarta') === jakarta;
  }));
  if (!candidates.length) throw new InstallError(`no ${major}.* version in the repository`);
  return candidates[candidates.length - 1];
}

// ------------------------------------------------------------------------------------- download

async function fetchBytes(url) {
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'pd4ml-node' } });
  } catch (e) {
    throw new InstallError(`cannot download ${url}: ${e.cause ? e.cause.message : e.message}`);
  }
  if (!response.ok) throw new InstallError(`cannot download ${url} (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

/** The versions the repository lists. */
async function availableVersionsAsync(repository = REPOSITORY) {
  const xml = (await fetchBytes(`${repository}/${GROUP_PATH}/maven-metadata.xml`)).toString('utf8');
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1].trim());
}

async function jarName(version, repository) {
  if (!version.endsWith('-SNAPSHOT')) return `pd4ml-${version}.jar`;
  const xml = (await fetchBytes(`${repository}/${GROUP_PATH}/${version}/maven-metadata.xml`)).toString('utf8');
  for (const sv of xml.matchAll(/<snapshotVersion>([\s\S]*?)<\/snapshotVersion>/g)) {
    const tag = t => (sv[1].match(new RegExp(`<${t}>([^<]*)</${t}>`)) || [])[1];
    if (tag('extension') === 'jar' && !tag('classifier') && tag('value')) return `pd4ml-${tag('value')}.jar`;
  }
  const ts = (xml.match(/<timestamp>([^<]+)</) || [])[1];
  const build = (xml.match(/<buildNumber>([^<]+)</) || [])[1];
  if (ts && build) return `pd4ml-${version.slice(0, -'-SNAPSHOT'.length)}-${ts}-${build}.jar`;
  throw new InstallError(`no jar listed for ${version}`);
}

async function download(url, file, { force, quiet }) {
  if (!force && fs.existsSync(file)) return;
  if (!quiet) process.stderr.write(`downloading ${url}\n`);
  const data = await fetchBytes(url);
  const expected = (await fetchBytes(url + '.sha1')).toString('ascii').trim().split(/\s+/)[0].toLowerCase();
  const actual = crypto.createHash('sha1').update(data).digest('hex');
  if (expected && actual !== expected) throw new InstallError(`checksum mismatch for ${url}: ${actual} != ${expected}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.part`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

/**
 * Downloads a PD4ML build (unless already there) and makes it the default one; resolves to the
 * jar's path. Options: snapshots, jakarta, repository, home, force, quiet, bouncycastle (default true).
 */
async function installAsync(version = 'latest', options = {}) {
  const repository = options.repository || REPOSITORY;
  const home = options.home || defaultHome();
  if (version === 'latest') {
    version = selectVersion(await availableVersionsAsync(repository), { snapshots: options.snapshots, jakarta: options.jakarta });
  }
  const name = await jarName(version, repository);
  const jar = path.join(home, name);
  await download(`${repository}/${GROUP_PATH}/${version}/${name}`, jar, options);
  const libs = [];
  if (options.bouncycastle !== false) {
    for (const artifact of BOUNCYCASTLE) {
      const lib = `${artifact}-${BOUNCYCASTLE_VERSION}.jar`;
      await download(`${CENTRAL}/org/bouncycastle/${artifact}/${BOUNCYCASTLE_VERSION}/${lib}`, path.join(home, 'lib', lib), options);
      libs.push(`lib/${lib}`);
    }
  }
  const manifest = { ...readManifest(home), version, jar: name, libs, repository, installed: new Date().toISOString() };
  const tmp = path.join(home, `${MANIFEST}.${process.pid}.part`); // several processes may install at once
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, path.join(home, MANIFEST));
  if (!options.quiet) process.stderr.write(`PD4ML ${version}: ${jar}\n`);
  return jar;
}

// Synchronous forms: the download runs in a child Node process, so they can be used from the
// synchronous API (and from the first use of PD4ML).
function runSync(task, args) {
  try {
    const out = execFileSync(process.execPath, [__filename, '--run', task, JSON.stringify(args)], {
      stdio: ['ignore', 'pipe', 'inherit'],
      windowsHide: true,
    });
    return JSON.parse(out.toString('utf8'));
  } catch (e) {
    const message = e.stdout && e.stdout.length ? e.stdout.toString('utf8').trim() : e.message;
    throw new InstallError(message);
  }
}

/** Synchronous installAsync(): downloads a PD4ML build and returns the jar's path. */
function install(version = 'latest', options = {}) {
  return runSync('install', [version, options]);
}

/** The versions the repository lists (synchronous). */
function availableVersions(repository = REPOSITORY) {
  return runSync('versions', [repository]);
}

// -------------------------------------------------------------------------------- installation

/** Where downloaded builds go: PD4ML_HOME, else the user's cache directory. */
function defaultHome() {
  if (process.env.PD4ML_HOME) return process.env.PD4ML_HOME;
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'pd4ml-node');
  }
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'pd4ml-node');
}

function readManifest(home) {
  try {
    return JSON.parse(fs.readFileSync(path.join(home, MANIFEST), 'utf8'));
  } catch (e) {
    return {};
  }
}

/** The jar install() made the default, or null. */
function installedJar(home = defaultHome()) {
  const { jar } = readManifest(home);
  const p = jar ? path.join(home, jar) : null;
  return p && fs.existsSync(p) ? p : null;
}

/** The installed build's classpath: the PD4ML jar and its companion jars; empty if none. */
function installedClasspath(home = defaultHome()) {
  const jar = installedJar(home);
  if (!jar) return [];
  const libs = (readManifest(home).libs || []).map(l => path.join(home, l)).filter(p => fs.existsSync(p));
  return [jar, ...libs];
}

/** The version install() made the default, or null. */
function installedVersion(home = defaultHome()) {
  return installedJar(home) ? readManifest(home).version || null : null;
}

/** Whether the first use of PD4ML may download a build (PD4ML_AUTO_INSTALL, default on). */
function autoInstallEnabled() {
  return !['0', 'false', 'no', 'off'].includes(String(process.env.PD4ML_AUTO_INSTALL || '1').trim().toLowerCase());
}

module.exports = {
  REPOSITORY, BOUNCYCASTLE_VERSION,
  versionKey, sortVersions, selectVersion,
  install, installAsync, availableVersions, availableVersionsAsync,
  defaultHome, installedJar, installedClasspath, installedVersion, autoInstallEnabled,
};

// the child process of runSync()
if (require.main === module && process.argv[2] === '--run') {
  const [task, json] = process.argv.slice(3);
  const args = JSON.parse(json);
  const work = task === 'install' ? installAsync(...args) : availableVersionsAsync(...args);
  work.then(result => process.stdout.write(JSON.stringify(result)),
    e => { process.stdout.write(e.message); process.exitCode = 1; });
}
