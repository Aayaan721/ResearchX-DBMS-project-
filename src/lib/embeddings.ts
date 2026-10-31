// src/lib/embeddings.ts

declare global {
  // eslint-disable-next-line no-var
  var __featureExtractor: any;
}

let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (global.__featureExtractor) {
    return global.__featureExtractor;
  }

  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      global.__featureExtractor = extractor;
      return extractor;
    })();
  }

  return pipelinePromise;
}

/**
 * Generate 384-dimensional normalized dense vector embedding using Xenova/all-MiniLM-L6-v2
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Input text for embedding generation cannot be empty.');
  }

  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 1000);
  const extractor = await getExtractor();
  const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
  
  const embedding = Array.from(output.data) as number[];
  if (embedding.length !== 384) {
    throw new Error(`Expected 384 dimensions from MiniLM, but got ${embedding.length}`);
  }

  return embedding;
}

/**
 * Formats a numeric array as a PostgreSQL vector literal '[0.01, -0.02, ...]'
 */
export function formatVectorForPg(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
