'use strict';
// One-call conversion and PDF documents.
//
//   const pdf = htmlToPdf('report.html');          // a path, URL or Buffer
//   const doc = openPdf(pdf);                       // a com.pd4ml.PdfDocument
//   writePdf(doc, 'copy.pdf', { password: 'secret' });
const fs = require('fs');
const java = require('./java');
const runtime = require('./runtime');
const { Bridge, Output } = require('./bridge');
const { PD4ML } = require('./pd4ml');

/**
 * Converts one document to PDF. `source` as for PD4ML#readHTML, `target` as for PD4ML#writePDF.
 * Options: baseUrl, pageSize, pageMargins, spec, engine, htmlWidth.
 */
function htmlToPdf(source, target = null, options = {}) {
  const pd = new PD4ML({ htmlWidth: options.htmlWidth, engine: options.engine });
  if (options.pageSize) pd.setPageSize(options.pageSize);
  if (options.pageMargins) pd.setPageMargins(options.pageMargins);
  pd.readHTML(source, options.baseUrl === undefined ? null : options.baseUrl);
  return pd.writePDF(target, options.spec === undefined ? null : options.spec);
}

/** PDF content from a path, a Buffer/typed array, or a string holding a PDF. */
function pdfBytes(source) {
  if (typeof source === 'string' && !source.startsWith('%PDF')) return fs.readFileSync(source);
  return runtime.bytes(source);
}

/** A com.pd4ml.PdfDocument from a path, URL, Buffer or PDF string (+ password). */
function openPdf(source, password = null) {
  const PdfDocument = java.type('com.pd4ml.PdfDocument');
  if ((typeof source === 'string' && /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(source)) || source instanceof URL) {
    return new PdfDocument(runtime.toUrl(source), password);
  }
  return new PdfDocument(pdfBytes(source), password);
}

/**
 * Writes a PdfDocument (after append, overlay...): returned as a Buffer, or written to a path,
 * fd or stream. Options: password (encrypts), permissions (Constants flags; default
 * Constants.DefaultPermissions).
 */
function writePdf(document, target = null, options = {}) {
  const outs = [];
  if (!options.password) {
    Bridge.get().call(document, 'write', [new Output()], outs);
  } else {
    const permissions = options.permissions === undefined ? java.type('com.pd4ml.Constants').DefaultPermissions : options.permissions;
    Bridge.get().call(document, 'write', [new Output(), options.password, permissions], outs);
  }
  return runtime.deliver(outs[0] || Buffer.alloc(0), target);
}

/** PdfDocument.mergePDFs: two PDF documents appended into one. */
function mergePdfs(first, second, target = null) {
  const outs = [];
  Bridge.get().callStatic('com.pd4ml.PdfDocument', 'mergePDFs', [pdfBytes(first), pdfBytes(second), new Output()], outs);
  return runtime.deliver(outs[0] || Buffer.alloc(0), target);
}

module.exports = { htmlToPdf, openPdf, writePdf, mergePdfs };
