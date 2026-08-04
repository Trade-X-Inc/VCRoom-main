# canonical_json — Specification v1

**Status:** authoritative. **Version:** 1 (2026-08-04). **Reference implementation:**
`pack_v1.canonical_json(jsonb)` in `20260804000000_pack_v1_foundation.sql`.

This document specifies the exact byte output of the canonicalisation used to
compute the hash-chained record's `entry_hash`
(`entry_hash = sha256(prev_hash || canonical_json(payload))`, see the migration's
`append_record`). The chain's tamper-evidence depends entirely on this producing
**byte-identical** output everywhere it is computed — at write time (Postgres, now)
and at every future verification site (export tooling, a client-side verifier, an
auditor's independent reimplementation).

**The rule for any second implementation:** it is correct if and only if, for every
input, it produces the byte string this spec describes AND matches the reference
implementation's output. Where this prose and the reference implementation ever
disagree, **the reference implementation wins and this document is the bug** — file
a correction, bump the version, never silently diverge. Once real record entries
exist, changing canonicalisation at all is a breaking change requiring a new
`canonical_json` version and a chain-migration decision, not an edit.

A conformance vector table (input → exact expected output) is at the end. A
reimplementation MUST pass every vector.

---

## 0. Critical warnings for reimplementers (read first)

These are the ways a naive reimplementation silently breaks the chain. Each is a
real, probed behaviour of the reference implementation, not a hypothetical.

1. **Trailing zeros in numbers are PRESERVED, not normalised.** `1.50` canonicalises
   to `1.50`, and `50000.00` to `50000.00` — distinct from `1.5` / `50000`, so they
   hash differently. A JS verifier that does `JSON.stringify(value)` will emit `1.5`
   and **fail to verify a genuine entry**. Numbers must be carried and serialised as
   their original textual token (see §3), never round-tripped through a float.
2. **Numbers are never re-formatted into scientific notation.** Scientific-notation
   *input* (`1e3`, `1.5e10`) is normalised to plain decimal (`1000`, `15000000000`)
   by the input parser (§3.1); output never contains `e`/`E`.
3. **Object keys are sorted; array order is preserved.** Sorting an array, or failing
   to sort keys recursively (including inside array elements), breaks the hash.
4. **This is NOT RFC 8785 (JCS).** JCS mandates ECMAScript `Number` formatting, which
   normalises `1.50`→`1.5`. This spec deliberately does the opposite (preserves the
   token). Do not reach for an off-the-shelf JCS library and assume it matches.

---

## 1. Input model and pre-normalisation (inherited from Postgres `jsonb`)

The reference implementation operates on a value that has **already been parsed into
Postgres `jsonb`**. `jsonb` applies its own normalisation *before* `canonical_json`
runs, and the spec inherits it. A reimplementation that starts from a raw JSON string
must reproduce these pre-normalisations first:

- **Duplicate object keys:** the last value wins; earlier duplicates are dropped.
  `{"a":1,"a":2}` → treated as `{"a":2}`.
- **Insignificant whitespace** between tokens is removed.
- **Scientific-notation numbers** are converted to plain decimal (see §3.1).
- **Negative zero** (`-0`) is normalised to `0`.
- Numeric **value** is otherwise preserved at its original scale/precision, including
  trailing zeros and full significant digits (jsonb stores JSON numbers as `numeric`,
  which is arbitrary-precision and scale-preserving — NOT IEEE-754 double).

If your language parses JSON numbers into a float/double, you have already lost the
scale before canonicalisation begins. Carry numbers as arbitrary-precision decimals
or as their raw source token.

---

## 2. Structural rules

### 2.1 Object (`{...}`)
- Serialise as `{` + comma-joined members + `}`. No spaces anywhere.
- Each member is `<key>:<value>` — key and value separated by a single `:`, no spaces.
- The key is serialised as a JSON string (§4).
- **Members are ordered by key, ascending, by Unicode code point** (equivalently:
  byte order of the UTF-8-encoded key, which coincides for the ASCII keys used by the
  record payload). Sorting is applied at **every** object, recursively, including
  objects nested inside arrays.
- Empty object → `{}`.

### 2.2 Array (`[...]`)
- Serialise as `[` + comma-joined elements + `]`. No spaces.
- **Element order is preserved exactly as given.** Arrays are never sorted.
- Each element is canonicalised recursively.
- Empty array → `[]`.

### 2.3 Top-level / scalar
- A scalar (string, number, boolean, null) at any position — including top level —
  serialises to its scalar form below. `canonical_json('"hello"')` → `"hello"`,
  `canonical_json('42')` → `42`, `canonical_json('null')` → `null`.

---

## 3. Numbers

### 3.1 Formatting
- Output is the **plain decimal textual form of the parsed numeric value**, exactly
  as Postgres `jsonb`'s `numeric`-backed text output produces it:
  - No scientific notation, ever, on output. (`1e3` → `1000`; `1.5e10` → `15000000000`.)
  - **Trailing zeros preserved** as they appeared in the (post-scientific-normalisation)
    token: `1.50` → `1.50`, `50000.00` → `50000.00`.
  - Full precision/scale preserved: `1.234567890123456789` → `1.234567890123456789`
    (arbitrary precision — not truncated to double).
  - Negatives keep the leading `-`: `-42.5` → `-42.5`. Negative zero → `0`.
  - Integers have no decimal point: `0` → `0`, `1000000000` → `1000000000`.

> Rationale for preserving trailing zeros rather than normalising (the JCS choice):
> in a financial record, `50000.00` and `50000` may be *asserted differently* by a
> human (scale communicates precision of the assertion). Canonicalisation must not
> erase a distinction the asserting party made. The cost is that reimplementers
> cannot use float round-tripping; §0.1 makes that explicit.

### 3.2 Reimplementation requirement
Serialise numbers from an arbitrary-precision decimal type or the original source
token. Never via a binary float. `Number.prototype.toString`, `printf("%g")`, and
`JSON.stringify` on a parsed float are all **non-conformant**.

---

## 4. Strings

Strings use Postgres `jsonb`'s own string escaping (RFC 8259 escaping, minimal form):

- Wrapped in double quotes.
- Escaped: `"` → `\"`, `\` → `\\`, and the C0 control characters via their short
  escapes where defined (`\n`, `\t`, `\r`, `\b`, `\f`) or `\u00XX` otherwise
  (e.g. U+0001 → ``).
- **NOT escaped:** forward slash `/` stays literal (`http://x/y` → `http://x/y`).
- **Printable non-ASCII is literal UTF-8, not `\u`-escaped:** `café ☕` stays as its
  UTF-8 bytes; astral-plane characters (`𝕏`, U+1D54F) stay as literal UTF-8, **not**
  as `𝕏` surrogate pairs.
- The canonical output is a UTF-8 byte string. Hashing is over those UTF-8 bytes.

---

## 5. Booleans and null
- `true` → `true`, `false` → `false`, `null` → `null` (lowercase, unquoted).
- A null **value** in an object is kept: `{"a":null}` → `{"a":null}` (keys with null
  values are NOT dropped — only the record payload's own construction decides which
  keys exist; canonicalisation never omits a present key).

---

## 6. The record payload specifically

`append_record` builds the payload with exactly these keys, then canonicalises:
`seq, org_id, actor_id, actor_type, action, object_type, object_id, occurred_at, data`.
After key-sorting (§2.1) the serialised order is:
`action, actor_id, actor_type, data, object_id, object_type, occurred_at, org_id, seq`.
- `occurred_at` is a `timestamptz` rendered by `jsonb_build_object` to its ISO 8601
  text form; a verifier must use the stored `occurred_at` value verbatim, not reformat it.
- `actor_id` / `object_id` are `null` when absent (e.g. `actor_type='system'`), and
  serialise as `null`.
- `data` is caller-supplied jsonb, canonicalised recursively by the same rules.

---

## 7. Conformance vectors

A reimplementation MUST reproduce every output byte-for-byte. Verified against the
reference implementation on 2026-08-04.

| Input (JSON) | Canonical output |
|---|---|
| `{"b":1,"a":2,"c":{"z":1,"y":2}}` | `{"a":2,"b":1,"c":{"y":2,"z":1}}` |
| `[3,1,2]` | `[3,1,2]` |
| `[{"b":1,"a":2}]` | `[{"a":2,"b":1}]` |
| `{"a":null}` | `{"a":null}` |
| `{"n":50000}` | `{"n":50000}` |
| `{"n":1.50}` | `{"n":1.50}` |
| `{"n":1.5}` | `{"n":1.5}` |
| `{"n":50000.00}` | `{"n":50000.00}` |
| `{"n":1000000000}` | `{"n":1000000000}` |
| `{"n":10000000000000000000}` | `{"n":10000000000000000000}` |
| `{"n":1.234567890123456789}` | `{"n":1.234567890123456789}` |
| `{"n":0.0000001}` | `{"n":0.0000001}` |
| `{"n":-42.5}` | `{"n":-42.5}` |
| `{"n":1e3}` | `{"n":1000}` |
| `{"n":1.5e10}` | `{"n":15000000000}` |
| `{"n":-0}` | `{"n":0}` |
| `{"n":0}` | `{"n":0}` |
| `{"t":true,"f":false}` | `{"f":false,"t":true}` |
| `{"s":"a\"b\\c/d"}` | `{"s":"a\"b\\c/d"}` (forward slash unescaped) |
| `{"s":"café ☕ A"}` | `{"s":"café ☕ A"}` (literal UTF-8) |
| `{"s":"𝕏"}` | `{"s":"𝕏"}` (literal UTF-8, no surrogate escape) |
| `{"s":"line1\nline2\ttab"}` | `{"s":"line1\nline2\ttab"}` |
| `{"s":"http://x/y"}` | `{"s":"http://x/y"}` |
| U+0001 control char in string | `` |
| `{}` | `{}` |
| `[]` | `[]` |
| `"hello"` | `"hello"` |
| `42` | `42` |
| `null` | `null` |
| `{"a":1,"a":2}` | `{"a":2}` (duplicate key: last wins) |

---

## 8. Change control

- This is **version 1**. The reference implementation carries no version tag in code;
  this document's version IS the canonicalisation version for the record chain.
- Any change to canonicalisation behaviour once real `record_entry` rows exist is a
  **breaking change**: it invalidates every stored `entry_hash`. It requires a new
  numbered version, a migration plan for the existing chain (re-hash under a versioned
  scheme, or freeze v1 entries and start v2 forward), and product-owner sign-off — it
  is never a silent edit.
- If a reimplementation is found to disagree with the reference implementation, that
  is a records incident to investigate (is it tampering, or a spec ambiguity?), which
  is precisely why this spec exists before real entries do.
