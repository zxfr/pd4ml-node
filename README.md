# pd4ml — PD4ML for Node.js

HTML and CSS to **PDF**, **PDF/A**, **PDF/UA**, **ZUGFeRD/Factur-X**, **DOCX**, **RTF** and page
**images**, with the full public [PD4ML](https://pd4ml.com) API (Java package `com.pd4ml`)
available to Node.js applications. New converters use PD4ML's **v42 layout engine** by default.

```
npm install github:zxfr/pd4ml-node
```

or a release package from <https://github.com/zxfr/pd4ml-node/releases>
(`npm install https://github.com/zxfr/pd4ml-node/releases/download/v1.0.0/pd4ml-1.0.0.tgz`). Either way the module is `pd4ml`.

```js
const { PD4ML, PageSize, PageMargins, Units, PdfSpec } = require('pd4ml');

const pd = new PD4ML();                                     // v42 layout engine
pd.setPageSize(PageSize.A4);
pd.setPageMargins(new PageMargins(15, 15, 15, 15, Units.MM));
pd.readHTML('invoice.html');                                // a path, URL or Buffer
pd.writePDF('invoice.pdf', PdfSpec.PDFA_3B);                // a path, fd or stream; no target: a Buffer
```

The first use downloads the most recent PD4ML build (see *Installation* below). TypeScript
declarations of the whole API are included.

## Requirements

- Node.js 18 or later.
- Java 8 or later (17 or 21 recommended), found through `PD4ML_JAVA`, `JAVA_HOME` or the `PATH`.

## Installation

The package contains the Node module only; PD4ML itself comes from the PD4ML Maven repository
(<https://pd4ml.com/maven2>):

- **Automatically.** If no PD4ML build is installed or configured, the first use of PD4ML
  downloads the most recent 4.x release, with the Bouncy Castle jars (for encryption and
  signing). Every file is verified against its SHA-1 checksum and stored in a per-user cache
  directory (`%LOCALAPPDATA%\pd4ml-node`, `~/.cache/pd4ml-node`, or `PD4ML_HOME`).
- **Ahead of time**, better for servers and container images: `npx pd4ml install`. Run it again
  to update to a newer release.

`PD4ML_AUTO_INSTALL=0` turns the automatic download off. `npx pd4ml list` shows the available
versions, `npx pd4ml install 4.0.23fx2` installs a specific one, and `PD4ML_CLASSPATH` /
`PD4ML_CLASSPATH_FILE` point the module at any other build.

## How it works

PD4ML runs in a small Java bridge process started on first use, one per Node process (or one
shared server: `npx pd4ml serve`, `PD4ML_BRIDGE=tcp://127.0.0.1:8723`). The API is synchronous:
`pd.writePDF()` returns the PDF. Like any CPU-bound call, a conversion blocks the event loop
while it runs; servers under concurrent load convert in worker threads.

- Java methods keep their Java names; the PD4ML classes are exported under their own names
  (`PageSize.A4`, `new PageMargins(...)`, `PdfSpec.getInstance('pdf/a-2b')`), any other Java class
  through `Java.type(name)`.
- Helpers on Java objects start with `$`: `$get(field)`, `$set(field, value)`, `$class`, `$enum`.
- `Java.float(10)` passes a number as a Java float; Java's `byte[]` is a `Buffer`.
- Java exceptions are `JavaError`s (`e.isInstanceOf('java.io.IOException')`).

## Command line

```
npx pd4ml convert page.html page.pdf [--spec pdf/a-2b] [--engine v40]    # also .docx, .rtf, .png
npx pd4ml version
```

## Documentation

- **User guide**: [docs/guide.md](docs/guide.md) — prerequisites, installation, how it works,
  use cases with code, tips, troubleshooting.
- **API reference**: [docs/api.md](docs/api.md) — every class and method, generated from PD4ML.
- The PD4ML manual: <https://pd4ml.com/docs/>.
- Licensing: without a license, PD4ML runs in evaluation mode and watermarks its output. See
  <https://pd4ml.com/docs/#3.-licensing>.

