'use strict';

/** The bridge to Java cannot start or broke down (no Java, no PD4ML build, process gone). */
class BridgeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BridgeError';
  }
}

/**
 * A Java exception thrown by PD4ML (or any Java code called): its Java class and superclasses,
 * message, causes and stack trace.
 *
 *     try { pd.readHTML('missing.html'); }
 *     catch (e) { if (e instanceof JavaError && e.isInstanceOf('java.io.IOException')) ... }
 */
class JavaError extends Error {
  constructor(message, javaClass, hierarchy, causes, javaTrace) {
    super(`${javaClass}: ${message}`);
    this.name = 'JavaError';
    this.javaClass = javaClass;
    this.hierarchy = hierarchy;
    this.javaMessage = message;
    this.causes = causes;
    this.javaTrace = javaTrace;
  }

  /** Whether the Java exception is of the class or a subclass (`java.io.IOException`). */
  isInstanceOf(javaClass) {
    return this.javaClass === javaClass || this.hierarchy.includes(javaClass);
  }

  static from(e) {
    return new JavaError(e.message || '', e.class || 'java.lang.Throwable', e.hierarchy || [], e.causes || [], e.trace || '');
  }
}

/** A JavaScript callback (a progress listener...) threw while PD4ML ran; the error is `cause`. */
class CallbackError extends Error {
  constructor(cause) {
    super('a callback failed: ' + (cause && cause.message), { cause });
    this.name = 'CallbackError';
  }
}

/** A PD4ML build could not be found, downloaded or verified. */
class InstallError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InstallError';
  }
}

module.exports = { BridgeError, JavaError, CallbackError, InstallError };
