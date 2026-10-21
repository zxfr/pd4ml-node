// Type declarations of pd4ml (PD4ML for Node.js). The part after the marker line is generated
// by tools/gen-types.js from the PD4ML Java classes; this header is tools/types-header.d.ts.

/// <reference types="node" />

/** A Java object living in the bridge: call any Java method by its Java name. */
export interface JavaObject {
  /** The Java class name (`com.pd4ml.PageSize`). */
  readonly $class: string;
  /** For an enum constant, its name (`v42`, `MM`); else null. */
  readonly $enum: string | null;
  /** Reads a public field. */
  $get(field: string): any;
  /** Writes a public field. */
  $set(field: string, value: unknown): void;
  /** Calls a Java method by name. */
  $call(method: string, ...args: unknown[]): any;
  /** Whether the object is an instance of the Java class or interface. */
  $instanceOf(javaClass: string): boolean;
  /** Java `toString()`. */
  toString(): string;
  /** Any other Java method. */
  [method: string]: any;
}

/** A Java class: static fields and methods as properties, constructors with `new`. */
export interface JavaClass {
  readonly $name: string;
  new (...args: unknown[]): JavaObject;
  $new(...args: unknown[]): JavaObject;
  $get(field: string): any;
  $set(field: string, value: unknown): void;
  $call(method: string, ...args: unknown[]): any;
}

/** A number passed to Java as a float/double (`Java.float(10)`). */
export interface JavaFloat {
  readonly value: number;
}

/** Where output goes: a file path, a file descriptor, or a writable stream (`write()`). */
export type Target = string | URL | number | { write(data: Buffer): unknown };

/** A document to read: a path or URL, its bytes, or a Java URL/InputStream. */
export type Source = string | URL | Buffer | Uint8Array | JavaObject;

export interface PD4MLOptions {
  /** A license serial number or license file URL (default: pd4ml.lic, else evaluation mode). */
  license?: string;
  /** The width in pixels the HTML is laid out in. */
  htmlWidth?: number;
  /** 'v42' (default where the build has it), 'v40', a LayoutEngine, or false for the Java default. */
  engine?: 'v42' | 'v40' | LayoutEngine | false;
}

/**
 * An HTML to PDF/DOCX/RTF/image converter: com.pd4ml.PD4ML with Node I/O and the v42 layout
 * engine by default. Every Java method is available by its Java name.
 */
export interface PD4ML extends PD4MLJava {
  /** The Java object (com.pd4ml.PD4ML). */
  readonly java: JavaObject;
  /** The layout engine chosen ('v42', 'v40'), or null for the build's own. */
  readonly engine: string | null;
  useHtmlRenderer(engine?: 'v42' | 'v40' | LayoutEngine, htmlWidth?: number | null, params?: Record<string, string | number> | null): void;
  readHTML(source: Source, baseUrl?: string | null, encoding?: string | null): void;
  readHtmlString(html: string, baseUrl?: string | null): void;
  writePDF(): Buffer;
  writePDF(target: null, spec?: string | PdfSpec | null): Buffer;
  writePDF(target: Target, spec?: string | PdfSpec | null): void;
  writeDOCX(): Buffer;
  writeDOCX(target: Target): void;
  writeRTF(): Buffer;
  writeRTF(target: null, rtfWmf?: boolean): Buffer;
  writeRTF(target: Target, rtfWmf?: boolean): void;
  renderAsImages(format: string): Buffer[];
  renderAsImages(directory: string, name: string, format: string): JavaObject;
  renderAsImages(): JavaObject[];
  renderPng(): Buffer[];
  monitorProgressWith(listener: ((messageId: number, progress: number, note: string | null, msec: number) => void) | JavaObject): void;
}

export const PD4ML: {
  new (options?: PD4MLOptions): PD4ML;
  readonly DEFAULT_ENGINE: 'v42';
} & PD4MLStatics;

