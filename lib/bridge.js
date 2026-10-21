'use strict';
// The connection to the Java side. PD4ML runs in a Java bridge process (lib/pd4ml-bridge.jar,
// started on first use) or in a bridge server (`pd4ml serve`, PD4ML_BRIDGE=tcp://host:port).
// Calls are synchronous: a worker thread (bridge-worker.js) does the I/O while the calling
// thread waits in Atomics.wait() - the same blocking model the Python, PHP and .NET wrappers
// have, so `const pdf = pd.writePDF()` just returns the PDF.
const path = require('path');
const fs = require('fs');
const { Worker, MessageChannel, receiveMessageOnPort } = require('worker_threads');
const { BridgeError, JavaError, CallbackError } = require('./errors');

const BRIDGE_JAR = path.join(__dirname, 'pd4ml-bridge.jar');

/** A float argument: `Java.float(10)` is passed as 10.0, so Java picks a float overload. */
class JavaFloat {
  constructor(value) { this.value = Number(value); }
}

/** An OutputStream argument whose content comes back to the caller (see Bridge#request). */
class Output {
  constructor(index = 0) { this.index = index; }
}

let options = {};
let defaultBridge = null;

class Bridge {
  /**
   * Sets up the shared bridge; call before the first use of PD4ML.
   * @param {object} opts {classpath: string[], java: string, jvmOptions: string[],
   *   server: 'tcp://127.0.0.1:8723', logFile: string}
   */
  static configure(opts) {
    if (defaultBridge) throw new BridgeError('the PD4ML bridge runs already: configure() before the first use');
    options = { ...options, ...opts };
  }

  /** The shared bridge, started on first use. */
  static get() {
    if (!defaultBridge) defaultBridge = new Bridge(options);
    return defaultBridge;
  }

  static isStarted() { return defaultBridge !== null; }

  /** Stops the shared bridge (it starts again on the next use). */
  static shutdown() {
    if (defaultBridge) defaultBridge.close();
    defaultBridge = null;
  }

  /** The classpath the bridge starts with: configured, from the environment, or the installed build. */
  static classpath(opts = options) {
    let entries = opts.classpath;
    if (!entries && process.env.PD4ML_CLASSPATH) entries = process.env.PD4ML_CLASSPATH.split(path.delimiter);
    if (!entries && process.env.PD4ML_CLASSPATH_FILE) {
      entries = fs.readFileSync(process.env.PD4ML_CLASSPATH_FILE, 'utf8').split(/\r?\n/);
    }
    if (!entries) {
      const installer = require('./installer');
      entries = installer.installedClasspath();
      if (!entries.length && installer.autoInstallEnabled()) {
        process.stderr.write('pd4ml: no PD4ML build installed yet: downloading the most recent release '
          + "(once; 'pd4ml install' updates it, PD4ML_AUTO_INSTALL=0 turns this off)\n");
        installer.install();
        entries = installer.installedClasspath();
      }
    }
    const out = [];
    for (const raw of entries) {
      const e = raw.trim();
      if (!e) continue;
      if (e.endsWith('/*') || e.endsWith('\\*')) {
        const dir = e.slice(0, -2);
        if (fs.existsSync(dir)) out.push(...fs.readdirSync(dir).filter(f => f.endsWith('.jar')).sort().map(f => path.join(dir, f)));
      } else {
        out.push(e);
      }
    }
    return out;
  }

  /** The java executable: PD4ML_JAVA, JAVA_HOME/bin/java, else `java`. */
  static java(opts = options) {
    if (opts.java) return opts.java;
    if (process.env.PD4ML_JAVA) return process.env.PD4ML_JAVA;
    if (process.env.JAVA_HOME) {
      const exe = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      if (fs.existsSync(exe)) return exe;
    }
    return 'java';
  }

