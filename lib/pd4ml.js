'use strict';
// PD4ML: com.pd4ml.PD4ML with Node I/O and the v42 layout engine by default.
const fs = require('fs');
const java = require('./java');
const runtime = require('./runtime');
const { Bridge, Output } = require('./bridge');

const PD4MLClass = java.type('com.pd4ml.PD4ML');
const DEFAULT_ENGINE = 'v42';
let warnedNoEngines = false;

/**
 * An HTML to PDF/DOCX/RTF/image converter. Every method of the Java class com.pd4ml.PD4ML is
 * available by its Java name (setPageSize, addStyle, useTTF...); these also take Node I/O:
 * readHTML (a path, URL or Buffer), readHtmlString, writePDF/writeDOCX/writeRTF (a Buffer is
 * returned, or written to a path, file descriptor or stream), renderAsImages and
 * monitorProgressWith (a JavaScript function).
 *
 *     const pd = new PD4ML();
 *     pd.setPageSize(PageSize.A4);
 *     pd.readHtmlString('<h1>Hello</h1>');
 *     const pdf = pd.writePDF();
 */
class PD4ML {
  /**
   * @param {object} [options]
   * @param {string} [options.license] a license serial number or license file URL (default:
   *   pd4ml.lic on the classpath or in the working directory, else evaluation mode)
   * @param {number} [options.htmlWidth] the width in pixels the HTML is laid out in
   * @param {string|object|false} [options.engine] 'v42', 'v40' or a LayoutEngine; default v42
   *   where the build has layout engines, else the build's own; false: the Java default
   */
  constructor(options = {}) {
    const { license, htmlWidth } = options;
    let { engine } = options;
    const args = [];
    if (license !== undefined && license !== null) args.push(license);
    if (htmlWidth !== undefined && htmlWidth !== null) args.push(htmlWidth);
    /** The Java object (com.pd4ml.PD4ML). */
    this.java = Bridge.get().newObject('com.pd4ml.PD4ML', args);
    /** The layout engine chosen ('v42', 'v40'), or null for the build's own. */
    this.engine = null;
    if (engine === undefined || engine === null) {
      if (runtime.hasLayoutEngines()) {
        engine = DEFAULT_ENGINE;
      } else {
        engine = false;
        if (!warnedNoEngines) {
          warnedNoEngines = true;
          process.emitWarning(`PD4ML ${runtime.version()} has no ${DEFAULT_ENGINE} layout engine (from 4.2): its own engine is used`);
        }
      }
    }
    if (engine !== false) this.useHtmlRenderer(engine);
    return new Proxy(this, {
      get(t, prop, receiver) {
        if (typeof prop === 'symbol' || prop in t) return Reflect.get(t, prop, receiver);
        if (prop === 'then') return undefined;
        return (...a) => t.java.$call(prop, ...a);
      },
    });
  }

  // ---------------------------------------------------------------------------- layout engine

  /**
   * Chooses the layout engine: 'v42', 'v40' or a LayoutEngine, optionally with the HTML width
   * and engine parameters (an object of strings).
   */
  useHtmlRenderer(engine = DEFAULT_ENGINE, htmlWidth = null, params = null) {
    if (!runtime.hasLayoutEngines()) {
      throw new Error(`PD4ML ${runtime.version()} has no layout engines to choose from (Constants.LayoutEngine is new in 4.2)`);
    }
    const e = typeof engine === 'string' ? java.type('com.pd4ml.Constants$LayoutEngine').valueOf(engine) : engine;
    if (params) {
      const strings = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
      this.java.useHtmlRenderer(e, htmlWidth === null ? -1 : htmlWidth, strings);
    } else if (htmlWidth !== null) {
      this.java.useHtmlRenderer(e, htmlWidth);
    } else {
      this.java.useHtmlRenderer(e);
    }
    this.engine = e.$enum;
  }

  // ------------------------------------------------------------------------------------ input

