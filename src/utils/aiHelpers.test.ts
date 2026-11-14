import test from 'node:test';
import assert from 'node:assert/strict';
import {
  combineInteractionText,
  extractGroundingSources,
  normalizeThinkingLevel,
} from './aiHelpers';

test('normalizeThinkingLevel enforces model-specific thinking presets', () => {
  assert.equal(normalizeThinkingLevel('gemini-3.1-flash-lite', 'xhigh'), 'minimal');
  assert.equal(normalizeThinkingLevel('gemini-3.1-flash-lite', 'low'), 'low');
  assert.equal(normalizeThinkingLevel('gemini-4-hydrogen', 'minimal'), 'low');
  assert.equal(normalizeThinkingLevel('gemini-4-hydrogen', 'xhigh'), 'xhigh');
});

test('combineInteractionText stitches multi-step model_output and thought summaries safely', () => {
  const result = combineInteractionText([
    {
      type: 'thought',
      summary: [{ type: 'text', text: 'Checking React skill gaps.' }],
    },
    {
      type: 'model_output',
      content: [{ type: 'text', text: 'Part 1: Focus on hooks. ' }],
    },
    {
      type: 'model_output',
      content: [{ type: 'text', text: 'Part 2: Build a CRUD API.' }],
    },
  ]);

  assert.equal(result.thoughtSummary, 'Checking React skill gaps.');
  assert.equal(result.text, 'Part 1: Focus on hooks. Part 2: Build a CRUD API.');
});

test('extractGroundingSources deduplicates Search and Maps URLs', () => {
  const sources = extractGroundingSources([
    {
      type: 'google_search_result',
      result: [
        { title: 'React Docs', url: 'https://react.dev/learn' },
        { title: 'React Docs Duplicate', url: 'https://react.dev/learn' },
      ],
    },
    {
      type: 'google_maps_result',
      grounding_chunks: [
        { maps: { title: 'Google Bengaluru', uri: 'https://maps.google.com/?cid=123' } },
      ],
    },
  ]);

  assert.equal(sources.length, 2);
  assert.equal(sources[0].sourceType, 'search');
  assert.equal(sources[1].sourceType, 'maps');
});