export const Java: {
  /** Any Java class by name (`Java.type('java.util.Locale')`). */
  type(name: string): JavaClass & { [member: string]: any };
  /** A Java object implementing `iface`; its methods call `fn(method, args)`. */
  proxy(iface: string, fn: (method: string, args: any[]) => void): JavaObject;
  /** A number passed as a Java float/double. */
  float(value: number): JavaFloat;
  isJavaObject(value: unknown): boolean;
};

export interface HtmlToPdfOptions {
  baseUrl?: string;
  pageSize?: PageSize;
  pageMargins?: PageMargins;
  spec?: string | PdfSpec;
  engine?: PD4MLOptions['engine'];
  htmlWidth?: number;
}
export function htmlToPdf(source: Source, target?: null, options?: HtmlToPdfOptions): Buffer;
export function htmlToPdf(source: Source, target: Target, options?: HtmlToPdfOptions): void;
export function openPdf(source: string | URL | Buffer | Uint8Array, password?: string | null): PdfDocument;
export function writePdf(document: PdfDocument, target?: null, options?: { password?: string; permissions?: number }): Buffer;
export function writePdf(document: PdfDocument, target: Target, options?: { password?: string; permissions?: number }): void;
export function mergePdfs(first: string | Buffer | Uint8Array, second: string | Buffer | Uint8Array, target?: null): Buffer;
export function mergePdfs(first: string | Buffer | Uint8Array, second: string | Buffer | Uint8Array, target: Target): void;

export function version(): string;
export function hasLayoutEngines(): boolean;
export function toUrl(location: string | URL | JavaObject): JavaObject;
export function pdfSpec(spec: string | PdfSpec | null): string | PdfSpec | null;
export function configure(options: { classpath?: string[]; java?: string; jvmOptions?: string[]; server?: string; logFile?: string }): void;
export function shutdown(): void;

export interface InstallOptions {
  snapshots?: boolean;
  jakarta?: boolean;
  repository?: string;
  home?: string;
  force?: boolean;
  quiet?: boolean;
  bouncycastle?: boolean;
}
export function install(version?: string, options?: InstallOptions): string;
export function installedJar(home?: string): string | null;
export function installedClasspath(home?: string): string[];
export function installedVersion(home?: string): string | null;
export function availableVersions(repository?: string): string[];

export class BridgeError extends Error {}
export class JavaError extends Error {
  readonly javaClass: string;
  readonly hierarchy: string[];
  readonly javaMessage: string;
  readonly causes: string[];
  readonly javaTrace: string;
  isInstanceOf(javaClass: string): boolean;
}
export class CallbackError extends Error {}
export class InstallError extends Error {}

// ---- generated by tools/gen-types.js from the PD4ML Java classes - do not edit below ----

