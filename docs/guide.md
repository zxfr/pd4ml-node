# PD4ML for Node.js — User Guide

`pd4ml` brings [PD4ML](https://pd4ml.com) to Node.js: it converts HTML and CSS into **PDF**,
**PDF/A**, **PDF/UA**, **ZUGFeRD/Factur-X** invoices, **DOCX**, **RTF** and **page images**, and
gives Node applications the complete public PD4ML API.

PD4ML is a Java library. The module runs it in a small Java *bridge* process that Node talks to.
Every PD4ML class and method can be called from JavaScript, and the module adds Node I/O on top:
paths, URLs and Buffers instead of Java streams. The API is synchronous: `pd.writePDF()` returns
the PDF.

The PD4ML manual, which this guide refers to throughout, is at <https://pd4ml.com/docs/>.
The generated reference of every class and method is [api.md](api.md); TypeScript declarations
come with the package.

**Contents**

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Quick start](#3-quick-start)
4. [How it works](#4-how-it-works)
5. [Use cases](#5-use-cases)
6. [Tips and hints](#6-tips-and-hints)
7. [Troubleshooting](#7-troubleshooting)
8. [API reference](#8-api-reference)
9. [Further reading](#9-further-reading)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 18 or later** | Any platform Node and Java run on. |
| **Java 8 or later** | A JDK or JRE; an LTS release (17, 21) is recommended. The module finds it through `PD4ML_JAVA`, then `JAVA_HOME`, then `java` on the `PATH`. |
| **PD4ML** | Downloaded automatically on first use, or ahead of time with `npx pd4ml install` (see below); or any PD4ML build you point the module at. |
| **Network access** | Only for downloading PD4ML. Conversions need none, unless the HTML references remote resources. |
| **A PD4ML license** | Optional for evaluation. Without one, PD4ML runs in evaluation mode and watermarks its output. See [Licensing](https://pd4ml.com/docs/#3.-licensing) and [5.18](#518-licensing). |

Check Java with `java -version`. On a server without Java, install a JRE package (for example
`apt install openjdk-21-jre-headless`) and, if it is not on the `PATH`, set `JAVA_HOME`. In
containers, use an image with both Node and Java, or add a JRE to the Node image.

## 2. Installation

### 2.1 Install the module

```
npm install pd4ml
```

The package is published on npm as [`pd4ml`](https://www.npmjs.com/package/pd4ml). The same
package is on GitHub, <https://github.com/zxfr/pd4ml-node>, with each version's `.tgz` attached
to its [release](https://github.com/zxfr/pd4ml-node/releases); `npm install github:zxfr/pd4ml-node`
installs it from there.

This installs the module, its TypeScript declarations and the `pd4ml` command (`npx pd4ml ...`).
The module has no npm dependencies.

### 2.2 Install PD4ML

The package contains the Node module and the bridge only. The PD4ML library itself comes from the
PD4ML Maven repository (<https://pd4ml.com/maven2>), in one of two ways.

**Automatically, on first use.** If no PD4ML build is installed or configured
([2.3](#23-other-ways-to-provide-pd4ml)), the first use of PD4ML in a process downloads the most
recent PD4ML 4.x release before starting Java. A notice on standard error reports it. So once the module
is installed, this is all it takes:

<!-- no-test -->
```js
const { htmlToPdf } = require('pd4ml');

const pdf = htmlToPdf(Buffer.from('<h1>Hello</h1>'));   // the first call downloads PD4ML (once)
```

**Ahead of time, with the `pd4ml` command.** This is better for servers, CI and container
images, where a download in the middle of a request is unwelcome:

```
npx pd4ml install
```

Either way, the module:

- downloads the most recent PD4ML 4.x release;
- downloads the Bouncy Castle jars PD4ML needs for encryption and signing, from Maven Central;
- checks every file against its published SHA-1 checksum;
- stores them in a per-user cache directory: `%LOCALAPPDATA%\pd4ml-node` on Windows,
  `~/.cache/pd4ml-node` elsewhere, or `PD4ML_HOME`.

The module then uses that build. Later runs do not check for newer PD4ML releases: run
`npx pd4ml install` again to update. Updating the npm package does not change the PD4ML build.

| Option | |
|---|---|
| *(none)* | the most recent 4.x release, or an update to it |
| `--snapshots` | the most recent 4.x build, including development snapshots |
| `npx pd4ml install 4.0.23fx2` | an exact version |
| `--jakarta` | the `-jakarta` variant (for Jakarta EE / Servlet 6 environments) |
| `--home DIR` | install into `DIR` (default: `PD4ML_HOME`, else the cache directory) |
| `--force` | download again |
| `--no-bouncycastle` | skip the Bouncy Castle jars (encryption and signing will not work) |
| `npx pd4ml list` | list the available versions |

The same is available from code, which suits an application's start-up:

<!-- no-test -->
```js
const pd4ml = require('pd4ml');

pd4ml.install();                     // downloads only when that build is not there yet
console.log(pd4ml.installedVersion(), pd4ml.installedClasspath());
```

To check the installation, run `npx pd4ml version`.

**Turning the automatic download off.** Set `PD4ML_AUTO_INSTALL=0`, for example on servers that
must not reach the internet, or where the build is provisioned separately. The module then
throws a `BridgeError` until a build is installed or configured. The automatic download never
runs when a build is configured through [2.3](#23-other-ways-to-provide-pd4ml).

> **Services and containers**: the account the application runs as must see the installed
> build. Install it as that account, or install into a shared directory and set `PD4ML_HOME`
> for the application too. In a Dockerfile:
>
> ```
> RUN npm ci && PD4ML_HOME=/opt/pd4ml npx pd4ml install
> ENV PD4ML_HOME=/opt/pd4ml PD4ML_AUTO_INSTALL=0
> ```

### 2.3 Other ways to provide PD4ML

The module looks for PD4ML in this order:

1. `configure({ classpath: [...] })`, called before the first conversion;
2. the `PD4ML_CLASSPATH` environment variable: jars and class directories separated by `;`
   (Windows) or `:` (elsewhere), with `dir/*` for all jars of a directory;
3. the `PD4ML_CLASSPATH_FILE` environment variable: a file with one entry per line;
4. the build `npx pd4ml install` (or the first use) downloaded.

Typical reasons to use them:

- **Offline or air-gapped servers**: run `npx pd4ml install --home ./pd4ml-libs` on a machine
  with network access, copy the directory, and set `PD4ML_HOME` and `PD4ML_AUTO_INSTALL=0` on
  the target.
- **A licensed or specific jar**: `PD4ML_CLASSPATH=/opt/pd4ml/pd4ml.jar:/opt/pd4ml/lib/*`.
- **A PD4ML development build** (for the v42 layout engine, see [4.3](#43-layout-engines)): a
  classpath file listing the build's classes and its Maven dependencies, in
  `PD4ML_CLASSPATH_FILE`.

## 3. Quick start

```js
const { PD4ML, PageSize } = require('pd4ml');

const pd = new PD4ML();
pd.setPageSize(PageSize.A4);
pd.readHtmlString('<h1>Hello, PDF</h1><p>Generated with <b>PD4ML</b>.</p>');
pd.writePDF('hello.pdf');
```

Or in one call:

```js
const { htmlToPdf } = require('pd4ml');

const pdf = htmlToPdf(Buffer.from('<h1>Invoice 42</h1>'));
console.log(pdf.subarray(0, 5).toString());   // %PDF-
```

With TypeScript or ES modules:

<!-- no-test -->
```ts
import { PD4ML, PageSize } from 'pd4ml';

const pd = new PD4ML();
pd.setPageSize(PageSize.A4);
pd.readHtmlString('<h1>Hello</h1>');
const pdf: Buffer = pd.writePDF();
```

## 4. How it works

### 4.1 The two-phase model

A document is **read once and written any number of times**:

- `readHTML` parses the document and lays it out;
- each `writePDF`, `writeDOCX`, `writeRTF` or `renderAsImages` call then produces one output from
  that same layout.

Settings (page size, headers, fonts...) go before `readHTML`. See
[the two-phase model](https://pd4ml.com/docs/#6.1-the-two-phase-model).

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.readHtmlString('<h1>Quarterly report</h1>');
pd.writePDF('report.pdf');
pd.writeDOCX('report.docx');
const thumbnails = pd.renderPng();       // PNG images, one Buffer per page
```

### 4.2 The bridge, threads and the event loop

- **One bridge per process.** The first use of PD4ML starts a Java bridge process. It serves
  every conversion of the Node process and ends with it. Starting Java takes a fraction of a
  second; after that, converting an ordinary document takes milliseconds.
- **Synchronous calls.** Each call waits for Java's answer, like any other CPU-bound work in
  Node: a long conversion blocks the event loop while it runs. Behind the scenes a worker thread
  does the communication, so callbacks such as progress listeners
  ([5.14](#514-progress-diagnostics-and-metadata)) still run on your thread.
- **Servers with concurrent requests** stay responsive by converting in worker threads: each
  worker (`worker_threads`, or a pool such as `piscina`) can load `pd4ml` and convert on its own.
  Each worker starts its own bridge, unless all of them use one bridge server (next item).
- **Shared bridge server.** Several processes or workers, or short-lived ones (serverless,
  CLI tools), can use one long-running bridge instead of each starting Java:

  ```
  npx pd4ml serve --port 8723          # keep it running (systemd, a sidecar container, pm2)
  ```

  Then set `PD4ML_BRIDGE=tcp://127.0.0.1:8723`, or call
  `configure({ server: 'tcp://127.0.0.1:8723' })`. The server listens on the loopback
  interface only, and each connection has its own objects.
- **JVM options** (memory, system properties): set `PD4ML_JVM_OPTIONS="-Xmx2g"`, or call
  `configure({ jvmOptions: ['-Xmx2g'] })` before the first use. Java runs headless.
- **The bridge's console output** is discarded unless `PD4ML_BRIDGE_LOG=path` (or
  `configure({ logFile })`) keeps it. `shutdown()` stops the bridge; the next use starts it again.

### 4.3 Layout engines

PD4ML 4.2 introduces a second HTML layout engine, **v42**, written to match current browsers
closely (flexbox, grid, modern CSS). `new PD4ML()` uses it by default:

```js
const { PD4ML, hasLayoutEngines } = require('pd4ml');

if (hasLayoutEngines()) {
  const pd = new PD4ML();                          // v42
  const legacy = new PD4ML({ engine: 'v40' });     // the previous engine
  console.log(pd.engine, legacy.engine);
}
```

Builds before 4.2 have one engine only; this includes the current public release, 4.1.x. With
such a build:

- the module uses that build's engine and emits a warning once (`process.emitWarning`);
- `hasLayoutEngines()` returns false;
- asking for an engine explicitly throws.

### 4.4 JavaScript and Java values

- Java methods keep their **Java names** (`setPageSize`, `readHTML`...) and take JavaScript
  values: strings, numbers, booleans, `null`; arrays for Java arrays and lists; plain objects
  for `Map`s; `Buffer`/`Uint8Array` for `byte[]` and input streams.
- **Classes**: the PD4ML classes are exported under their own names (`PageSize`, `PageMargins`,
  `Units`, `Constants`, `PdfSpec`, `LayoutEngine`...). Static fields and methods are properties
  (`PageSize.A4`, `PdfSpec.getInstance('pdf/a-2b')`), constructors use `new`. Any other class:
  `Java.type('java.util.Locale')`.
- **Objects**: a Java object comes back as a proxy with all its Java methods. Helpers start with
  `$`, so they never hide a Java method: `$get('width')` and `$set(...)` for public fields,
  `$class`, `$enum` (an enum constant's name), `$instanceOf(...)`. `String(obj)` is Java's
  `toString()`.
- **Numbers**: JavaScript has one number type. An integer goes to Java as an `int`; where a
  method has both `int` and `float` overloads and you want the float one, pass
  `Java.float(10)`. Java numbers come back as JavaScript numbers, `byte[]` as a `Buffer`.
- Java objects are released when JavaScript garbage-collects them.

### 4.5 Exceptions

Java exceptions are thrown as `JavaError`, which knows the Java class and its superclasses:

```js
const { PD4ML, JavaError } = require('pd4ml');

try {
  const pd = new PD4ML();
  pd.readHTML('file:///no/such/document.html');
  pd.writePDF();
} catch (e) {
  if (e instanceof JavaError && e.isInstanceOf('java.io.IOException')) {
    console.log('cannot read the document:', e.javaMessage);
  } else {
    throw e;
  }
}
```

`e.javaClass`, `e.causes` and `e.javaTrace` hold the details. Other errors:

| Error | Thrown when |
|---|---|
| `BridgeError` | the bridge itself fails: no Java, no PD4ML build, or the process ended |
| `CallbackError` | a JavaScript callback threw, such as a progress listener; the original error is `cause` |
| `InstallError` | downloading PD4ML fails |

---

## 5. Use cases

The snippets below are complete and runnable. Files they read (`report.html`...) are assumed to
exist in the working directory.

### 5.1 HTML string to PDF

This is the common case for web applications: render HTML with your template engine
(Handlebars, EJS, Nunjucks, JSX to string) and convert it in memory.

```js
const { PD4ML } = require('pd4ml');

const html = '<html><body><h1>Order 1001</h1><p>Thank you for your order.</p></body></html>';

const pd = new PD4ML();
pd.readHtmlString(html);
const pdf = pd.writePDF();               // the PDF as a Buffer
```

`writePDF`, `writeDOCX` and `writeRTF` return the document as a `Buffer` when given no target.
Given a file path, a file descriptor, or a writable stream (an HTTP response, an
`fs.WriteStream`), they write into it.

### 5.2 Files and URLs

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.readHTML('report.html');              // also: 'https://example.com/report', a URL object
pd.writePDF('report.pdf');
```

**Relative links** (`<img src="logo.png">`, `<link href="style.css">`) resolve against the
document's own location when it is read from a path or URL. When the HTML comes from a string or
a `Buffer`, pass the base location. Otherwise images and stylesheets go missing without an error
(see [reading the source](https://pd4ml.com/docs/#6.2-reading-the-source)):

```js
const { PD4ML } = require('pd4ml');

const html = '<link rel="stylesheet" href="style.css"><p class="note">Styled</p>';
const pd = new PD4ML();
pd.readHtmlString(html, '.');            // a directory, file path or URL
pd.writePDF('styled.pdf');
```

For a document in a known encoding other than UTF-8, call
`pd.readHTML(buffer, baseUrl, 'windows-1251')`. To read from a stream, collect it into a Buffer
first (`Buffer.concat(chunks)`, or `await new Response(stream).arrayBuffer()`).

### 5.3 Page size, orientation, margins and scaling

```js
const { PD4ML, PageSize, PageMargins, Units } = require('pd4ml');

const pd = new PD4ML();
pd.setPageSize(PageSize.LETTER.rotate());                     // landscape
pd.setPageMargins(new PageMargins(15, 20, 15, 20, Units.MM)); // left, top, right, bottom
pd.setHtmlWidth(1000);           // the virtual browser width the page is laid out in
pd.readHtmlString("<table width='100%'><tr><td>wide content</td></tr></table>");
pd.writePDF('landscape.pdf');
```

The layout is scaled to the page: `scale = printable width / html width`, so a smaller HTML width
makes everything larger. Related controls:

- `adjustHtmlWidth(true)` lays the page out at the document's own natural width.
- `fitPageVertically(Constants.CENTER_ALIGN)` shrinks the whole document onto a single page.
- `setPageSize` and `setPageMargins` accept a page *scope* (`'1'`, `'2+'`, `'odd'`...) as a
  second argument.

More in [page layout](https://pd4ml.com/docs/#7.-page-layout-size-margins-and-scaling).

For a custom size, use `new PageSize(Java.float(100), Java.float(150), Units.MM)`. For a named
size, use `PageSize.getInstance('a5')` (the name in lower case).

### 5.4 Headers, footers and page numbers

Headers and footers are HTML fragments. PD4ML fills in `$[page]`, `$[total]` and `$[title]` on
each page, and `setDynamicData` adds placeholders of your own. In JavaScript, write them in
ordinary quotes; inside a template literal, `$[...]` is safe too (only `${...}` is interpolated).

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.setDynamicData({ customer: 'Acme Corp.', invoice: 'INV-2026-0031' });
pd.setPageHeader("<div style='font-size:9pt'><b>$[title]</b></div>", 30, '1+');
pd.setPageFooter(
  "<div style='font-size:8pt; text-align:right'>"
  + 'Invoice $[invoice] &mdash; $[customer] &mdash; page $[page] of $[total]</div>',
  24, '1+');
pd.readHtmlString('<title>Invoice</title><h1>Invoice</h1>' + '<p>Line item</p>'.repeat(80));
pd.writePDF('invoice.pdf');
```

The second argument is the area height in pixels. The third is the page scope: `'1'` (first
page), `'2+'` (all but the first), `'odd'`, `'even'`, `'3-7'`... You can also write headers and
footers inline in the HTML with PD4ML's extension tags. See
[headers, footers, watermarks and backgrounds](https://pd4ml.com/docs/#8.-headers-footers-watermarks-and-backgrounds)
and the [usage examples](https://pd4ml.com/docs/usage-examples.html#set-page-header-and-footer).

### 5.5 Watermarks and page backgrounds

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.setWatermark("<span style='font-size:72pt; color:#c00'>DRAFT</span>",
  120, 350,      // left, top (px)
  0.15,          // opacity
  45,            // rotation, degrees
  1,             // scale
  true, true,    // visible on screen, in print
  '1+');         // pages
pd.setPageBackground("<div style='background:#f7f7f2; height:100%'></div>", '1+');
pd.readHtmlString('<h1>Proposal</h1>');
pd.writePDF('draft.pdf');
```

### 5.6 Fonts

PD4ML's built-in fonts cover Unicode broadly. For a specific typeface (a corporate font, CJK
coverage), give it a font directory:

<!-- no-test -->
```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.useTTF('/opt/fonts', true);     // a directory of TTF/OTF fonts (indexed: see below)
pd.embedTTFs(true, false);         // embed only the glyphs used
pd.applyKerning(true);
pd.enableLigatures(true);
```

Index a font directory once, ahead of time. PD4ML then reads the index (`pd4fonts.properties`)
instead of scanning all the fonts on every conversion
([font indexing](https://pd4ml.com/docs/#4.3-font-indexing)):

```
java -jar <pd4ml jar> -configure.fonts /opt/fonts
```

`require('pd4ml').installedJar()` returns the jar's path. CSS `@font-face` web fonts in the
document work as well.

### 5.7 Bookmarks, links and tables of contents

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.generateBookmarksFromHeadings(true);    // one PDF bookmark per <h1>..<h6>
pd.enableHyperlinks(true);                 // <a href> become clickable links (the default)
pd.readHtmlString("<h1>Introduction</h1><p>...</p><h1 style='page-break-before:always'>Details</h1>");
pd.writePDF('bookmarked.pdf');
```

PD4ML's `<pd4ml:toc>` tag generates a table of contents with page numbers from the headings; see
the [usage examples](https://pd4ml.com/docs/usage-examples.html#add-toc). For explicit page
breaks, use CSS `page-break-before` / `break-before`, or `<pd4ml:page.break>`.

### 5.8 PDF/A and PDF/UA

```js
const { PD4ML, PdfSpec, Constants } = require('pd4ml');

const pd = new PD4ML();
pd.readHtmlString("<html lang='en'><title>Annual report</title><h1>Annual report</h1>");
pd.writePDF('archive.pdf', PdfSpec.PDFA_3B);                        // archival
pd.writePDF('accessible.pdf', PdfSpec.PDFUA_1);                     // accessible
pd.writePDF('both.pdf', PdfSpec.PDF_1_7.combine(PdfSpec.PDFA_2A));
pd.writePDF('keyword.pdf', 'pdf/a-2b');                             // by keyword

const status = pd.getLastRenderInfo(Constants.PD4ML_PDFA_STATUS);   // after writing
```

`PdfSpec.listKeywords()` lists the keywords; an unknown one throws a `RangeError`
(`PdfSpec.getInstance` alone would fall back to PDF 1.7 without an error).

- PDF/A embeds all fonts.
- PDF/UA needs well-structured HTML: real headings, `alt` texts, `lang`, table headers.
  Combine it with `pd.setErrorPolicy(ErrorPolicy.PEDANTIC)` to be told when the source does not
  satisfy the standard.

Details: [PDF/A, PDF/UA and e-invoicing](https://pd4ml.com/docs/#11.2-pdfa-pdfua-and-e-invoicing-formats).

### 5.9 ZUGFeRD / Factur-X e-invoices

`PdfSpec.ZUGFeRD` and `PdfSpec.FacturX` select the PDF/A-3 container the standards require. The
HTML attaches the invoice XML with PD4ML's attachment tag. The
[ZUGFeRD and Factur-X page](https://pd4ml.com/docs/features/zugferd-and-factur-x-pdf-invoices.html)
has the complete recipe, including the required attachment names.

<!-- no-test -->
```js
const { PD4ML, PdfSpec } = require('pd4ml');

const pd = new PD4ML();
pd.readHTML('invoice.html');            // contains the <pd4ml:attachment> of factur-x.xml
pd.writePDF('invoice.pdf', PdfSpec.FacturX);
```

### 5.10 Passwords and permissions

```js
const { PD4ML, Constants } = require('pd4ml');

const pd = new PD4ML();
pd.setPermissions('owner-secret', Constants.AllowPrint | Constants.AllowCopy, Constants.AES_256BIT);
pd.readHtmlString('<p>Confidential</p>');
pd.writePDF('protected.pdf');
```

Combine the `Allow*` flags with `|`, or start from `Constants.DefaultPermissions` and remove flags
with `& ~`. Encryption needs the Bouncy Castle jars, which the installation downloads. See
[permissions and encryption](https://pd4ml.com/docs/#11.1-permissions-and-encryption).

### 5.11 Word (DOCX, RTF) and images

```js
const { PD4ML, Constants } = require('pd4ml');

const pd = new PD4ML();
pd.readHtmlString('<h1>Letter</h1><p>Dear customer, ...</p>');
pd.writeDOCX('letter.docx');
pd.writeRTF('letter.rtf');
const pages = pd.renderPng();                                 // a PNG Buffer per page
const tiffs = pd.renderAsImages(Constants.TIFF);              // one TIFF per page
pd.renderAsImages('pages', 'page', Constants.PNG24);          // page files in a directory
```

The image formats are `PNG8`, `PNG24`, `TIFF` and `TIFF_COMPRESSED` (constants in `Constants`).
The TIFF formats need Java 9 or later.
The v42 engine does not support the multi-page TIFF formats yet; use the v40 engine for them.

With the v42 engine, DOCX/RTF output can be made *editable*: positioned content becomes text
boxes and form fields instead of pictures. To enable it, call
`pd.setParam(Constants.PD4ML_WORD_EDITABLE, 'true')`.

### 5.12 Interactive forms and multi-column layout

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.generateForms(true, null);          // <input>/<select>/<textarea> become PDF form fields
pd.readHtmlString("<form>Name: <input name='name' size='30'></form>");
pd.writePDF('form.pdf');

const news = new PD4ML();
news.generateMulticolumn(2, 20, true); // two columns, 20 mm apart
news.readHtmlString('<h1>Newsletter</h1>' + '<p>Lorem ipsum dolor sit amet.</p>'.repeat(200));
news.writePDF('newsletter.pdf');
```

See [forms](https://pd4ml.com/docs/#10.1-interactive-pdf-forms) and
[multi-column pages](https://pd4ml.com/docs/#10.2-multi-column-pages). Multi-column pages need
PD4ML 4.0.24 / 4.1.2 or later.

### 5.13 Adding CSS and HTML programmatically

```js
const { PD4ML } = require('pd4ml');

const pd = new PD4ML();
pd.addStyle('body { font-family: sans-serif } h1 { color: #036 }', true);   // true: after the document's styles
pd.injectHtml("<div style='font-size:8pt'>Generated by the reporting service</div>", false);  // before </body>
pd.readHtmlString('<h1>Report</h1>');
pd.writePDF('report-styled.pdf');
```

`addStyle` also takes the URL of a stylesheet: `pd.addStyle(toUrl('print.css'), true)`. See
[injecting HTML](https://pd4ml.com/docs/#10.3-injecting-html-and-custom-resource-providers) and
[adding styles](https://pd4ml.com/docs/usage-examples.html#add-style-programmatically).

### 5.14 Progress, diagnostics and metadata

```js
const { PD4ML, ErrorPolicy, Constants } = require('pd4ml');

const pd = new PD4ML();
pd.monitorProgressWith((messageId, percent, note, msec) =>
  console.log(`${String(percent).padStart(3)}% ${note || ''} (${msec} ms)`));
pd.setErrorPolicy(ErrorPolicy.NORMAL);   // NONE, RELAXED, NORMAL, PEDANTIC, STRICT
pd.setLogLevel(1);                       // 0 (silent) .. 5
pd.setAuthorName('Reporting service');
pd.setDocumentTitle('Monthly statement');
pd.addMetadata('StatementId', '2026-10', false);
pd.readHtmlString('<h1>Statement</h1>');
pd.writePDF('statement.pdf');
const pages = Number(pd.getLastRenderInfo(Constants.PD4ML_TOTAL_PAGES));
```

The callback runs on your thread while the conversion runs in Java, and it may call PD4ML
itself. An error it throws comes out of the call that caused it, wrapped in a `CallbackError`.
The v42 engine currently reports fewer progress stages than v40. More in
[extensibility and diagnostics](https://pd4ml.com/docs/#12.-extensibility-and-diagnostics).

### 5.15 Working with existing PDFs

```js
const { htmlToPdf, openPdf, writePdf, mergePdfs } = require('pd4ml');

const cover = htmlToPdf(Buffer.from("<h1 style='margin-top:300px; text-align:center'>Annual Report</h1>"));
const body = htmlToPdf(Buffer.from('<h2>Chapter 1</h2><p>...</p>'));

const doc = openPdf(cover);               // a Buffer, a path or a URL (+ password)
doc.append(openPdf(body));                // pages of another document after these
doc.setTitle('Annual Report');
writePdf(doc, 'annual-report.pdf');

const stamp = htmlToPdf(Buffer.from("<p style='color:#c00; font-size:40pt'>COPY</p>"));
const original = openPdf('annual-report.pdf');
original.overlay(openPdf(stamp), 128);    // draw over every page, half opaque (0..255)
writePdf(original, 'annual-report-copy.pdf', { password: 'secret' });

console.log(openPdf('annual-report.pdf').getNumberOfPages());
const both = mergePdfs(cover, body);      // two documents appended in one call
```

`underlay` draws another document *under* the pages (a letterhead, for example);
`deletePage`, `getPageSize`, `getMetadata` and `dumpOutlines` inspect and edit a document.
PD4ML's PDF toolkit (signing, optimisation, XFDF) is described in
[the PDF post-processing toolkit](https://pd4ml.com/docs/#15.-the-pdf-post-processing-toolkit)
and is reachable through `Java.type(...)`.

### 5.16 Web applications

Express:

<!-- no-test -->
```js
const express = require('express');
const { PD4ML } = require('pd4ml');

const app = express();
app.get('/invoice/:number.pdf', (req, res) => {
  const pd = new PD4ML();
  pd.readHtmlString(renderInvoiceHtml(req.params.number), __dirname + '/public');  // base: images/CSS
  res.type('application/pdf');
  res.send(pd.writePDF());
});
app.listen(3000);
```

Plain `http`, streaming into the response:

<!-- no-test -->
```js
const http = require('http');
const { PD4ML } = require('pd4ml');

http.createServer((req, res) => {
  const pd = new PD4ML();
  pd.readHtmlString(renderReportHtml(req.url), __dirname);
  res.writeHead(200, { 'Content-Type': 'application/pdf' });
  pd.writePDF(res);         // writes into the response
  res.end();
}).listen(3000);
```

Each conversion holds the event loop while it runs ([4.2](#42-the-bridge-threads-and-the-event-loop)).
For a server under concurrent load, convert in worker threads, and touch PD4ML when the
application starts (`require('pd4ml').version()`), so the first request does not pay for
starting Java.

### 5.17 Batch conversion

```js
const fs = require('fs');
const { PD4ML } = require('pd4ml');

for (const source of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
  const pd = new PD4ML();                 // one converter per document
  pd.readHTML(source);
  pd.writePDF(source.replace(/\.html$/, '.pdf'));
  console.log(`written ${source}`);
}
```

One bridge serves the whole loop. To convert in parallel, run several worker threads or
processes (each with its own bridge), or point them all at one bridge server.

### 5.18 Licensing

<!-- no-test -->
```js
const { PD4ML, version } = require('pd4ml');

const pd = new PD4ML({ license: 'YOUR-SERIAL-NUMBER' });   // or a license file URL; or pd4ml.lic in the working dir / classpath
if (pd.isDemoMode()) console.log('unlicensed: output is watermarked');
console.log(`PD4ML ${version()}${pd.isPro() ? ' pro' : ''}`);
```

Without a license, PD4ML is fully functional but marks its output. See
[licensing](https://pd4ml.com/docs/#3.-licensing).

---

## 6. Tips and hints

- **Start the bridge early.** The first use starts Java. Touch PD4ML when the application
  starts, or use a bridge server for short-lived processes.
- **One converter per document.** `new PD4ML()` is cheap; reuse the bridge, not the object.
- **Set the base location for HTML from strings.** Missing images and unstyled output are almost
  always caused by unresolved relative links ([details](https://pd4ml.com/docs/#6.2-reading-the-source)).
- **Settings go before `readHTML`.** Page size, headers, fonts and styles apply to the layout
  `readHTML` makes; writes afterwards only choose the output format.
- **Write several formats from one read.** PDF, DOCX and page images from a single `readHTML`
  cost one layout.
- **Print CSS works.** `@page { size: A4 landscape; margin: 15mm }`, `@media print` and
  `page-break-*` / `break-*` are honoured. They are often simpler than API calls.
- **Control the scale with the HTML width.** If text is too small, or a layout wraps
  differently than in the browser, set `setHtmlWidth` to the width the page was designed for.
- **Index fonts once** with `-configure.fonts`, instead of pointing `useTTF` at a large
  unindexed directory on every conversion.
- **Restrict what documents can load** when converting untrusted HTML. Use `setParam` with
  `Constants.PD4ML_ALLOWED_RESOURCE_LOCATION` and `PD4ML_DISABLE_EXTERNAL_ATTACHMENTS`.
- **TypeScript**: the package's declarations cover the whole PD4ML API, so editors complete the
  Java methods too.
- **Pin the build in production.** Use `npx pd4ml install <version>` or a `PD4ML_CLASSPATH` to a
  jar you keep, rather than following the latest release.

## 7. Troubleshooting

| Symptom | Cause and remedy |
|---|---|
| `BridgeError: PD4ML not found` | No build is configured and the automatic download is off (`PD4ML_AUTO_INSTALL=0`) or failed: run `npx pd4ml install`, or set `PD4ML_CLASSPATH`. |
| `BridgeError: cannot start java` / "the PD4ML bridge exited" | Java is missing or failed. Check `java -version`, set `JAVA_HOME` or `PD4ML_JAVA`; `PD4ML_BRIDGE_LOG=file` keeps Java's output. |
| `BridgeError: cannot connect to the PD4ML bridge` | The bridge server is not running, or `PD4ML_BRIDGE` names another port. |
| A pause and a "downloading" notice on the first conversion | The automatic first-use download ([2.2](#22-install-pd4ml)). Run `npx pd4ml install` at deployment instead. |
| The server stops responding during conversions | Conversions are synchronous; convert in worker threads ([4.2](#42-the-bridge-threads-and-the-event-loop)). |
| Images or styles missing | Relative links have no base location, or the server cannot reach the resources (proxies, authentication). See `setCookie` and `setHttpOptions`. |
| Output is watermarked | No license is installed ([licensing](https://pd4ml.com/docs/#3.-licensing)). |
| Squares instead of characters | The fonts lack those glyphs. Provide fonts with `useTTF` ([fonts](https://pd4ml.com/docs/#9.-fonts-bookmarks-and-hyperlinks)). |
| `NoClassDefFoundError: org/bouncycastle/...` with `setPermissions` | The Bouncy Castle jars are missing. Install without `--no-bouncycastle`, or add them to the classpath. |
| `NoClassDefFoundError: com/sun/media/jai/...` with `renderAsImages` / `renderPng` | PD4ML 4.1.1 and earlier need the Java Advanced Imaging jars for page images. Use a newer PD4ML build, or add `jai-core` and `jai-codec` 1.1.3 (from the JBoss Maven repository) to the classpath. |
| Warning "has no v42 layout engine" | The PD4ML build predates 4.2, so the conversion uses its own engine. Use a 4.2 build for v42. |
| `JavaError: ... NoSuchMethodException` | No Java method of that name takes those argument types. Check [api.md](api.md); pass floats with `Java.float(10)`, binary data as a `Buffer`. |

## 8. API reference

### Module exports

| Export | |
|---|---|
| `PD4ML` | the converter: `new PD4ML({ license, htmlWidth, engine })`; every Java method of `com.pd4ml.PD4ML` |
| `PageSize`, `PageMargins`, `Units`, `Dimensions`, `Constants`, `LayoutEngine`, `ErrorPolicy`, `PdfSpec`, `PdfDocument`, `ProgressListener`, `StatusMessage`, `ResourceProvider`, `CustomTag` | the PD4ML Java classes ([api.md](api.md)) |
| `htmlToPdf(source, target, options)`, `openPdf(source, password)`, `writePdf(doc, target, { password, permissions })`, `mergePdfs(a, b, target)` | one-call conversion and PDF documents |
| `version()`, `hasLayoutEngines()`, `toUrl(location)`, `pdfSpec(keyword)` | runtime helpers |
| `configure(options)`, `shutdown()` | the bridge: `classpath`, `java`, `jvmOptions`, `server`, `logFile` |
| `install(version, options)`, `installedJar()`, `installedClasspath()`, `installedVersion()`, `availableVersions()` | PD4ML builds |
| `Java.type(name)`, `Java.proxy(iface, fn)`, `Java.float(n)` | any Java class, Java interfaces implemented in JavaScript, float arguments |
| `JavaError`, `BridgeError`, `CallbackError`, `InstallError` | errors |

### `PD4ML` methods with Node additions

| Method | |
|---|---|
| `readHTML(source, baseUrl, encoding)` | `source`: a path, URL string or object, `Buffer`/`Uint8Array`, or a Java `URL`/`InputStream` |
| `readHtmlString(html, baseUrl)` | the document as a string |
| `writePDF(target, spec)` | `target`: a path, file descriptor or writable stream; none: returns a `Buffer`. `spec`: a `PdfSpec`, a keyword (`'pdf/a-2b'`) or `'PDF'`/`'PDFA'`/`'PDFUA'` |
| `writeDOCX(target)`, `writeRTF(target, rtfWmf)` | as `writePDF` |
| `renderAsImages(format)`, `renderPng()` | pages as encoded images (Buffers); `renderAsImages(dir, name, format)` writes files |
| `monitorProgressWith(fn)` | a function `(messageId, progress, note, msec)` or a Java `ProgressListener` |
| `useHtmlRenderer(engine, htmlWidth, params)` | the layout engine by name; `pd.engine` tells which one is in use |

All other methods are those of the Java class `com.pd4ml.PD4ML` ([api.md](api.md#pd4ml),
[Java API](https://pd4ml.com/docs/#6.-the-java-api)); static ones are called on the class
(`PD4ML.getVersion()`). The Java object itself is `pd.java`.

`ResourceProvider` and `CustomTag` are extended in **Java**: register yours with
`addCustomResourceProvider` / `addCustomTagHandler`, and put its classes on the classpath. Java
*interfaces* (such as `ProgressListener`) can be implemented in JavaScript with `Java.proxy()`.
Examples: [resource loaders](https://github.com/zxfr/pd4ml-examples/blob/master/src/main/java/advanced/A005AddCustomResourceLoader.java),
[custom tags](https://github.com/zxfr/pd4ml-examples/blob/master/src/main/java/advanced/A008AddingCustomTagRenderer.java).

## 9. Further reading

- [PD4ML documentation](https://pd4ml.com/docs/) and the full [programmer's manual](https://pd4ml.com/docs/pd4ml-manual.html)
- [Usage examples](https://pd4ml.com/docs/usage-examples.html)
- [HTML5 element support matrix](https://pd4ml.com/docs/html5-element-support-matrix.html)
- [Command-line tool reference](https://pd4ml.com/docs/pd4cmd-command-line-reference.html)
- [ZUGFeRD and Factur-X invoices](https://pd4ml.com/docs/features/zugferd-and-factur-x-pdf-invoices.html)
- [PDF post-processing toolkit](https://pd4ml.com/docs/#15.-the-pdf-post-processing-toolkit)
- [Java examples on GitHub](https://github.com/zxfr/pd4ml-examples)