  /** The command line that runs the bridge (with a port: a bridge server). */
  static command(opts = options, port = null) {
    const cp = Bridge.classpath(opts);
    if (!cp.length) {
      throw new BridgeError("PD4ML not found: install a build with 'pd4ml install' (or install()), or point at one "
        + 'with configure({classpath}), PD4ML_CLASSPATH or PD4ML_CLASSPATH_FILE');
    }
    const args = [Bridge.java(opts), '-Djava.awt.headless=true', ...(opts.jvmOptions || [])];
    if (process.env.PD4ML_JVM_OPTIONS) args.push(...process.env.PD4ML_JVM_OPTIONS.split(/\s+/).filter(Boolean));
    args.push('-cp', [BRIDGE_JAR, ...cp].join(path.delimiter), 'com.pd4ml.bridge.Bridge');
    if (port !== null) args.push('--port', String(port));
    return args;
  }

  constructor(opts = {}) {
    const serverUrl = opts.server || process.env.PD4ML_BRIDGE;
    let server = null;
    let command = null;
    if (serverUrl) {
      const u = new URL(serverUrl);
      server = { host: u.hostname, port: Number(u.port) };
    } else {
      command = Bridge.command(opts);
    }
    this.shared = new SharedArrayBuffer(4);
    this.signal = new Int32Array(this.shared);
    const { port1, port2 } = new MessageChannel();
    this.port = port1;
    this.worker = new Worker(path.join(__dirname, 'bridge-worker.js'), {
      workerData: { port: port2, shared: this.shared, command, server, logFile: opts.logFile || process.env.PD4ML_BRIDGE_LOG },
      transferList: [port2],
    });
    this.worker.unref();
    this.port.unref();
    this.nextId = 1;
    this.nextCallback = 1;
    this.callbacks = new Map();
    this.pending = new Map();
    this.released = [];
    this.callbackError = null;
    this.closed = false;
    this.registry = new FinalizationRegistry(handle => { if (!this.closed) this.released.push(handle); });
    const hello = this.request({ op: 'hello' });
    if (!hello || hello.protocol !== 1) throw new BridgeError('incompatible PD4ML bridge protocol');
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.port.postMessage({ line: JSON.stringify({ id: 0, op: 'close' }) });
      this.port.postMessage({ close: true });
    } catch (e) {
      // closing anyway
    }
  }

  // ------------------------------------------------------------------------------- protocol

  /**
   * Sends one request and returns its decoded result. Callbacks of Java proxies run while it
   * waits. With `outs`, the content of Output arguments is stored there (Buffers).
   */
  request(req, outs = null) {
    if (this.closed) throw new BridgeError('the PD4ML bridge is closed');
    if (this.released.length) {
      const refs = this.released.splice(0);
      this.exchange({ op: 'release', refs });
    }
    const response = this.exchange(req);
    if (response.error) throw JavaError.from(response.error);
    if (outs && Array.isArray(response.out)) {
      response.out.forEach((data, i) => { outs[i] = data == null ? null : Buffer.from(data, 'base64'); });
    }
    if (this.callbackError) {
      const e = this.callbackError;
      this.callbackError = null;
      throw new CallbackError(e);
    }
    return this.decode(response.result);
  }

  exchange(req) {
    const id = this.nextId++;
    this.port.postMessage({ line: encodeJson({ ...req, id }, v => this.encode(v)) });
    for (;;) {
      if (this.pending.has(id)) {
        const r = this.pending.get(id);
        this.pending.delete(id);
        return r;
      }
      const seen = Atomics.load(this.signal, 0);
      const received = receiveMessageOnPort(this.port);
      if (!received) {
        Atomics.wait(this.signal, 0, seen);
        continue;
      }
      const message = received.message;
      if (message.exit !== undefined) {
        this.closed = true;
        if (defaultBridge === this) defaultBridge = null;
        throw new BridgeError(message.exit + (message.stderr ? `\n${message.stderr.trim()}` : '')
          + (process.env.PD4ML_BRIDGE_LOG ? '' : ' (PD4ML_BRIDGE_LOG=file keeps its output)'));
      }
      const msg = JSON.parse(message.line);
      if (msg.callback !== undefined) {
        this.dispatch(msg);
      } else if (msg.id === id) {
        return msg;
      } else {
        this.pending.set(msg.id, msg); // an outer request's response, during a callback
      }
    }
  }

  dispatch(msg) {
    const callback = this.callbacks.get(msg.callback);
    if (!callback || this.callbackError) return;
    try {
      callback(msg.method, (msg.args || []).map(a => this.decode(a)));
    } catch (e) {
      this.callbackError = e; // thrown by the request that caused the callback
    }
  }

  // ----------------------------------------------------------------------------- operations

  newObject(cls, args) { return this.request({ op: 'new', class: cls, args }); }

  call(target, method, args, outs) {
    return this.request({ op: 'call', ref: handleOf(target), method, args }, outs);
  }

  callStatic(cls, method, args, outs) { return this.request({ op: 'static', class: cls, method, args }, outs); }

  getField(target, field) {
    return typeof target === 'string'
      ? this.request({ op: 'get', class: target, field })
      : this.request({ op: 'get', ref: handleOf(target), field });
  }

  setField(target, field, value) {
    typeof target === 'string'
      ? this.request({ op: 'set', class: target, field, value })
      : this.request({ op: 'set', ref: handleOf(target), field, value });
  }

  describe(cls) { return this.request({ op: 'describe', class: cls }); }

  instanceOf(target, cls) { return this.request({ op: 'instanceof', ref: handleOf(target), class: cls }) === true; }

  /** A Java object implementing `iface`; its methods call `fn(method, args)`. */
  proxy(iface, fn) {
    const id = this.nextCallback++;
    this.callbacks.set(id, fn);
    return this.request({ op: 'proxy', interface: iface, callback: id });
  }

  // --------------------------------------------------------------------------------- values

  encode(v) {
    const java = require('./java');
    if (java.isJavaObject(v)) return { $ref: handleOf(v) };
    if (v instanceof Output) return { $out: v.index };
    if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { $bytes: Buffer.from(v).toString('base64') };
    if (v instanceof ArrayBuffer) return { $bytes: Buffer.from(v).toString('base64') };
    if (v instanceof URL) return v.href;
    if (v && typeof v === 'object' && typeof v.java === 'object' && java.isJavaObject(v.java)) return { $ref: handleOf(v.java) };
    return undefined;
  }

  decode(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(x => this.decode(x));
    if (v.$ref !== undefined) {
      const obj = require('./java').wrapObject(this, v.$ref, v.class, v.enum);
      return obj;
    }
    if (v.$bytes !== undefined) return Buffer.from(v.$bytes, 'base64');
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = this.decode(x);
    return out;
  }

  track(obj, handle) { this.registry.register(obj, handle); }
}