/** The Java class `com.pd4ml.PD4ML`. */
export interface PD4MLJava extends JavaObject {
  applyLicense(license: string): boolean;
  isDemoMode(): boolean;
  isPro(): boolean;
  merge(pdf: PdfDocument, fromPage: number | JavaFloat, toPage: number | JavaFloat, append: boolean): void;
  terminate(): void;
  setLogLevel(level: number | JavaFloat): void;
  setErrorPolicy(policy: ErrorPolicy): void;
  useTTF(pathToFontDirs: string): void;
  useTTF(pathToFontDirs: string, generateFontMappingFileIfMissing: boolean): void;
  useTTF(pathToFontDirs: string, fontFileNameFilter: string): void;
  embedTTFs(embed: boolean, allGlyphs: boolean): void;
  generateForms(enable: boolean, useTtfFont: string): void;
  generateForms(enable: boolean, useTtfFont: string, formFontCharRange: string): void;
  isGenerateForms(): boolean;
  getFormFont(): string;
  getFormFontCharRange(): string;
  generateMulticolumn(columns: number | JavaFloat, span: number | JavaFloat, millimeters: boolean): void;
  useHttpRequest(httpRequest: unknown, httpResponse: unknown): void;
  addCustomResourceProvider(customProviderClassName: string): void;
  addCustomTagHandler(customTagName: string, implementation: CustomTag): void;
  generateBookmarksFromHeadings(enable: boolean): void;
  generateBookmarksFromAnchors(enable: boolean): void;
  generateBookmarksFromHeadings(): boolean;
  generateBookmarksFromAnchors(): boolean;
  setSessionID(sessionID: string): void;
  overrideDocumentEncoding(encoding: string): void;
  enableHyperlinks(enable: boolean): void;
  isHyperlinksDisabled(): boolean;
  isGenerateTooltips(): boolean;
  setPageHeader(htmlCode: string, heightPx: number | JavaFloat): void;
  setPageHeader(htmlCode: string, heightPx: number | JavaFloat, scope: string): void;
  setPageFooter(htmlCode: string, heightPx: number | JavaFloat): void;
  setPageFooter(htmlCode: string, heightPx: number | JavaFloat, scope: string): void;
  setWatermark(htmlCode: string, left: number | JavaFloat, top: number | JavaFloat, opacity: number | JavaFloat, angle: number | JavaFloat, scale: number | JavaFloat, screen: boolean, print: boolean, scope: string): void;
  setPageBackground(htmlCode: string): void;
  setPageBackground(htmlCode: string, scope: string): void;
  setPermissions(password: string, permissions: number | JavaFloat): void;
  setPermissions(password: string, permissions: number | JavaFloat, encryptionMethod: number | JavaFloat): void;
  setCookie(name: string, value: string): void;
  setHttpOptions(proxy: string, basicAuthentication: string): void;
  addDocumentActionHandler(actionType: string, javaScript: string): void;
  getActionHandlers(): JavaObject;
  setPageSize(d: PageSize, scope: string): void;
  setPageSize(d: PageSize): void;
  getPageSize(pageNum: number | JavaFloat): PageSize;
  setPageMargins(margins: PageMargins): void;
  setPageMargins(margins: PageMargins, scope: string): void;
  getPageMargins(pageNum: number | JavaFloat, imageGeneration: boolean): PageMargins;
  setHtmlWidth(width: number | JavaFloat): void;
  adjustHtmlWidth(adjust: boolean): void;
  fitPageVertically(align: number | JavaFloat): void;
  getFitPageVertically(): number;
  setAuthorName(name: string): void;
  setDocumentTitle(title: string): void;
  setInitialPageNumber(initialPageNumber: number | JavaFloat): void;
  addStyle(stylesheet: string | URL | JavaObject, overrideDocumentStyles: boolean): void;
  addStyle(stylesheet: string, overrideDocumentStyles: boolean): void;
  injectHtml(htmlSnippet: string, prependBodyContent: boolean): void;
  isKeepTrailingBlankPages(): boolean;
  testTermination(): void;
  getHeight(width: number | JavaFloat): number;
  getDocumentTitle(): string;
  setRenderingHints(hints: Record<string, string>): void;
  dump(mode: number | JavaFloat): string;
  protectPhysicalUnitDimensions(keepPhysicalUnitDimensions: boolean): void;
  setDynamicData(map: Record<string, string>): void;
  setParam(key: string, value: string): void;
  getLastRenderInfo(key: string): unknown;
  outputRange(description: string): void;
  addMetadata(key: string, value: string, hide: boolean): void;
  applyKerning(enable: boolean): void;
  enableLigatures(enable: boolean): void;
  getCache(): unknown;
  setCache(fontCache: unknown): void;
  asyncResourceLoader(threadPoolSize: number | JavaFloat): void;
}
export interface PD4MLStatics {
  disableBatik: boolean;
  disableMathML: boolean;
  getVersion(): string;
  getVersionBuildDate(): JavaObject;
  translateToPt(mm: number | JavaFloat): number;
  predictScale(pageMargins: PageMargins, pageSize: PageSize, userSpace: number | JavaFloat): number;
  predictPageHeight(pageMargins: PageMargins, pageSize: PageSize, userSpace: number | JavaFloat): number;
}

