import { escapeHtml } from './shared/Badge.js';

function formatBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function InputWorkspace(state) {
  const { input, inputErrors, phase } = state;
  const busy = phase === 'processing';

  return `
    <section class="card" aria-labelledby="input-heading">
      <div class="card__header">
        <div>
          <h3 id="input-heading">Input workspace</h3>
          <p class="hint" style="margin-top:4px;color:var(--text-muted);font-size:var(--text-sm)">
            Provide a SKU or product name, optional text, and source documents to begin structured enrichment.
          </p>
        </div>
      </div>
      <div class="card__body">
        <form id="input-form" class="form-grid" novalidate>
          <div class="field ${inputErrors.sku ? 'field--error' : ''}">
            <label for="input-sku">SKU / product name <span aria-hidden="true">*</span></label>
            <input
              id="input-sku"
              name="sku"
              type="text"
              autocomplete="off"
              placeholder="e.g. HEX-M12-50 or Hex Bolt"
              value="${escapeHtml(input.sku)}"
              ${busy ? 'disabled' : ''}
              required
              aria-required="true"
              aria-invalid="${inputErrors.sku ? 'true' : 'false'}"
              aria-describedby="sku-hint sku-error"
            />
            <span id="sku-hint" class="hint">Demo SKUs: HEX-M12-50 · BB-6205-2RS · IV-GATE-150</span>
            <div class="demo-hints" role="group" aria-label="Load demo product">
              <select id="select-preset-sku" class="custom-select select-animated select--sm" aria-label="Select product template" ${busy ? 'disabled' : ''}>
                <option value="" disabled selected>⚡ Select Demo Product Preset…</option>
                <option value="HEX-M12-50">Hex Bolt M12×50 (Fasteners)</option>
                <option value="BB-6205-2RS">Ball Bearing 6205-2RS (Bearings)</option>
                <option value="IV-GATE-150">Industrial Gate Valve 150 (Valves)</option>
              </select>
              <button type="button" class="demo-chip" data-action="demo-sku" data-sku="HEX-M12-50" ${busy ? 'disabled' : ''}>🔩 HEX-M12-50</button>
              <button type="button" class="demo-chip" data-action="demo-sku" data-sku="BB-6205-2RS" ${busy ? 'disabled' : ''}>⚙️ BB-6205-2RS</button>
              <button type="button" class="demo-chip" data-action="demo-sku" data-sku="IV-GATE-150" ${busy ? 'disabled' : ''}>🚰 IV-GATE-150</button>
            </div>
            ${inputErrors.sku ? `<span id="sku-error" class="field-error">${escapeHtml(inputErrors.sku)}</span>` : '<span id="sku-error" class="sr-only"></span>'}
          </div>

          <div class="form-row">
            <div class="field">
              <label for="input-description">Optional description / supplier text</label>
              <textarea
                id="input-description"
                name="description"
                placeholder="Paste catalog copy or supplier notes…"
                ${busy ? 'disabled' : ''}
              >${escapeHtml(input.description)}</textarea>
            </div>
            <div class="field">
              <label for="input-notes">Reviewer notes</label>
              <textarea
                id="input-notes"
                name="notes"
                placeholder="Context for enrichment or validation…"
                ${busy ? 'disabled' : ''}
              >${escapeHtml(input.notes)}</textarea>
            </div>
          </div>

          <div class="upload-grid">
            <div class="upload-zone" data-upload="pdf">
              <input
                type="file"
                id="input-pdf"
                name="pdf"
                accept=".pdf,application/pdf"
                ${busy ? 'disabled' : ''}
                aria-label="Upload PDF catalog or technical sheet"
              />
              <svg class="upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/>
                <path d="M14 3v5h5"/>
              </svg>
              <div class="upload-zone__title">PDF catalog / tech sheet</div>
              <div class="upload-zone__hint">Drag & drop or click · .pdf</div>
              ${
                input.pdf
                  ? `<div class="upload-zone__file">${escapeHtml(input.pdf.name)} · ${formatBytes(input.pdf.size)}</div>`
                  : ''
              }
            </div>

            <div class="upload-zone" data-upload="image">
              <input
                type="file"
                id="input-image"
                name="image"
                accept=".jpg,.jpeg,.png,.webp,image/*"
                ${busy ? 'disabled' : ''}
                aria-label="Upload product image"
              />
              <svg class="upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <circle cx="8.5" cy="10" r="1.5"/>
                <path d="M21 16l-5-5-4 4-2-2-5 5"/>
              </svg>
              <div class="upload-zone__title">Product image</div>
              <div class="upload-zone__hint">Drag & drop or click · JPG, PNG, WebP</div>
              ${
                input.image
                  ? `<div class="upload-zone__file">
                      ${
                        input.imagePreviewUrl
                          ? `<img class="upload-zone__preview" src="${input.imagePreviewUrl}" alt="Product preview" />`
                          : ''
                      }
                      ${escapeHtml(input.image.name)} · ${formatBytes(input.image.size)}
                    </div>`
                  : ''
              }
            </div>
          </div>

          <div class="btn-group" style="margin-top: var(--space-2)">
            <button type="submit" class="btn btn--primary" ${busy ? 'disabled' : ''} data-action="run-pipeline">
              ${busy ? 'Running pipeline…' : 'Run intelligence pipeline'}
            </button>
            <button type="button" class="btn btn--secondary" data-action="auto-run-demo" id="auto-run-demo-btn" ${busy ? 'disabled' : ''}>
              ⚡ Auto-Run Demo
            </button>
            <button type="button" class="btn btn--ghost" data-action="reset-app" ${busy ? 'disabled' : ''}>
              Reset workspace
            </button>
          </div>
        </form>
      </div>
    </section>
  `;
}
