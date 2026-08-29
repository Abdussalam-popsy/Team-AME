import { useState } from 'react';
import type { HiringInput, RunKind, VcInput } from '../../shared/types.js';
import { FERNBACK_HIRING, FERNBACK_VC } from '../inputs.js';

type Props = {
  kind: RunKind;
  busy: boolean;
  onStart: (input: VcInput | HiringInput, pilot: boolean, forceRefresh: boolean) => void;
};

const list = (s: string): string[] =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function RunForm({ kind, busy, onStart }: Props) {
  const [vc, setVc] = useState<VcInput>(FERNBACK_VC);
  const [hiring, setHiring] = useState<HiringInput>(FERNBACK_HIRING);
  const [pilot, setPilot] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(kind === 'vc' ? vc : hiring, pilot, forceRefresh);
      }}
    >
      {kind === 'vc' ? (
        <>
          <label>
            Company description
            <textarea
              rows={4}
              value={vc.companyDescription}
              onChange={(e) => setVc({ ...vc, companyDescription: e.target.value })}
            />
          </label>
          <div className="row">
            <label>
              Website
              <input
                value={vc.website ?? ''}
                onChange={(e) => setVc({ ...vc, website: e.target.value })}
              />
            </label>
            <label>
              Stage
              <input value={vc.stage} onChange={(e) => setVc({ ...vc, stage: e.target.value })} />
            </label>
            <label>
              Round size (USD)
              <input
                type="number"
                value={vc.roundSizeUsd}
                onChange={(e) => setVc({ ...vc, roundSizeUsd: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="row">
            <label>
              Geography
              <input
                value={vc.geography}
                onChange={(e) => setVc({ ...vc, geography: e.target.value })}
              />
            </label>
            <label>
              Sector tags
              <input
                value={vc.sectorTags.join(', ')}
                onChange={(e) => setVc({ ...vc, sectorTags: list(e.target.value) })}
              />
            </label>
            <label>
              Exclude firms
              <input
                value={vc.excludeFirms.join(', ')}
                onChange={(e) => setVc({ ...vc, excludeFirms: list(e.target.value) })}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <label>
              Role
              <input
                value={hiring.role}
                onChange={(e) => setHiring({ ...hiring, role: e.target.value })}
              />
            </label>
            <label>
              Seniority
              <input
                value={hiring.seniority}
                onChange={(e) => setHiring({ ...hiring, seniority: e.target.value })}
              />
            </label>
            <label>
              Location
              <input
                value={hiring.location}
                onChange={(e) => setHiring({ ...hiring, location: e.target.value })}
              />
            </label>
          </div>
          <label>
            Job description
            <textarea
              rows={4}
              value={hiring.jobDescription}
              onChange={(e) => setHiring({ ...hiring, jobDescription: e.target.value })}
            />
          </label>
          <div className="row">
            <label>
              Must-haves (one per line)
              <textarea
                rows={3}
                value={hiring.mustHaves.join('\n')}
                onChange={(e) => setHiring({ ...hiring, mustHaves: list(e.target.value) })}
              />
            </label>
            <label>
              Nice-to-haves (one per line)
              <textarea
                rows={3}
                value={hiring.niceToHaves.join('\n')}
                onChange={(e) => setHiring({ ...hiring, niceToHaves: list(e.target.value) })}
              />
            </label>
          </div>
        </>
      )}

      <div className="row actions">
        <label className="inline">
          <input type="checkbox" checked={pilot} onChange={(e) => setPilot(e.target.checked)} />
          Pilot mode (few rows, low spend)
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={forceRefresh}
            onChange={(e) => setForceRefresh(e.target.checked)}
          />
          Force refresh (bypass cache, re-bills)
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Running…' : `Run ${kind === 'vc' ? 'VC research' : 'hiring search'}`}
        </button>
      </div>
    </form>
  );
}