/** The Java class `com.pd4ml.Constants`. */
export interface Constants extends JavaObject {
}
export interface ConstantsClass extends JavaClass {
  new (): Constants;
  readonly TRANSLATE_FACTOR: number;
  readonly DefaultPermissions: number;
  readonly AllowDegradedPrint: number;
  readonly AllowModify: number;
  readonly AllowCopy: number;
  readonly AllowAnnotate: number;
  readonly AllowFillingForms: number;
  readonly AllowContentExtraction: number;
  readonly AllowAssembly: number;
  readonly AllowPrint: number;
  readonly PD4ML_MAX_CACHE_ENTRIES: string;
  readonly PD4ML_MAX_CACHE_SIZE: string;
  readonly PD4ML_MAX_CACHE_VOLUME: string;
  readonly PD4ML_IDS_AS_DESTINATIONS: string;
  readonly PD4ML_EXTRA_RESOURCE_LOADERS: string;
  readonly PD4ML_DOCUMENT_VIEW_MODE: string;
  readonly PD4ML_DOCUMENT_DATE: string;
  readonly PD4ML_WORD_EDITABLE: string;
  readonly PD4ML_DOCUMENT_XMP_DATE: string;
  readonly PD4ML_FAKE_BROWSER: string;
  readonly PD4ML_CACHE_ENABLE: string;
  readonly PD4ML_SESSIONID_APPEND: string;
  readonly PD4ML_SOCKET_TIMEOUT: string;
  readonly PD4ML_PRINT_DIALOG_POPUP: string;
  readonly PD4ML_MEDIA_TYPE_PRINT: string;
  readonly PD4ML_CSS_IMPORT_DIRECTIVE: string;
  readonly PD4ML_SESSIONID_VARNAME: string;
  readonly PD4ML_INITIAL_PAGE_NUMBER: string;
  readonly PD4ML_HTML_IN_DYNAMIC_DATA: string;
  readonly PD4ML_ALLOWED_RESOURCE_LOCATION: string;
  readonly PD4ML_DISABLE_EXTERNAL_ATTACHMENTS: string;
  readonly PD4ML_GENERATE_TOOLTIPS: string;
  readonly PD4ML_CACHE_IMAGES_IN_TMP_DIR: string;
  readonly PD4ML_HTTP_REQUEST_DISPATCHER: string;
  readonly PD4ML_PDFA_STATUS: string;
  readonly PD4ML_DOCUMENT_HEIGHT_PX: string;
  readonly PD4ML_RIGHT_EDGE_PX: string;
  readonly PD4ML_TOTAL_PAGES: string;
  readonly PD4ML_INFO_AUTHOR: string;
  readonly PD4ML_INFO_TITLE: string;
  readonly PD4ML_FORCE_RTL: string;
  readonly PD4ML_BACKGROUND_AS_PATTERNS: string;
  readonly PD4ML_CONFIG_FILE: string;
  readonly PD4ML_CONFIG_HANDLER_CLASS: string;
  readonly PD4ML_IMAGE_REPOSITORY: string;
  readonly PD4ML_FIX20130116: string;
  readonly PD4ML_STYLESHEETS_TO_OMIT: string;
  readonly PD4ML_ENABLE_HTTP_ERRORS: string;
  readonly PD4ML_OMIT_DEFAULT_STYLE: string;
  readonly PD4ML_DUMP_DEFAULT_STYLE: string;
  readonly PD4ML_HEADER_HEIGHT_LIMIT: string;
  readonly PD4ML_KEEP_TRAILING_BLANK_PAGES: string;
  readonly PD4ML_DISABLE_WOFF: string;
  readonly PD4ML_DISABLE_WOFF2: string;
  readonly PD4ML_PDF_BROTLI: string;
  readonly PDF: string;
  readonly PDFA: string;
  readonly PDFUA: string;
  readonly DOCX: string;
  readonly RTF: string;
  readonly RTF_WMF: string;
  readonly PNG8: string;
  readonly PNG24: string;
  readonly TIFF: string;
  readonly TIFF_COMPRESSED: string;
  readonly MULTIPAGE_TIFF: string;
  readonly MULTIPAGE_TIFF_COMPRESSED: string;
  readonly LEFT_ALIGN: number;
  readonly CENTER_ALIGN: number;
  readonly RIGHT_ALIGN: number;
  readonly RC4_40BIT: number;
  readonly RC4_128BIT: number;
  readonly AES_128BIT: number;
  readonly AES_256BIT: number;
  readonly ISO8859_1: string;
  readonly WINDOWS_1252: string;
  readonly UTF8: string;
}
export const Constants: ConstantsClass;

