'use strict';
// Java objects and classes as JavaScript proxies.
//
//   const map = new (Java.type('java.util.HashMap'))();
//   map.put('k', 'v');                      // any Java method, by its Java name
//   PageSize.A4.$get('width')               // a public field
//   PageSize.A4.getWidth()                  // a method
//   Units.MM.$enum                          // an enum constant's name
//
// Helpers are $-prefixed ($get, $set, $call, $class, $enum, $instanceOf) so they can never hide
// a Java method of the same name. Objects are released in Java when the JavaScript object is
// garbage collected.
const util = require('util');
const { Bridge, JavaFloat } = require('./bridge');

const HANDLE = Symbol('pd4ml.handle');
const BRIDGE = Symbol('pd4ml.bridge');

function isJavaObject(v) {
  return v !== null && (typeof v === 'object' || typeof v === 'function') && v[HANDLE] !== undefined;
}

function handleOf(v) { return v[HANDLE]; }

function wrapObject(bridge, handle, className, enumName) {
  const target = { [HANDLE]: handle, [BRIDGE]: bridge, className, enumName: enumName || null };
  let proxy;
  const javaToString = () => bridge.call(proxy, 'toString', []);
  proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === HANDLE || prop === BRIDGE) return t[prop];
      if (typeof prop === 'symbol') {
        if (prop === Symbol.toPrimitive) return () => javaToString();
        if (prop === util.inspect.custom) return () => `JavaObject<${className}> ${t.enumName || javaToString()}`;
        if (prop === Symbol.toStringTag) return 'JavaObject';
        return undefined;
      }
      switch (prop) {
        case 'then': return undefined; // not a thenable: `await obj` gives the object
        case '$class': return className;
        case '$enum': return t.enumName;
        case '$get': return field => bridge.getField(proxy, field);
        case '$set': return (field, value) => bridge.setField(proxy, field, value);
        case '$call': return (method, ...args) => bridge.call(proxy, method, args);
        case '$instanceOf': return cls => bridge.instanceOf(proxy, cls);
        case 'toString': return javaToString;
        case 'toJSON': return () => (t.enumName !== null ? t.enumName : javaToString());
        default: return (...args) => bridge.call(proxy, prop, args);
      }
    },
    set() {
      throw new TypeError('set Java fields with obj.$set(name, value)');
    },
  });
  bridge.track(proxy, handle);
  return proxy;
}

// ------------------------------------------------------------------------------------ classes

const descriptions = new WeakMap(); // bridge -> Map(class -> describe() result + constant cache)

function described(bridge, name) {
  let byClass = descriptions.get(bridge);
  if (!byClass) {
    byClass = new Map();
    descriptions.set(bridge, byClass);
  }
  let d = byClass.get(name);
  if (!d) {
    const info = bridge.describe(name);
    d = {
      className: info.class,
      fields: new Set(info.fields),
      constants: new Set(info.constants),
      methods: new Set(info.methods),
      values: new Map(),
    };
    byClass.set(name, d);
  }
  return d;
}

/**
 * A Java class: `type('java.util.Locale').getDefault()` (static methods), `PageSize.A4` (static
 * fields), `new PageMargins(10, 10, 10, 10, Units.MM)` (constructors). Nested classes by '.'
 * or '$' (`com.pd4ml.Constants.LayoutEngine`).
 */
function type(name) {
  const target = function JavaClass() {};
  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop === 'symbol') {
        if (prop === util.inspect.custom) return () => `JavaClass<${name}>`;
        if (prop === Symbol.toStringTag) return 'JavaClass';
        return undefined;
      }
      switch (prop) {
        case 'then': return undefined;
        case '$name': return name;
        case '$new': return (...args) => Bridge.get().newObject(name, args);
        case '$get': return field => Bridge.get().getField(name, field);
        case '$set': return (field, value) => Bridge.get().setField(name, field, value);
        case '$call': return (method, ...args) => Bridge.get().callStatic(name, method, args);
        case 'toString': return () => name;
        case 'prototype': return t.prototype;
        default: break;
      }
      const bridge = Bridge.get();
      const d = described(bridge, name);
      if (d.fields.has(prop)) {
        if (!d.constants.has(prop)) return bridge.getField(name, prop);
        if (!d.values.has(prop)) d.values.set(prop, bridge.getField(name, prop));
        return d.values.get(prop);
      }
      if (d.methods.has(prop)) return (...args) => bridge.callStatic(name, prop, args);
      return undefined;
    },
    set(t, prop, value) {
      Bridge.get().setField(name, prop, value);
      return true;
    },
    has(t, prop) {
      const d = described(Bridge.get(), name);
      return d.fields.has(prop) || d.methods.has(prop);
    },
    construct(t, args) {
      return Bridge.get().newObject(name, args);
    },
    apply() {
      throw new TypeError(`${name} is a Java class: use new`);
    },
  });
}

/**
 * A Java object implementing the interface `iface`, its methods calling `fn(method, args)` on
 * this thread while PD4ML runs (`Java.proxy('com.pd4ml.ProgressListener', (m, a) => ...)`).
 */
function proxy(iface, fn) {
  return Bridge.get().proxy(iface, fn);
}

/** A number passed to Java as a float/double: `Java.float(10)` (a plain 10 is an int). */
function float(value) {
  return new JavaFloat(value);
}

module.exports = { type, proxy, float, isJavaObject, handleOf, wrapObject };
