/**
 * Comprehensive unit tests for feymantec-core.js
 * Following TDD - tests written first, some will fail until bugs are fixed
 */
import { describe, it, expect } from 'vitest';

// Import the core module (UMD format works with dynamic import)
const Core = await import('../lib/feymantec-core.js').then(m => m.default || m);

describe('safeTrim', () => {
  it('trims whitespace and collapses internal spaces', () => {
    expect(Core.safeTrim('  hello   world  ')).toBe('hello world');
  });

  it('handles null', () => {
    expect(Core.safeTrim(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(Core.safeTrim(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(Core.safeTrim('')).toBe('');
  });

  it('handles newlines and tabs', () => {
    expect(Core.safeTrim('hello\n\tworld')).toBe('hello world');
  });

  it('handles only whitespace', () => {
    expect(Core.safeTrim('   \n\t  ')).toBe('');
  });
});

describe('wordCount', () => {
  it('counts words correctly', () => {
    expect(Core.wordCount('hello world')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(Core.wordCount('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(Core.wordCount(null)).toBe(0);
  });

  it('handles only whitespace', () => {
    expect(Core.wordCount('   ')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(Core.wordCount('one  two   three')).toBe(3);
  });

  it('handles single word', () => {
    expect(Core.wordCount(' one ')).toBe(1);
  });

  it('counts hyphenated words as one word', () => {
    expect(Core.wordCount('well-known fact')).toBe(2);
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(Core.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes less than', () => {
    expect(Core.escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(Core.escapeHtml('"test"')).toBe('&quot;test&quot;');
  });

  it('escapes single quotes', () => {
    expect(Core.escapeHtml("'test'")).toBe("&#039;test&#039;");
  });

  it('escapes all dangerous characters together', () => {
    expect(Core.escapeHtml('<script>"test" & \'alert\'</script>'))
      .toBe('&lt;script&gt;&quot;test&quot; &amp; &#039;alert&#039;&lt;/script&gt;');
  });

  it('handles null', () => {
    expect(Core.escapeHtml(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(Core.escapeHtml(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(Core.escapeHtml('')).toBe('');
  });
});

describe('isLikelyNSFW', () => {
  it('detects explicit keywords', () => {
    expect(Core.isLikelyNSFW('learn about porn')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(Core.isLikelyNSFW('PORN')).toBe(true);
    expect(Core.isLikelyNSFW('Porn')).toBe(true);
  });

  it('detects onlyfans', () => {
    expect(Core.isLikelyNSFW('OnlyFans leak')).toBe(true);
  });

  it('detects xxx', () => {
    expect(Core.isLikelyNSFW('xxx content')).toBe(true);
  });

  it('allows normal topics', () => {
    expect(Core.isLikelyNSFW('quantum physics')).toBe(false);
    expect(Core.isLikelyNSFW('machine learning')).toBe(false);
    expect(Core.isLikelyNSFW('photosynthesis')).toBe(false);
  });

  it('handles empty input', () => {
    expect(Core.isLikelyNSFW('')).toBe(false);
  });

  it('handles null', () => {
    expect(Core.isLikelyNSFW(null)).toBe(false);
  });

  it('handles undefined', () => {
    expect(Core.isLikelyNSFW(undefined)).toBe(false);
  });

  // Document current limitations (not blocking)
  it('does not catch simple obfuscation (known limitation)', () => {
    // This is a known gap - documenting current behavior
    expect(Core.isLikelyNSFW('p0rn')).toBe(false);
  });
});

describe('randomId', () => {
  it('generates IDs of specified length', () => {
    expect(Core.randomId(8)).toHaveLength(8);
    expect(Core.randomId(10)).toHaveLength(10);
    expect(Core.randomId(12)).toHaveLength(12);
  });

  it('uses only allowed characters (no ambiguous chars)', () => {
    const id = Core.randomId(100);
    // Should not contain I, O, 0, 1 (ambiguous)
    expect(id).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => Core.randomId(8)));
    expect(ids.size).toBe(1000); // No collisions in 1000 tries
  });

  it('defaults to length 10', () => {
    expect(Core.randomId()).toHaveLength(10);
  });
});

describe('encodeJsonToBase64Url / decodeBase64UrlToJson', () => {
  it('round-trips simple objects', () => {
    const obj = { concept: 'test', score: 85 };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(Core.decodeBase64UrlToJson(encoded)).toEqual(obj);
  });

  it('handles UTF-8 characters', () => {
    const obj = { concept: "Bayes' theorem", note: 'Probabilite' };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(Core.decodeBase64UrlToJson(encoded)).toEqual(obj);
  });

  it('handles special characters', () => {
    const obj = { text: 'cafe', quote: 'he said "hi"' };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(Core.decodeBase64UrlToJson(encoded)).toEqual(obj);
  });

  it('handles nested objects and arrays', () => {
    const obj = {
      arr: [1, 'two', true, null],
      nested: { ok: true, n: 42 },
    };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(Core.decodeBase64UrlToJson(encoded)).toEqual(obj);
  });

  it('produces URL-safe output (no +, /, =)', () => {
    const obj = { data: 'a'.repeat(100) };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('only contains valid base64url characters', () => {
    const obj = { concept: 'test', score: 85, gaps: ['a', 'b'] };
    const encoded = Core.encodeJsonToBase64Url(obj);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('extractJargonWords', () => {
  it('extracts long words (12+ chars)', () => {
    const result = Core.extractJargonWords('the backpropagation algorithm works');
    expect(result).toContain('backpropagation');
  });

  it('extracts ALL-CAPS acronyms (2+ chars)', () => {
    const result = Core.extractJargonWords('use the API and HTTP protocol');
    expect(result).toContain('API');
    expect(result).toContain('HTTP');
  });

  it('extracts camelCase/PascalCase words', () => {
    const result = Core.extractJargonWords('implement TensorFlow in the BackEnd');
    expect(result).toContain('TensorFlow');
    expect(result).toContain('BackEnd');
  });

  it('limits to max words (default 8)', () => {
    const input = 'ABC DEF GHI JKL MNO PQR STU VWX YZA BCD EFG';
    expect(Core.extractJargonWords(input).length).toBeLessThanOrEqual(8);
  });

  it('respects custom max parameter', () => {
    const input = 'ABC DEF GHI JKL MNO PQR STU VWX';
    expect(Core.extractJargonWords(input, 3).length).toBeLessThanOrEqual(3);
  });

  it('deduplicates words', () => {
    const result = Core.extractJargonWords('API API API');
    expect(result).toEqual(['API']);
  });

  it('handles empty input', () => {
    expect(Core.extractJargonWords('')).toEqual([]);
  });

  it('handles null input', () => {
    expect(Core.extractJargonWords(null)).toEqual([]);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(Core.clamp(50, 0, 100)).toBe(50);
  });

  it('clamps to minimum', () => {
    expect(Core.clamp(-10, 0, 100)).toBe(0);
  });

  it('clamps to maximum', () => {
    expect(Core.clamp(150, 0, 100)).toBe(100);
  });

  it('handles edge case at minimum', () => {
    expect(Core.clamp(0, 0, 100)).toBe(0);
  });

  it('handles edge case at maximum', () => {
    expect(Core.clamp(100, 0, 100)).toBe(100);
  });
});

describe('buildPreviewCard', () => {
  it('returns all required fields', () => {
    const card = Core.buildPreviewCard(
      'Test concept',
      'This is a test explanation with enough words to pass the minimum threshold for generating a preview card because examples help.'
    );
    expect(card).toHaveProperty('concept', 'Test concept');
    expect(card).toHaveProperty('v1');
    expect(card).toHaveProperty('score');
    expect(card).toHaveProperty('jargon');
    expect(card).toHaveProperty('gaps');
    expect(card).toHaveProperty('simple');
    expect(card).toHaveProperty('analogy');
    expect(card).toHaveProperty('quiz');
  });

  it('score is bounded between 42 and 96', () => {
    // Best case: clear explanation with examples and reasons
    const good = Core.buildPreviewCard(
      'Test',
      'For example, because this works we see that 5 + 5 = 10 which means the result is predictable and therefore reliable.'
    );
    expect(good.score).toBeGreaterThanOrEqual(42);
    expect(good.score).toBeLessThanOrEqual(96);

    // Worst case: short, vague, no examples
    const bad = Core.buildPreviewCard('Test', 'just stuff basically and things');
    expect(bad.score).toBeGreaterThanOrEqual(42);
    expect(bad.score).toBeLessThanOrEqual(96);
  });

  it('penalizes explanations without examples', () => {
    const withExample = Core.buildPreviewCard(
      'Test',
      'For example, when you have 100 dollars and spend 50 that means you have 50 left because subtraction works that way and therefore you understand.'
    );
    const withoutExample = Core.buildPreviewCard(
      'Test',
      'When you have money and spend some that means you have less left because subtraction works that way and therefore the balance decreases accordingly.'
    );
    expect(withExample.score).toBeGreaterThan(withoutExample.score);
  });

  it('generates 3-4 gaps', () => {
    const card = Core.buildPreviewCard(
      'Test',
      'Simple explanation here with a few more words to meet the minimum threshold for generating.'
    );
    expect(card.gaps.length).toBeGreaterThanOrEqual(3);
    expect(card.gaps.length).toBeLessThanOrEqual(4);
  });

  it('generates exactly 5 simple sentences', () => {
    const card = Core.buildPreviewCard(
      'Test',
      'This is a test explanation with enough content to generate a proper card.'
    );
    expect(card.simple).toHaveLength(5);
  });

  it('simple version references the concept', () => {
    const card = Core.buildPreviewCard(
      'Photosynthesis',
      'Plants absorb sunlight and convert carbon dioxide and water into glucose and oxygen.'
    );
    expect(card.simple[0]).toContain('Photosynthesis');
  });

  it('simple version includes the user explanation text', () => {
    const card = Core.buildPreviewCard(
      'Photosynthesis',
      'Plants absorb sunlight and convert carbon dioxide and water into glucose and oxygen. This happens in the chloroplasts. Light energy drives the reaction.'
    );
    // At least one of the user's sentences should appear in the simple output.
    const joined = card.simple.join(' ');
    expect(joined).toContain('Plants absorb sunlight');
  });

  it('generates exactly 2 quiz questions', () => {
    const card = Core.buildPreviewCard(
      'Test',
      'This is a test explanation with enough content to generate a proper card.'
    );
    expect(card.quiz.length).toBe(2);
    expect(card.quiz[0]).toHaveProperty('q');
    expect(card.quiz[0]).toHaveProperty('a');
  });

  it('extracts jargon words (max 8)', () => {
    const card = Core.buildPreviewCard(
      'Test',
      'The backpropagation algorithm uses gradients to update weights. API calls are made via HTTP.'
    );
    expect(Array.isArray(card.jargon)).toBe(true);
    expect(card.jargon.length).toBeLessThanOrEqual(8);
  });

  it('includes concept in analogy', () => {
    const card = Core.buildPreviewCard(
      'Machine Learning',
      'This is a test explanation about machine learning concepts.'
    );
    expect(card.analogy).toContain('Machine Learning');
  });

  it('analogy varies by concept', () => {
    const card1 = Core.buildPreviewCard(
      'Photosynthesis',
      'Plants absorb sunlight and convert it to energy using chlorophyll.'
    );
    const card2 = Core.buildPreviewCard(
      'TCP handshake',
      'A three-way handshake establishes a connection between client and server.'
    );
    // Different concepts should (usually) produce different analogies.
    // The pool has 6 entries, so collisions are possible but unlikely for these two.
    expect(card1.analogy).not.toBe(card2.analogy);
  });

  it('quiz questions reference the concept', () => {
    const card = Core.buildPreviewCard(
      'Photosynthesis',
      'Plants absorb sunlight and convert carbon dioxide and water into glucose and oxygen.'
    );
    expect(card.quiz[0].q).toContain('Photosynthesis');
    expect(card.quiz[1].q).toContain('Photosynthesis');
  });

  it('gaps reference the concept when relevant', () => {
    const card = Core.buildPreviewCard(
      'Photosynthesis',
      'its the process by which plants absorb photons and use it to create energy'
    );
    // At least one gap should mention the concept.
    const allGaps = card.gaps.join(' ');
    expect(allGaps).toContain('Photosynthesis');
  });
});

describe('toSharePayload', () => {
  it('truncates v1 to 700 characters', () => {
    const longV1 = 'a'.repeat(1000);
    const card = {
      concept: 'Test',
      v1: longV1,
      score: 80,
      gaps: [],
      simple: [],
      analogy: '',
      quiz: [],
    };
    const payload = Core.toSharePayload(card);
    expect(payload.v1).toHaveLength(700);
  });

  it('preserves all required fields', () => {
    const card = {
      concept: 'Test',
      v1: 'explanation',
      score: 85,
      gaps: ['gap1', 'gap2'],
      simple: ['simple1'],
      analogy: 'analogy',
      quiz: [{ q: 'q', a: 'a' }],
    };
    const payload = Core.toSharePayload(card);
    expect(payload.concept).toBe('Test');
    expect(payload.score).toBe(85);
    expect(payload.gaps).toEqual(['gap1', 'gap2']);
    expect(payload.simple).toEqual(['simple1']);
    expect(payload.analogy).toBe('analogy');
    expect(payload.quiz).toEqual([{ q: 'q', a: 'a' }]);
  });

  it('does not include extra fields', () => {
    const card = {
      concept: 'Test',
      v1: 'explanation',
      score: 85,
      gaps: [],
      simple: [],
      analogy: '',
      quiz: [],
      extra: 'should be ignored',
      jargon: ['also ignored'],
    };
    const payload = Core.toSharePayload(card);
    expect(payload).not.toHaveProperty('extra');
    expect(payload).not.toHaveProperty('jargon');
  });
});

describe('decodeBase64UrlToJson error handling', () => {
  it('throws on invalid base64', () => {
    expect(() => Core.decodeBase64UrlToJson('!!invalid!!')).toThrow();
  });

  it('throws on invalid JSON', () => {
    // Valid base64 but not valid JSON
    const invalidJson = Core.encodeJsonToBase64Url({ test: 1 }).slice(0, -5);
    expect(() => Core.decodeBase64UrlToJson(invalidJson)).toThrow();
  });

  it('handles empty string', () => {
    expect(() => Core.decodeBase64UrlToJson('')).toThrow();
  });
});