/** The Java class `com.pd4ml.Constants.LayoutEngine`. */
export interface LayoutEngine extends JavaObject {
}
export interface LayoutEngineClass extends JavaClass {
  readonly v40: LayoutEngine;
  readonly v42: LayoutEngine;
  values(): LayoutEngine[];
  valueOf(name: string): LayoutEngine;
}
export const LayoutEngine: LayoutEngineClass;

/** The Java class `com.pd4ml.Constants.ErrorPolicy`. */
export interface ErrorPolicy extends JavaObject {
}
export interface ErrorPolicyClass extends JavaClass {
  readonly NONE: ErrorPolicy;
  readonly RELAXED: ErrorPolicy;
  readonly NORMAL: ErrorPolicy;
  readonly PEDANTIC: ErrorPolicy;
  readonly STRICT: ErrorPolicy;
  values(): ErrorPolicy[];
  valueOf(name: string): ErrorPolicy;
}
export const ErrorPolicy: ErrorPolicyClass;

/** The Java class `com.pd4ml.PageSize`. */
export interface PageSize extends JavaObject {
  /** `width` (a public field: `obj.$get('width')`) */
  /** `height` (a public field: `obj.$get('height')`) */
  /** `rotated` (a public field: `obj.$get('rotated')`) */
  rotate(): PageSize;
  mmWidth(): number;
  mmHeight(): number;
}
export interface PageSizeClass extends JavaClass {
  new (width: number | JavaFloat, height: number | JavaFloat, units: Units): PageSize;
  new (width: number | JavaFloat, height: number | JavaFloat): PageSize;
  readonly B5: PageSize;
  readonly B4: PageSize;
  readonly JIS_B5: PageSize;
  readonly JIS_B4: PageSize;
  readonly A10: PageSize;
  readonly A9: PageSize;
  readonly A8: PageSize;
  readonly A7: PageSize;
  readonly A6: PageSize;
  readonly A5: PageSize;
  readonly A4: PageSize;
  readonly A3: PageSize;
  readonly A2: PageSize;
  readonly A1: PageSize;
  readonly A0: PageSize;
  readonly ISOB5: PageSize;
  readonly ISOB4: PageSize;
  readonly ISOB3: PageSize;
  readonly ISOB2: PageSize;
  readonly ISOB1: PageSize;
  readonly ISOB0: PageSize;
  readonly HALFLETTER: PageSize;
  readonly LETTER: PageSize;
  readonly TABLOID: PageSize;
  readonly LEDGER: PageSize;
  readonly NOTE: PageSize;
  readonly LEGAL: PageSize;
  readonly ArchA: PageSize;
  readonly ArchB: PageSize;
  readonly ArchC: PageSize;
  readonly ArchD: PageSize;
  readonly ArchE: PageSize;
  readonly ArchE1: PageSize;
  getInstance(name: string): PageSize;
}
export const PageSize: PageSizeClass;