function handleOf(target) {
  const java = require('./java');
  if (java.isJavaObject(target)) return java.handleOf(target);
  if (target && java.isJavaObject(target.java)) return java.handleOf(target.java);
  throw new TypeError('not a Java object: ' + target);
}

/** JSON with JavaFloat values written as floats ("10.0") and custom values via `encode`. */
function encodeJson(value, encode) {
  if (value === null || value === undefined) return 'null';
  if (value instanceof JavaFloat) return Number.isInteger(value.value) ? value.value.toFixed(1) : String(value.value);
  const custom = typeof value === 'object' ? encode(value) : undefined;
  if (custom !== undefined) return JSON.stringify(custom);
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('not a finite number: ' + value);
      return String(value);
    case 'bigint': return value.toString();
    case 'boolean': return value ? 'true' : 'false';
    case 'string': return JSON.stringify(value);
    default: break;
  }
  if (Array.isArray(value)) return '[' + value.map(x => encodeJson(x, encode)).join(',') + ']';
  if (value instanceof Map) value = Object.fromEntries(value);
  return '{' + Object.entries(value).filter(([, x]) => x !== undefined)
    .map(([k, x]) => JSON.stringify(k) + ':' + encodeJson(x, encode)).join(',') + '}';
}

module.exports = { Bridge, Output, JavaFloat, BRIDGE_JAR };
