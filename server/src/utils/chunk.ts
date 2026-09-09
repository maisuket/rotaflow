/** Limites da Google Distance Matrix API (tier padrao). */
export const MAX_DIM = 25;
export const MAX_ELEMENTS = 100;

export interface IndexBlock {
  /** Indices originais cobertos por este bloco, na ordem em que devem ser passados a API. */
  indices: number[];
  offset: number;
}

/**
 * Divide uma lista de N indices em blocos de ate `size` elementos,
 * preservando a ordem original.
 */
function splitIntoBlocks(count: number, size: number): IndexBlock[] {
  const blocks: IndexBlock[] = [];
  for (let start = 0; start < count; start += size) {
    const end = Math.min(start + size, count);
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);
    blocks.push({ indices, offset: start });
  }
  return blocks;
}

export interface MatrixRequestPlan {
  originBlock: IndexBlock;
  destinationBlock: IndexBlock;
}

/**
 * Planeja as requisicoes necessarias para cobrir uma matriz originsCount x destinationsCount
 * respeitando os limites de dimensao (25x25) e de elementos por chamada (100).
 */
export function planMatrixRequests(
  originsCount: number,
  destinationsCount: number
): MatrixRequestPlan[] {
  const destBlockSize = Math.min(MAX_DIM, destinationsCount || 1);
  const originBlockSize = Math.min(
    MAX_DIM,
    Math.max(1, Math.floor(MAX_ELEMENTS / destBlockSize)),
    originsCount || 1
  );

  const originBlocks = splitIntoBlocks(originsCount, originBlockSize);
  const destBlocks = splitIntoBlocks(destinationsCount, destBlockSize);

  const plan: MatrixRequestPlan[] = [];
  for (const originBlock of originBlocks) {
    for (const destinationBlock of destBlocks) {
      plan.push({ originBlock, destinationBlock });
    }
  }
  return plan;
}