/** The Java class `com.pd4ml.PageMargins`. */
export interface PageMargins extends JavaObject {
  /** `left` (a public field: `obj.$get('left')`) */
  /** `top` (a public field: `obj.$get('top')`) */
  /** `right` (a public field: `obj.$get('right')`) */
  /** `bottom` (a public field: `obj.$get('bottom')`) */
  flipHorizontal(): PageMargins;
  flipVertical(): PageMargins;
  rotate(): PageMargins;
}
export interface PageMarginsClass extends JavaClass {
  new (left: number | JavaFloat, top: number | JavaFloat, right: number | JavaFloat, bottom: number | JavaFloat): PageMargins;
  new (left: number | JavaFloat, top: number | JavaFloat, right: number | JavaFloat, bottom: number | JavaFloat, units: Units): PageMargins;
  readonly DEFAULT_PAGE_MARGINS: PageMargins;
}
export const PageMargins: PageMarginsClass;

/** The Java interface `com.pd4ml.Dimensions`. */
export interface Dimensions extends JavaObject {
}
export interface DimensionsClass extends JavaClass {
  readonly MM_PER_INCH: number;
  readonly POINTS_PER_MM: number;
  readonly POINTS_PER_INCH: number;
  readonly PIXELS_PER_POINT: number;
}
export const Dimensions: DimensionsClass;

/** The Java class `com.pd4ml.Dimensions.Units`. */
export interface Units extends JavaObject {
}
export interface UnitsClass extends JavaClass {
  readonly MM: Units;
  readonly PT: Units;
  readonly PX: Units;
  values(): Units[];
  valueOf(name: string): Units;
}
export const Units: UnitsClass;

/** The Java class `com.pd4ml.PdfSpec`. */
export interface PdfSpec extends JavaObject {
  /** `name` (a public field: `obj.$get('name')`) */
  /** `id` (a public field: `obj.$get('id')`) */
  /** `xid` (a public field: `obj.$get('xid')`) */
  combine(spec: PdfSpec): PdfSpec;
  withMinimumVersion(version: PdfSpec): PdfSpec;
  isPdfa(): boolean;
  isPdfa1(): boolean;
  isPdfa1a(): boolean;
  isPdfa1b(): boolean;
  isPdfa2(): boolean;
  isPdfa3(): boolean;
  isPdfa12(): boolean;
  isPdfa12a(): boolean;
  isPdfa2u(): boolean;
  isPdfa123(): boolean;
  isPdfa123a(): boolean;
  isPdfa23(): boolean;
  isPdfa23a(): boolean;
  isPdfa23b(): boolean;
  isPdfa23u(): boolean;
  isPdfa123b(): boolean;
  isPdfa4e(): boolean;
  isPdfa4f(): boolean;
  isPdfa4(): boolean;
  isPdfa1234(): boolean;
  isPdfa234(): boolean;
  isPdfua(): boolean;
  isPdfua1(): boolean;
  isPdfua2(): boolean;
  allowsTransparency(): boolean;
  allowsAttachments(): boolean;
  allowsDocLevelAttachments(): boolean;
  allowsEncryption(): boolean;
  allowsPdfForms(): boolean;
  requiresTagging(): boolean;
  requiresColorspace(): boolean;
  requiresMetadata(): boolean;
  requiresOutputInternet(): boolean;
  allowsExternalHyperlinking(): boolean;
  requiresReliableUnicodeSemantics(): boolean;
  getPdfVersionLabel(): string;
  getPdfExtLevel(): number;
  getPdfaVersion(): number;
  getPdfuaVersion(): number;
}
export interface PdfSpecClass extends JavaClass {
  new (spec: PdfSpec): PdfSpec;
  readonly PDF_1_0: PdfSpec;
  readonly PDF_1_1: PdfSpec;
  readonly PDF_1_2: PdfSpec;
  readonly PDF_1_3: PdfSpec;
  readonly PDF_1_4: PdfSpec;
  readonly PDF_1_5: PdfSpec;
  readonly PDF_1_6: PdfSpec;
  readonly PDF_1_7: PdfSpec;
  readonly PDF_1_7_1: PdfSpec;
  readonly PDF_1_7_2: PdfSpec;
  readonly PDF_1_7_3: PdfSpec;
  readonly PDF_1_7_4: PdfSpec;
  readonly PDF_1_7_5: PdfSpec;
  readonly PDF_1_7_6: PdfSpec;
  readonly PDF_1_7_7: PdfSpec;
  readonly PDF_1_7_8: PdfSpec;
  readonly PDF_1_7_9: PdfSpec;
  readonly PDF_1_7_10: PdfSpec;
  readonly PDF_1_7_11: PdfSpec;
  readonly PDF_2_0: PdfSpec;
  readonly PDFA_1A: PdfSpec;
  readonly PDFA_1B: PdfSpec;
  readonly PDFA_2A: PdfSpec;
  readonly PDFA_2B: PdfSpec;
  readonly PDFA_2U: PdfSpec;
  readonly PDFA_3A: PdfSpec;
  readonly PDFA_3B: PdfSpec;
  readonly PDFA_3U: PdfSpec;
  readonly PDFA_4: PdfSpec;
  readonly PDFA_4E: PdfSpec;
  readonly PDFUA_1: PdfSpec;
  readonly PDFUA_2: PdfSpec;
  readonly ZUGFeRD: PdfSpec;
  readonly ZUGFeRD_a: PdfSpec;
  readonly FacturX: PdfSpec;
  readonly FacturX_a: PdfSpec;
  areCompatible(pdf: PdfSpec, pdfa1: PdfSpec, pdfa2: PdfSpec): boolean;
  getByLabel(label: string): PdfSpec;
  getInstance(label: string): PdfSpec;
  getByID(id: number | JavaFloat): PdfSpec;
  listKeywords(): string;
}
export const PdfSpec: PdfSpecClass;

