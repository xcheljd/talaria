/**
 * Tests for the imported-PDF attachment schema (parseAttachedPDFs).
 *
 * The import boundary (validateImportConfig -> parseAttachedPDFs) must drop
 * embedded `data` that is not a PDF data URL or exceeds the 10MB cap, while
 * keeping the entry as metadata-only so the PDF list still renders. Valid
 * small PDF data URLs and metadata-only entries (no `data`) pass through.
 */
import { describe, it, expect } from 'vitest';

import { parseAttachedPDFs } from '@/lib/promotion-config-schema';
import { MAX_PDF_SIZE } from '@/lib/pdf-utils';

const VALID_PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQK';

/** Base64 payload (no padding) whose decoded size is just over MAX_PDF_SIZE. */
const OVERSIZED_B64 =
  'A'.repeat(Math.ceil(((MAX_PDF_SIZE + 1) * 4) / 3) + 4);

describe('parseAttachedPDFs', () => {
  it('keeps a valid small PDF data URL', () => {
    const result = parseAttachedPDFs([
      { id: 'a1', name: 'flyer.pdf', size: 1024, data: VALID_PDF_DATA_URL },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'a1',
      name: 'flyer.pdf',
      size: 1024,
      data: VALID_PDF_DATA_URL,
    });
  });

  it('keeps entries with no data field (metadata-only)', () => {
    const result = parseAttachedPDFs([
      { id: 'm1', name: 'meta.pdf', size: 2048, type: 'application/pdf' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
    expect(result[0].data).toBeUndefined();
  });

  it('drops data that is not a PDF data URL (keeps metadata-only entry)', () => {
    const result = parseAttachedPDFs([
      { id: 'x1', name: 'img.png', size: 10, data: 'data:image/png;base64,abc' },
      { id: 'x2', name: 'url.pdf', size: 10, data: 'https://example.com/x.pdf' },
      { id: 'x3', name: 'junk', size: 10, data: 'not-a-data-url' },
    ]);
    expect(result).toHaveLength(3);
    for (const pdf of result) {
      expect(pdf.data).toBeUndefined();
    }
  });

  it('drops oversized PDF data payloads (keeps metadata-only entry)', () => {
    const result = parseAttachedPDFs([
      {
        id: 'big',
        name: 'huge.pdf',
        size: MAX_PDF_SIZE + 1,
        data: `data:application/pdf;base64,${OVERSIZED_B64}`,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('big');
    expect(result[0].data).toBeUndefined();
  });

  it('keeps a data URL right at the 10MB cap', () => {
    // 10MB of payload bytes => largest base64 length (no padding) that
    // decodes to <= MAX_PDF_SIZE: ceil(MAX_PDF_SIZE * 4 / 3)
    const atCapB64 = 'A'.repeat(Math.ceil((MAX_PDF_SIZE * 4) / 3));
    const result = parseAttachedPDFs([
      {
        id: 'cap',
        name: 'at-cap.pdf',
        size: MAX_PDF_SIZE,
        data: `data:application/pdf;base64,${atCapB64}`,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].data).toBe(
      `data:application/pdf;base64,${atCapB64}`
    );
  });
});
