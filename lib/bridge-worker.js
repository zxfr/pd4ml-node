'use strict';
// The worker thread behind lib/bridge.js: owns the connection to the Java bridge (a child
// process, or a TCP connection to a bridge server) and relays lines both ways. Every line from
// Java is posted to the main thread's port, then the shared counter is bumped and notified, so
// a main thread blocked in Atomics.wait() wakes up and picks it up with receiveMessageOnPort().
const { workerData } = require('worker_threads');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

const { port, shared, command, server, logFile } = workerData;
const signal = new Int32Array(shared);

function deliver(message) {
  port.postMessage(message);
  Atomics.add(signal, 0, 1);
  Atomics.notify(signal, 0);
}

let input;   // where requests go
let output;  // where lines come from
let stderrTail = '';
let child = null;

if (server) {
  const socket = net.connect(server.port, server.host);
  socket.on('error', e => deliver({ exit: `cannot connect to the PD4ML bridge at ${server.host}:${server.port}: ${e.message}` }));
  socket.on('close', () => deliver({ exit: 'the PD4ML bridge server closed the connection' }));
  input = socket;
  output = socket;
} else {
  child = spawn(command[0], command.slice(1), { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const log = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
  child.stderr.on('data', d => {
    if (log) log.write(d);
    stderrTail = (stderrTail + d.toString('utf8')).slice(-4000);
  });
  child.on('error', e => deliver({ exit: `cannot start java (${command[0]}): ${e.message}` }));
  child.on('exit', code => deliver({ exit: `the PD4ML bridge exited (code ${code})`, stderr: stderrTail }));
  input = child.stdin;
  output = child.stdout;
  input.on('error', () => { /* reported through 'exit' */ });
}

let buffered = '';
output.setEncoding('utf8');
output.on('data', chunk => {
  buffered += chunk;
  let nl;
  while ((nl = buffered.indexOf('\n')) >= 0) {
    const line = buffered.slice(0, nl);
    buffered = buffered.slice(nl + 1);
    if (line.trim()) deliver({ line });
  }
});

port.on('message', message => {
  if (message.line !== undefined) {
    input.write(message.line + '\n');
  } else if (message.close) {
    input.end();
    if (child) setTimeout(() => child.kill(), 5000).unref();
  }
});