/** The Java class `com.pd4ml.pdf.PdfDocumentBase`. */
export interface PdfDocumentBase extends JavaObject {
  write(out: JavaObject): void;
  write(out: JavaObject, password: string, permissions: number | JavaFloat): void;
  append(toMerge: PdfDocumentBase): void;
  overlay(anotherDoc: PdfDocumentBase, opacity: number | JavaFloat): void;
  overlay(anotherDoc: PdfDocumentBase, srcScope: string, destScope: string, opacity: number | JavaFloat): void;
  underlay(anotherDoc: PdfDocumentBase, opacity: number | JavaFloat): void;
  underlay(anotherDoc: PdfDocumentBase, srcScope: string, destScope: string, opacity: number | JavaFloat): void;
  getNumberOfPages(): number;
  getPermissions(): number;
  getTitle(): string;
  setTitle(title: string): void;
  getAuthor(): string;
  setAuthor(author: string): void;
  getPdfFormatVersion(): string;
  getMetadata(): string;
  getCreationDate(): string;
  dumpOutlines(): string;
  getKeywords(): string;
  setKeywords(keywords: string): void;
  getCreator(): string;
  setCreator(creator: string): void;
  getProducer(): string;
  getSubject(): string;
  setSubject(subject: string): void;
  setModDate(): void;
  getModDate(): string;
  getPageSize(pageIndex: number | JavaFloat): PageSize;
  getPageBox(pageIndex: number | JavaFloat, boxName: string): number[];
  read(): void;
  getPageContent(pageIndex: number | JavaFloat): string;
  deletePage(pageNumber: number | JavaFloat): number;
}
export interface PdfDocumentBaseClass extends JavaClass {
  computeScope(scope: string, pageNum: number | JavaFloat): boolean[];
}
export const PdfDocumentBase: PdfDocumentBaseClass;

