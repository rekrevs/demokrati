import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chunkParagraphs,
  decodeHtmlEntities,
  extractParagraphs,
  parseAnforandeXml,
} from "./riksdagen";

const fixtureXml = readFileSync(
  resolve(process.cwd(), "data/samples/riksdagen/single-speech.xml"),
  "utf-8",
);
const fixtureList = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "data/samples/riksdagen/list-response.json"),
    "utf-8",
  ),
);

describe("decodeHtmlEntities", () => {
  it("decodes the common named entities", () => {
    expect(decodeHtmlEntities("&amp;&lt;&gt;&quot;&apos;&nbsp;")).toBe(
      "&<>\"' ",
    );
  });
  it("decodes numeric entities", () => {
    expect(decodeHtmlEntities("&#229;&#197;")).toBe("åÅ");
  });
  it("preserves non-entity text", () => {
    expect(decodeHtmlEntities("Foo & bar")).toBe("Foo & bar");
  });
});

describe("extractParagraphs", () => {
  it("splits on <p> tags and strips inner markup", () => {
    const input = "<p>One.</p><p>Two with <em>emphasis</em>.</p>";
    expect(extractParagraphs(input)).toEqual(["One.", "Two with emphasis."]);
  });

  it("handles HTML-escaped <p> tags as in the live API", () => {
    const input = "&lt;p&gt;Första.&lt;/p&gt;&lt;p&gt;Andra.&lt;/p&gt;";
    expect(extractParagraphs(input)).toEqual(["Första.", "Andra."]);
  });

  it("falls back to double-newline split when no <p> tags", () => {
    expect(extractParagraphs("Ett stycke.\n\nEtt annat.")).toEqual([
      "Ett stycke.",
      "Ett annat.",
    ]);
  });

  it("filters empty paragraphs", () => {
    expect(extractParagraphs("<p></p><p>  </p><p>Verklig.</p>")).toEqual([
      "Verklig.",
    ]);
  });
});

describe("parseAnforandeXml on real fixture", () => {
  it("returns paragraphs with full speech content", () => {
    const paragraphs = parseAnforandeXml(fixtureXml);
    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs[0]).toContain("Herr talman");
    for (const p of paragraphs) {
      expect(p).not.toContain("<p>");
      expect(p).not.toContain("&lt;");
    }
  });
});

describe("list-response fixture has expected schema", () => {
  it("contains anforandelista with anforande array", () => {
    expect(fixtureList.anforandelista).toBeDefined();
    expect(Array.isArray(fixtureList.anforandelista.anforande)).toBe(true);
    const first = fixtureList.anforandelista.anforande[0];
    // These are the fields we depend on
    for (const k of [
      "anforande_id",
      "dok_id",
      "anforande_nummer",
      "talare",
      "parti",
      "anforande_url_xml",
      "dok_datum",
    ]) {
      expect(first).toHaveProperty(k);
    }
  });
});

describe("chunkParagraphs", () => {
  it("passes short paragraphs through unchanged", () => {
    const paras = ["First short paragraph.", "Second short paragraph."];
    expect(chunkParagraphs(paras)).toEqual(paras);
  });

  it("splits long paragraphs at sentence boundaries", () => {
    const long = "Sats ett. ".repeat(200); // ~2000 chars
    const chunks = chunkParagraphs([long]);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1300);
    }
  });

  it("preserves all sentence content across splits", () => {
    const long = "A. ".repeat(500) + "Slut.";
    const chunks = chunkParagraphs([long]);
    const recombined = chunks.join("");
    expect(recombined.replace(/\s+/g, " ")).toContain("Slut.");
  });
});
