import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 27 — typed catch", () => {
  // --- single typed catch with inline object type ---

  it("typed catch matching inline type — body executes", () => {
    const { stdout } = execGPJ(`try {
  throw {message: "err", code: 404};
} catch (e: {message: String, code: Number}) {
  console.log(e.code);
}`);
    assert.equal(stdout, "404\n");
  });

  it("typed catch non-matching inline type — re-throws to outer", () => {
    const { stdout } = execGPJ(`try {
  try {
    throw {message: "err"};
  } catch (e: {message: String, code: Number}) {
    console.log("typed");
  }
} catch (e) {
  console.log("outer");
}`);
    assert.equal(stdout, "outer\n");
  });

  // --- typed catch with type alias ---

  it("typed catch with type alias — matching — executes", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  throw {message: "not found", code: 404};
} catch (e: HttpError) {
  console.log(e.code);
}`);
    assert.equal(stdout, "404\n");
  });

  it("typed catch with type alias — non-matching — re-throws", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  try {
    throw {message: "generic"};
  } catch (e: HttpError) {
    console.log("typed");
  }
} catch (e) {
  console.log("outer");
}`);
    assert.equal(stdout, "outer\n");
  });

  // --- multiple typed catches ---

  it("multiple typed catches — first matches", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "not found", code: 404};
} catch (e: HttpError) {
  console.log("http");
} catch (e: ValueError) {
  console.log("value");
}`);
    assert.equal(stdout, "http\n");
  });

  it("multiple typed catches — second matches", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "bad value", value: 42};
} catch (e: HttpError) {
  console.log("http");
} catch (e: ValueError) {
  console.log("value");
}`);
    assert.equal(stdout, "value\n");
  });

  it("multiple typed catches — none match — re-throws", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  try {
    throw {message: "unknown"};
  } catch (e: HttpError) {
    console.log("http");
  } catch (e: ValueError) {
    console.log("value");
  }
} catch (e) {
  console.log("outer");
}`);
    assert.equal(stdout, "outer\n");
  });

  // --- typed catch + catch-all ---

  it("typed catch + catch-all — typed matches", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  throw {message: "not found", code: 404};
} catch (e: HttpError) {
  console.log("http");
} catch (e) {
  console.log("other");
}`);
    assert.equal(stdout, "http\n");
  });

  it("typed catch + catch-all — typed doesn't match, catch-all fires", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  throw {message: "generic error"};
} catch (e: HttpError) {
  console.log("http");
} catch (e) {
  console.log("other");
}`);
    assert.equal(stdout, "other\n");
  });

  // --- union type annotation in catch ---

  it("union type in catch — matches first variant", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "not found", code: 404};
} catch (e: HttpError | ValueError) {
  console.log(e.message);
}`);
    assert.equal(stdout, "not found\n");
  });

  it("union type in catch — matches second variant", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "bad value", value: 42};
} catch (e: HttpError | ValueError) {
  console.log(e.message);
}`);
    assert.equal(stdout, "bad value\n");
  });

  it("union type in catch — non-matching — re-throws", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  try {
    throw {message: "unknown"};
  } catch (e: HttpError | ValueError) {
    console.log("union");
  }
} catch (e) {
  console.log("outer");
}`);
    assert.equal(stdout, "outer\n");
  });

  // --- finally with typed catch ---

  it("finally runs after typed catch matches", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  throw {message: "err", code: 500};
} catch (e: HttpError) {
  console.log("caught");
} finally {
  console.log("finally");
}`);
    assert.equal(stdout, "caught\nfinally\n");
  });

  it("finally runs after typed catch re-throws (caught by outer)", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
try {
  try {
    throw {message: "generic"};
  } catch (e: HttpError) {
    console.log("typed");
  } finally {
    console.log("finally");
  }
} catch (e) {
  console.log("outer");
}`);
    assert.equal(stdout, "finally\nouter\n");
  });

  // --- catch param accessible in body ---

  it("catch param accessible with correct value", () => {
    const { stdout } = execGPJ(`type AppError = {message: String, code: Number};
try {
  throw {message: "test", code: 42};
} catch (e: AppError) {
  console.log(e.message);
  console.log(e.code);
}`);
    assert.equal(stdout, "test\n42\n");
  });

  // --- SPEC example: multiple catch in order ---

  it("SPEC example: multiple typed + catch-all in order", () => {
    const { stdout } = execGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "not found", code: 404};
} catch (e: HttpError) {
  console.log(e.code);
} catch (e: ValueError) {
  console.log(e.value);
} catch (e) {
  console.log(e.message);
}`);
    assert.equal(stdout, "404\n");
  });

  // --- backward compat: bare catch still works ---

  it("bare catch (no annotation) still emits simple catch", () => {
    const { js } = runGPJ(`try {
  throw {message: "err"};
} catch (e) {
  console.log(e.message);
}`);
    assert.ok(!js.includes("__gpj_isStruct"), js);
    assert.ok(!js.includes("__gpj_err"), js);
  });

  // --- codegen checks ---

  it("typed catch emits __gpj_isStruct guard", () => {
    const { js } = runGPJ(`type HttpError = {message: String, code: Number};
try {
  throw {message: "err", code: 404};
} catch (e: HttpError) {
  console.log(e.code);
}`);
    assert.ok(js.includes("__gpj_isStruct"), js);
  });

  it("multiple typed catches emit if/else chain with re-throw", () => {
    const { js } = runGPJ(`type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};
try {
  throw {message: "e", code: 1};
} catch (e: HttpError) {
  console.log("http");
} catch (e: ValueError) {
  console.log("value");
}`);
    assert.ok(js.includes("if"), js);
    assert.ok(js.includes("else"), js);
    assert.ok(js.includes("throw __gpj_err"), js);
  });
});