/** The Java class `com.pd4ml.PdfDocument`. */
export interface PdfDocument extends PdfDocumentBase {
}
export interface PdfDocumentClass extends JavaClass {
  new (bytes: Buffer | Uint8Array, password: string): PdfDocument;
  new (stream: Buffer | Uint8Array | JavaObject, password: string): PdfDocument;
  new (url: string | URL | JavaObject, password: string): PdfDocument;
  new (writer: JavaObject): PdfDocument;
  mergePDFs(pdf1: Buffer | Uint8Array | JavaObject, pdf2: Buffer | Uint8Array | JavaObject, result: JavaObject): void;
}
export const PdfDocument: PdfDocumentClass;

/** The Java interface `com.pd4ml.ProgressListener`. */
export interface ProgressListener extends JavaObject {
  progressUpdate(arg0: number | JavaFloat, arg1: number | JavaFloat, arg2: string, arg3: number | JavaFloat): void;
}
export interface ProgressListenerClass extends JavaClass {
  readonly CONVERSION_BEGIN: number;
  readonly MAIN_DOC_READ: number;
  readonly HTML_PARSED: number;
  readonly RENDERER_TREE_BUILT: number;
  readonly HTML_LAYOUT_IN_PROGRESS: number;
  readonly HTML_LAYOUT_DONE: number;
  readonly PAGEBREAKS_ALIGNED: number;
  readonly TOC_GENERATED: number;
  readonly DOC_RENDER_IN_PROGRESS: number;
  readonly DOC_WRITE_BEGIN: number;
  readonly CONVERSION_END: number;
  readonly RTF_PRE_RENDER_DONE: number;
  readonly DOCX_PRE_RENDER_DONE: number;
}
export const ProgressListener: ProgressListenerClass;

/** The Java class `com.pd4ml.ResourceProvider`. */
export interface ResourceProvider extends JavaObject {
  /** `mime` (a public field: `obj.$get('mime')`) */
  /** `redirected` (a public field: `obj.$get('redirected')`) */
  getResourceAsStream(arg0: string, arg1: JavaObject): JavaObject;
  canLoad(arg0: string, arg1: JavaObject): boolean;
  dontCache(): boolean;
  localFile(): JavaObject;
  closeResourceStream(): void;
  getResourceAsBytes(resource: string, cache: JavaObject): Buffer;
  getMime(): string;
  getEncoding(): string;
  isDirectory(): boolean;
}
export interface ResourceProviderClass extends JavaClass {
}
export const ResourceProvider: ResourceProviderClass;

/** The Java class `com.pd4ml.CustomTag`. */
export interface CustomTag extends JavaObject {
  getInstance(code: string, fontCache: JavaObject): CustomTag;
  setElement(element: JavaObject): void;
  getInnerCode(): string;
  setInnerCode(code: string): void;
  getWidth(base: number | JavaFloat): number;
  getHeight(base: number | JavaFloat): number;
  setWidth(width: number | JavaFloat): void;
  setHeight(height: number | JavaFloat): void;
  paint(x: number | JavaFloat, y: number | JavaFloat, width: number | JavaFloat, height: number | JavaFloat, containerWidth: number | JavaFloat, containerHeight: number | JavaFloat, g: JavaObject): void;
  paint(x: number | JavaFloat, y: number | JavaFloat, g: JavaObject): void;
  isEmptyTag(): boolean;
}
export interface CustomTagClass extends JavaClass {
  new (): CustomTag;
  new (code: string, fontCache: JavaObject, prime: CustomTag): CustomTag;
}
export const CustomTag: CustomTagClass;

/** The Java class `com.pd4ml.StatusMessage`. */
export interface StatusMessage extends JavaObject {
  getDetails(): string;
  setDetails(details: string): void;
  isError(): boolean;
  isWarning(): boolean;
  getMessage(): string;
}
export interface StatusMessageClass extends JavaClass {
  new (type: number | JavaFloat, id: number | JavaFloat, message: string): StatusMessage;
  readonly WARNING: number;
  readonly ERROR: number;
  getMessage(id: number | JavaFloat, details: string): StatusMessage;
  addUniqueMessage(statusMessages: JavaObject, message: StatusMessage): boolean;
}
export const StatusMessage: StatusMessageClass;
