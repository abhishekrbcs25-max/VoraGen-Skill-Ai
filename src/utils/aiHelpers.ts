export type ChatModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
export type ThinkingPreset = 'low' | 'medium' | 'high' | 'xhigh' | 'minimal';

export interface GroundingSource {
  title: string;
  url: string;
  sourceType: 'search' | 'maps' | 'web';
}

export interface InteractionStepLike {
  type?: string;
  content?: Array<{
    type?: string;
    text?: string;
    data?: string;
    mime_type?: string;
  }>;
  summary?: Array<{ type?: string; text?: string }>;
  result?: unknown;
  grounding_chunks?: Array<{
    web?: { uri?: string; title?: string };
    maps?: { uri?: string; title?: string };
  }>;
}

export function normalizeThinkingLevel(
  model: ChatModelId,
  requested?: ThinkingPreset,
): ThinkingPreset | undefined {
  if (model === 'gemini-3.1-flash-lite') {
    return requested === 'low' || requested === 'medium' || requested === 'high'
      ? requested
      : 'minimal';
  }
  // gemini-4-hydrogen supports low, medium, high, xhigh (not minimal)
  if (requested === 'minimal') return 'low';
  return requested || 'medium';
}

export function combineInteractionText(steps: InteractionStepLike[] | undefined | null): {
  text: string;
  thoughtSummary: string;
} {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { text: '', thoughtSummary: '' };
  }

  let text = '';
  let thoughtSummary = '';

  for (const step of steps) {
    if (step.type === 'model_output' && Array.isArray(step.content)) {
      for (const part of step.content) {
        if (part.type === 'text' && typeof part.text === 'string') {
          text += part.text;
        }
      }
    } else if (step.type === 'thought' && Array.isArray(step.summary)) {
      const summaryChunk = step.summary
        .map((c) => (typeof c.text === 'string' ? c.text : ''))
        .join('');
      if (summaryChunk) {
        thoughtSummary += (thoughtSummary ? '\n' : '') + summaryChunk;
      }
    }
  }

  return { text: text.trim(), thoughtSummary: thoughtSummary.trim() };
}

export function extractGroundingSources(steps: InteractionStepLike[] | undefined | null): GroundingSource[] {
  if (!Array.isArray(steps)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  const pushSource = (title: string | undefined, url: string | undefined, sourceType: GroundingSource['sourceType']) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
    if (seen.has(url)) return;
    seen.add(url);
    sources.push({
      title: (title || url).trim(),
      url,
      sourceType,
    });
  };

  for (const step of steps) {
    if (Array.isArray(step.grounding_chunks)) {
      for (const chunk of step.grounding_chunks) {
        if (chunk.maps?.uri) pushSource(chunk.maps.title, chunk.maps.uri, 'maps');
        if (chunk.web?.uri) pushSource(chunk.web.title, chunk.web.uri, 'search');
      }
    }

    const raw = step.result;
    if (raw && typeof raw === 'object') {
      const visit = (node: unknown, kind: GroundingSource['sourceType']) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const item of node) visit(item, kind);
          return;
        }
        const rec = node as Record<string, unknown>;
        const uri =
          (typeof rec.uri === 'string' && rec.uri) ||
          (typeof rec.url === 'string' && rec.url) ||
          (typeof rec.googleMapsUri === 'string' && rec.googleMapsUri) ||
          '';
        const title =
          (typeof rec.title === 'string' && rec.title) ||
          (typeof rec.name === 'string' && rec.name) ||
          (typeof rec.displayName === 'string' && rec.displayName) ||
          undefined;
        if (uri) {
          pushSource(title, uri, uri.includes('maps.google') || uri.includes('google.com/maps') ? 'maps' : kind);
        }
        for (const val of Object.values(rec)) {
          if (val && typeof val === 'object') visit(val, kind);
        }
      };

      const inferredKind: GroundingSource['sourceType'] =
        step.type?.includes('maps') ? 'maps' : 'search';
      visit(raw, inferredKind);
    }
  }

  return sources;
}
