# Unicode Shield

Unicode normalization layer that strips invisible characters, neutralizes bidirectional text attacks, limits Zalgo text, normalizes confusable homoglyphs, and collapses fullwidth/math/enclosed characters via NFKC. Zero dependencies. Works everywhere.

```
npm install @photon-ai/unicode-shield
```

## Quick Start

```typescript
import { normalize } from "@photon-ai/unicode-shield";

const clean = normalize("Hello\u200B World\u202E");
// => "Hello World"
```

That's it. One function, zero config. Handles UT1-UT51 of the iMessage attack surface.

## What It Does

Incoming text can contain characters that are invisible to humans but parsed by LLMs, tokenizers, and downstream systems. These enable:

- **Hidden text injection** -- Zero-width characters, tag characters, and invisible operators embed text that's invisible on screen but readable by AI models
- **Bidi spoofing** -- Right-to-left overrides reverse displayed text, making `moc.elgoog` appear as `google.com`
- **Context injection** -- Line/paragraph separators and interlinear annotations inject invisible context boundaries
- **Control character abuse** -- C0/C1 control characters and deprecated formatting controls confuse parsers
- **Zalgo text** -- Stacked combining diacritics create visual noise and can crash renderers
- **Homoglyph attacks** -- Cyrillic `а` looks identical to Latin `a`, bypassing keyword filters
- **Encoding tricks** -- Fullwidth Latin, math bold/italic, enclosed/circled, superscript/subscript characters that LLMs read as normal text

iMessage strips **nothing** -- every character survives transport intact. `normalize()` handles all of them by default.

## API

### `normalize(text, options?)`

Strips problematic characters and returns a clean string.

```typescript
import { normalize } from "@photon-ai/unicode-shield";

normalize("Hello\u200BWorld");           // => "HelloWorld"
normalize("Click: \u202Emoc.xyz");       // => "Click: moc.xyz"
normalize("Hello\u00A0World");           // => "Hello World"
normalize("p\u0430ypal");               // => "paypal" (Cyrillic а → Latin a)
normalize("\uFF28\uFF21\uFF23\uFF2B");   // => "HACK" (fullwidth → ASCII)
normalize("Z\u0300\u0301\u0302\u0303a"); // => "Z̀́̂a" (Zalgo limited to 3 marks)
```

### `analyze(text, options?)`

Returns the cleaned text plus a detailed report of every character acted on.

```typescript
import { analyze } from "@photon-ai/unicode-shield";

const result = analyze("p\u0430ypal\u200B\u202E");
// {
//   text: "paypal",
//   dirty: true,
//   findings: [
//     { type: "confusable", codepoint: 0x430, index: 1, name: "CYRILLIC_SMALL_A", action: "normalized" },
//     { type: "invisible", codepoint: 0x200B, index: 6, name: "ZERO_WIDTH_SPACE", action: "stripped" },
//     { type: "bidi", codepoint: 0x202E, index: 7, name: "RIGHT_TO_LEFT_OVERRIDE", action: "stripped" },
//   ]
// }
```

### `createShield(options?)`

Creates a pre-configured instance for repeated use.

```typescript
import { createShield } from "@photon-ai/unicode-shield";

const shield = createShield({
  bidi: "escape",       // replace bidi chars with [U+XXXX] instead of stripping
  confusables: false,   // don't normalize homoglyphs (for multilingual apps)
  diacritics: 1,        // very aggressive Zalgo limit
});

shield.normalize(text);
shield.analyze(text);
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `invisibles` | `boolean` | `true` | Strip zero-width chars, BOM, fillers, invisible operators |
| `bidi` | `"strip" \| "escape" \| "ignore"` | `"strip"` | How to handle bidi override/isolate characters |
| `controls` | `boolean` | `true` | Strip C0/C1 control characters (preserves `\t`, `\n`, `\r`) |
| `tags` | `boolean` | `true` | Strip tag characters (U+E0000-U+E007F) |
| `variationSelectors` | `boolean` | `true` | Strip variation selectors (U+FE00-FE0F, U+E0100-E01EF) |
| `normalizeWhitespace` | `boolean` | `true` | Normalize exotic whitespace to ASCII space |
| `separators` | `boolean` | `true` | Strip line/paragraph separators |
| `formatting` | `boolean` | `true` | Strip annotations, deprecated formatting, non-characters |
| `diacritics` | `number \| false` | `3` | Max combining marks per base char. `0` = strip all, `false` = disable |
| `nfkc` | `boolean` | `true` | NFKC normalize fullwidth, math, enclosed, super/subscript chars |
| `confusables` | `boolean` | `true` | Normalize Cyrillic/Greek/Armenian/Cherokee homoglyphs to Latin |
| `collapseWhitespace` | `boolean` | `false` | Collapse consecutive spaces/tabs to single space, consecutive newlines to one |
| `trim` | `boolean` | `false` | Trim leading and trailing whitespace |

## Usage with iMessage SDKs

### advanced-imessage-kit

```typescript
import { SDK } from "@photon-ai/advanced-imessage-kit";
import { normalize } from "@photon-ai/unicode-shield";

