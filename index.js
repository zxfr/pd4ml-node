'use strict';
/**
 * PD4ML for Node.js: HTML and CSS to PDF, PDF/A, PDF/UA, DOCX, RTF and images, with the full
 * public PD4ML API (Java package com.pd4ml). PD4ML runs in a Java bridge process started on
 * first use; the API is synchronous.
 *
 *     const { PD4ML, PageSize } = require('pd4ml');
 *     const pd = new PD4ML();                  // the v42 layout engine
 *     pd.setPageSize(PageSize.A4);
 *     pd.readHtmlString('<h1>Hello</h1>');
 *     pd.writePDF('hello.pdf');
 */
const java = require('./lib/java');
const runtime = require('./lib/runtime');
const installer = require('./lib/installer');
const { Bridge } = require('./lib/bridge');
const { PD4ML } = require('./lib/pd4ml');
const { htmlToPdf, openPdf, writePdf, mergePdfs } = require('./lib/pdf');
const { BridgeError, JavaError, CallbackError, InstallError } = require('./lib/errors');

module.exports = {
  PD4ML,
  // the public PD4ML classes (static fields/methods, constructors)
  Constants: java.type('com.pd4ml.Constants'),
  LayoutEngine: java.type('com.pd4ml.Constants$LayoutEngine'),
  ErrorPolicy: java.type('com.pd4ml.Constants$ErrorPolicy'),
  PageSize: java.type('com.pd4ml.PageSize'),
  PageMargins: java.type('com.pd4ml.PageMargins'),
  Dimensions: java.type('com.pd4ml.Dimensions'),
  Units: java.type('com.pd4ml.Dimensions$Units'),
  PdfSpec: java.type('com.pd4ml.PdfSpec'),
  PdfDocument: java.type('com.pd4ml.PdfDocument'),
  ProgressListener: java.type('com.pd4ml.ProgressListener'),
  StatusMessage: java.type('com.pd4ml.StatusMessage'),
  ResourceProvider: java.type('com.pd4ml.ResourceProvider'),
  CustomTag: java.type('com.pd4ml.CustomTag'),
  // any Java class, Java interfaces implemented in JavaScript, float arguments
  Java: { type: java.type, proxy: java.proxy, float: java.float, isJavaObject: java.isJavaObject },
  // one-call conversion and PDF documents
  htmlToPdf,
  openPdf,
  writePdf,
  mergePdfs,
  // runtime
  version: runtime.version,
  hasLayoutEngines: runtime.hasLayoutEngines,
  toUrl: runtime.toUrl,
  pdfSpec: runtime.pdfSpec,
  configure: Bridge.configure,
  shutdown: Bridge.shutdown,
  install: installer.install,
  installedJar: installer.installedJar,
  installedClasspath: installer.installedClasspath,
  installedVersion: installer.installedVersion,
  availableVersions: installer.availableVersions,
  // errors
  BridgeError,
  JavaError,
  CallbackError,
  InstallError,
};
