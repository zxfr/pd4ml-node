'use strict';
// The PD4ML runtime: version, layout engines, and the value helpers the wrappers share.
const fs = require('fs');
const path = require('path');
const java = require('./java');
const { Bridge } = require('./bridge');
const { JavaError } = require('./errors');

const FORMATS = ['PDF', 'PDFA', 'PDFUA'];
const engines = new WeakMap(); // bridge -> whether the build has Constants.LayoutEngine

/** The PD4ML (Java) version. */
function version() {
  return String(java.type('com.pd4ml.PD4ML').getVersion());
}

/**
 * Whether the PD4ML build chooses between layout engines (Constants.LayoutEngine, from 4.2):
 * earlier builds, the published 4.1.x among them, have one engine only.
 */
function hasLayoutEngines() {
  const bridge = Bridge.get();
  if (!engines.has(bridge)) {
    try {
      bridge.getField('com.pd4ml.Constants$LayoutEngine', 'v42');
      engines.set(bridge, true);
    } catch (e) {
      if (!(e instanceof JavaError)) throw e;
      engines.set(bridge, false);
    }
  }
  return engines.get(bridge);
}

/** A Java URL for a URL string, a WHATWG URL or a local path (relative: to the working directory). */
function toUrl(location) {
  if (java.isJavaObject(location)) return location;
  if (location instanceof URL) location = location.href;
  const URLClass = java.type('java.net.URL');
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\/|^(file|jar|data):/i.test(location) && !/^[A-Za-z]:[\\/]/.test(location)) {
    return new URLClass(location);
  }
  const File = java.type('java.io.File');
  return new File(path.resolve(location)).toURI().toURL();
}

/**
 * The PdfSpec for one of its keywords ('pdf/a-3b', case-insensitive); a PdfSpec object, null
 * and the format names 'PDF', 'PDFA', 'PDFUA' as they are.
 * @throws {RangeError} an unknown keyword (PdfSpec.getInstance alone falls back to PDF 1.7 for it)
 */
function pdfSpec(spec) {
  if (spec === null || spec === undefined || typeof spec !== 'string' || FORMATS.includes(spec.toUpperCase())) {
    return spec === undefined ? null : spec;
  }
  const PdfSpec = java.type('com.pd4ml.PdfSpec');
  const keywords = [...String(PdfSpec.listKeywords()).matchAll(/'([^']+)'/g)].map(m => m[1]);
  if (!keywords.some(k => k.toLowerCase() === spec.toLowerCase())) {
    throw new RangeError(`unknown PDF spec '${spec}'; one of: ${keywords.join(', ')}`);
  }
  return PdfSpec.getInstance(spec);
}

/** Delivers output: returned (no target), written to a path, an fd, or a stream (`write()`). */
function deliver(data, target) {
  if (target === undefined || target === null) return data;
  if (typeof target === 'string' || target instanceof URL) {
    fs.writeFileSync(target, data);
  } else if (typeof target === 'number') {
    fs.writeSync(target, data);
  } else if (typeof target.write === 'function') {
    target.write(data);
  } else {
    throw new TypeError('target: a path, a file descriptor or a writable stream');
  }
  return undefined;
}

/** The bytes of a Buffer, typed array, ArrayBuffer or string (UTF-8). */
function bytes(v) {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  if (v instanceof ArrayBuffer) return Buffer.from(v);
  return Buffer.from(String(v), 'utf8');
}

module.exports = { version, hasLayoutEngines, toUrl, pdfSpec, deliver, bytes };