  /**
   * Reads the document to convert.
   * @param {string|URL|Buffer|Uint8Array|object} source a URL ('https://...', 'file:...'), a local
   *   path, the document's bytes, or a Java URL/InputStream
   * @param {string} [baseUrl] where relative links resolve (a URL or a local directory/file); for
   *   a path or URL source, its own location
   * @param {string} [encoding] the document's encoding when it does not declare one
   */
  readHTML(source, baseUrl = null, encoding = null) {
    if (typeof source === 'string' || source instanceof URL
        || (java.isJavaObject(source) && source.$class === 'java.net.URL')) {
      const url = runtime.toUrl(source);
      encoding === null ? this.java.readHTML(url) : this.java.readHTML(url, encoding);
      return;
    }
    const content = java.isJavaObject(source) ? source : runtime.bytes(source);
    const base = baseUrl === null ? null : runtime.toUrl(baseUrl);
    if (baseUrl === null && encoding === null) {
      this.java.readHTML(content);
    } else if (encoding === null) {
      this.java.readHTML(content, base);
    } else {
      this.java.readHTML(content, base, encoding);
    }
  }

  /** Reads the document from a string of HTML. */
  readHtmlString(html, baseUrl = null) {
    this.readHTML(Buffer.from(String(html), 'utf8'), baseUrl, 'UTF-8');
  }

  // ----------------------------------------------------------------------------------- output

  /**
   * Writes the PDF.
   * @param {string|number|object} [target] a file path, a file descriptor or a writable stream
   *   (an HTTP response...); none: the PDF is returned as a Buffer
   * @param {string|object} [spec] a PdfSpec (PdfSpec.PDFA_2B), one of its keywords ('pdf/a-2b',
   *   see PdfSpec.listKeywords()), or 'PDF'/'PDFA'/'PDFUA'
   */
  writePDF(target = null, spec = null) {
    const s = runtime.pdfSpec(spec);
    const outs = [];
    Bridge.get().call(this.java, 'writePDF', s === null ? [new Output()] : [new Output(), s], outs);
    return runtime.deliver(outs[0] || Buffer.alloc(0), target);
  }

  /** Writes a DOCX document (see writePDF for `target`). */
  writeDOCX(target = null) {
    const outs = [];
    Bridge.get().call(this.java, 'writeDOCX', [new Output()], outs);
    return runtime.deliver(outs[0] || Buffer.alloc(0), target);
  }

  /** Writes an RTF document; `rtfWmf`: images as WMF (see writePDF for `target`). */
  writeRTF(target = null, rtfWmf = false) {
    const outs = [];
    Bridge.get().call(this.java, 'writeRTF', [new Output(), rtfWmf], outs);
    return runtime.deliver(outs[0] || Buffer.alloc(0), target);
  }

  /**
   * renderAsImages(format): the pages as encoded images (Constants.PNG24...), an array of Buffers;
   * renderAsImages(dir, name, format): image files written to a directory;
   * renderAsImages(): Java BufferedImage objects.
   */
  renderAsImages(...args) {
    if (args.length === 3 && typeof args[0] === 'string') {
      const File = java.type('java.io.File');
      fs.mkdirSync(args[0], { recursive: true });
      return this.java.renderAsImages(new File(args[0]), args[1], args[2]);
    }
    return this.java.renderAsImages(...args);
  }

  /** The pages as 24-bit PNG images (Buffers). */
  renderPng() {
    return this.java.renderAsImages(java.type('com.pd4ml.Constants').PNG24);
  }

  // --------------------------------------------------------------------------------- progress

  /**
   * Reports conversion progress to a function (messageId, progress, note, msec) - it runs on
   * this thread while PD4ML works - or to a Java ProgressListener.
   */
  monitorProgressWith(listener) {
    const l = typeof listener === 'function'
      ? java.proxy('com.pd4ml.ProgressListener', (method, a) => listener(Number(a[0]), Number(a[1]), a[2], Number(a[3])))
      : listener;
    this.java.monitorProgressWith(l);
  }
}

PD4ML.DEFAULT_ENGINE = DEFAULT_ENGINE;

// static Java members (PD4ML.getVersion()) on the class itself
const PD4MLExport = new Proxy(PD4ML, {
  get(t, prop, receiver) {
    if (typeof prop === 'symbol' || prop in t) return Reflect.get(t, prop, receiver);
    return PD4MLClass[prop];
  },
});

module.exports = { PD4ML: PD4MLExport };