const sdk = SDK({ serverUrl: "http://localhost:1234" });
await sdk.connect();

sdk.on("new-message", (msg) => {
  const clean = normalize(msg.text ?? "");
  console.log(`${msg.handle?.address}: ${clean}`);
});
```

### imessage-kit

```typescript
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { normalize } from "@photon-ai/unicode-shield";

const sdk = new IMessageSDK();
await sdk.startWatching({
  onDirectMessage: (msg) => {
    const clean = normalize(msg.text ?? "");
    console.log(`${msg.sender}: ${clean}`);
  },
});
```

## Coverage

All 51 iMessage attack vectors (UT1-UT51) are handled. Every character tested survives iMessage transport -- the normalizer catches all of them.

<details>
<summary>Full character coverage (400+ codepoints across 16 categories)</summary>

### Zero-width and invisible characters
`U+200B` Zero-width space, `U+200C` ZWNJ, `U+200D` ZWJ, `U+00AD` Soft hyphen, `U+2060` Word joiner, `U+FEFF` BOM, `U+180E` Mongolian vowel separator, `U+034F` CGJ, `U+061C` Arabic letter mark, `U+200E-200F` LR/RL marks, `U+2061-2064` Math invisible operators, `U+115F-1160` Hangul fillers, `U+3164` Hangul filler, `U+FFA0` Halfwidth Hangul filler, `U+17B4-17B5` Khmer vowels, `U+0E47/0E4D/0E4E` Thai combining, `U+1D159` Musical null notehead, `U+2800` Braille blank

### Bidi attack characters
`U+202A-202E` Directional embeddings/overrides, `U+2066-2069` Directional isolates

### Control characters
`U+0000-001F`, `U+007F` (C0, preserves tab/newline/CR), `U+0080-009F` (C1)

### Tag characters
`U+E0000-E007F` (128 chars that encode hidden ASCII)

### Variation selectors
`U+FE00-FE0F` (16), `U+E0100-E01EF` (240 supplementary)

### Special whitespace (normalized to space)
`U+00A0` NBSP, `U+1680` Ogham, `U+2000-200A` En/Em/Thin/Hair spaces, `U+202F` Narrow NBSP, `U+205F` Medium math space, `U+3000` Ideographic space

### Separators
`U+2028` Line separator, `U+2029` Paragraph separator

### Annotation and formatting
`U+FFF9-FFFB` Interlinear annotations, `U+206A-206F` Deprecated formatting, `U+FFFC` Object replacement, `U+FFFD` Replacement character

### Non-characters
`U+FFFE`, `U+FFFF`

### Musical formatting
`U+1D173-1D17A`

### Shorthand controls
`U+1BCA0-1BCA3`

### Stacked diacritics (Zalgo)
All combining marks in `U+0300-036F`, `U+1AB0-1AFF`, `U+1DC0-1DFF`, `U+20D0-20FF`, `U+FE20-FE2F`, plus script-specific combining ranges. Limited to 3 per base character by default.

### Confusable homoglyphs
Cyrillic (`а с е о р х у` and capitals), Greek (`ο ν α` and capitals), Armenian (`ո ո ջ`), Cherokee (`Ꭺ` etc.) -- normalized to their Latin equivalents

### NFKC normalization
Fullwidth ASCII (`U+FF01-FF5E`), Math alphanumeric (`U+1D400-1D7FF`), Enclosed/circled (`U+2460-24FF`, `U+1F100-1F2FF`), Superscript/subscript (`U+2070-209F`, `U+00B2/B3/B9`)

</details>

## License

MIT
