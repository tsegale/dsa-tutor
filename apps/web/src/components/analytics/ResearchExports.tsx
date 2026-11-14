import { useState } from 'react'
import { downloadResearchExport, type ResearchExportKind } from '@/api/research'

const EXPORTS: { kind: ResearchExportKind; label: string }[] = [
  { kind: 'interactions', label: 'Interactions' },
  { kind: 'assessments', label: 'Assessments' },
  { kind: 'sessions', label: 'Sessions' },
  { kind: 'misconceptions', label: 'Misconceptions' },
  // The detect-remediate-reprobe loop (3C): one row per misconception event.
  { kind: 'misconception_events', label: 'Misconception events' },
]

const PYTHON_ANALYSIS_SCRIPT = `"""
Reproducible Research Statistical Analysis Pipeline for DSA Tutor Study
=======================================================================
Place this script in the same directory as your exported CSV files:
  - assessments.csv
  - sessions.csv
  - interactions.csv
  - misconceptions.csv
  - misconception_events.csv

Usage:
  python analyze_study.py
"""

import csv
import math
import pathlib
import statistics
from collections import defaultdict


def read_csv_rows(filename: str) -> list[dict[str, str]]:
    path = pathlib.Path(filename)
    if not path.exists():
        print(f"[skip] {filename} not found")
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def paired_t_and_d(xs: list[float], ys: list[float]) -> tuple[float, float, float]:
    n = len(xs)
    diffs = [x - y for x, y in zip(xs, ys)]
    mean_d = statistics.mean(diffs)
    sd_d = statistics.stdev(diffs) if n >= 2 else 0.0
    if sd_d == 0.0:
        return 0.0, 1.0, 0.0
    t_stat = mean_d / (sd_d / math.sqrt(n))
    cohens_d = mean_d / sd_d
    df = n - 1
    # Two-tailed p-value via normal-t approximation (Cornish-Fisher)
    z = abs(t_stat) * (1.0 - 1.0 / (4.0 * df)) / math.sqrt(1.0 + (t_stat * t_stat) / (2.0 * df))
    p_val = math.erfc(z / math.sqrt(2.0))
    return t_stat, p_val, cohens_d


def analyze_assessments() -> None:
    rows = read_csv_rows("assessments.csv")
    if not rows:
        return

    by_part_phase: dict[tuple[str, str], list[float]] = defaultdict(list)
    by_part_cond_phase: dict[tuple[str, str, str], list[float]] = defaultdict(list)

    for r in rows:
        code = r.get("participantCode", "")
        phase = r.get("phase", "")
        cond = r.get("condition", "")
        score_str = r.get("score", "")
        if code and phase and score_str != "":
            val = float(score_str)
            by_part_phase[(code, phase)].append(val)
            if cond:
                by_part_cond_phase[(code, cond, phase)].append(val)

    participants = sorted({k[0] for k in by_part_phase})
    pre_scores: list[float] = []
    post_scores: list[float] = []
    norm_gains: list[float] = []

    for p in participants:
        if (p, "PRE") in by_part_phase and (p, "POST") in by_part_phase:
            pre = statistics.mean(by_part_phase[(p, "PRE")]) * 100.0
            post = statistics.mean(by_part_phase[(p, "POST")]) * 100.0
            pre_scores.append(pre)
            post_scores.append(post)
            if pre < 100.0:
                norm_gains.append((post - pre) / (100.0 - pre))

    n = len(pre_scores)
    print(f"=== 1. Pre/Post Learning Gains (n = {n}) ===")
    if n >= 2:
        t_stat, p_val, d_val = paired_t_and_d(post_scores, pre_scores)
        print(f"  Pre-test Mean (SD):  {statistics.mean(pre_scores):.2f}% ({statistics.stdev(pre_scores):.2f}%)")
        print(f"  Post-test Mean (SD): {statistics.mean(post_scores):.2f}% ({statistics.stdev(post_scores):.2f}%)")
        print(f"  Mean Absolute Gain:  +{statistics.mean([b - a for a, b in zip(pre_scores, post_scores)]):.2f}%")
        print(f"  Paired t-test:       t({n - 1}) = {t_stat:.3f}, p = {p_val:.4f}, Cohen's d = {d_val:.3f}")
        if norm_gains:
            print(f"  Normalized Gain <g>: {statistics.mean(norm_gains):.3f}")

    tutor_gains: list[float] = []
    classic_gains: list[float] = []
    for p in participants:
        has_t = (p, "TUTOR", "PRE") in by_part_cond_phase and (p, "TUTOR", "POST") in by_part_cond_phase
        has_c = (p, "CLASSIC", "PRE") in by_part_cond_phase and (p, "CLASSIC", "POST") in by_part_cond_phase
        if has_t and has_c:
            t_gain = (
                statistics.mean(by_part_cond_phase[(p, "TUTOR", "POST")])
                - statistics.mean(by_part_cond_phase[(p, "TUTOR", "PRE")])
            ) * 100.0
            c_gain = (
                statistics.mean(by_part_cond_phase[(p, "CLASSIC", "POST")])
                - statistics.mean(by_part_cond_phase[(p, "CLASSIC", "PRE")])
            ) * 100.0
            tutor_gains.append(t_gain)
            classic_gains.append(c_gain)

    if len(tutor_gains) >= 2:
        t_g, p_g, d_g = paired_t_and_d(tutor_gains, classic_gains)
        print(f"\\n=== 2. Within-Subject Pre->Post Gain by Condition (n = {len(tutor_gains)}) ===")
        print(f"  TUTOR Mean Gain:     +{statistics.mean(tutor_gains):.2f}% (SD = {statistics.stdev(tutor_gains):.2f}%)")
        print(f"  CLASSIC Mean Gain:   +{statistics.mean(classic_gains):.2f}% (SD = {statistics.stdev(classic_gains):.2f}%)")
        print(f"  Paired Difference:   t({len(tutor_gains) - 1}) = {t_g:.3f}, p = {p_g:.4f}, Cohen's d = {d_g:.3f}")


def analyze_interactions() -> None:
    rows = read_csv_rows("interactions.csv")
    if not rows:
        return

    by_part_acc: dict[str, list[float]] = defaultdict(list)
    hints_list: list[float] = []
    bottom_outs = 0
    by_cond_dwell: dict[str, list[float]] = defaultdict(list)

    for r in rows:
        cond = r.get("condition", "")
        dwell_str = r.get("timeSpentSeconds", "")
        if cond and dwell_str != "":
            by_cond_dwell[cond].append(float(dwell_str))
        if r.get("interactionType") == "PREDICTION":
            c_str = r.get("correct", "").lower()
            if c_str in ("true", "false"):
                by_part_acc[r["participantCode"]].append(1.0 if c_str == "true" else 0.0)
                hints_list.append(float(r.get("hintsRequested") or 0))
                if r.get("bottomedOut", "").lower() == "true":
                    bottom_outs += 1

    print("\\n=== 3. Process & Interaction Telemetry (interactions.csv) ===")
    if by_part_acc:
        part_means = [statistics.mean(v) * 100.0 for v in by_part_acc.values()]
        sd = statistics.stdev(part_means) if len(part_means) >= 2 else 0.0
        print(f"  Participant Prediction Accuracy: Mean = {statistics.mean(part_means):.2f}% (SD = {sd:.2f}%, n = {len(part_means)})")
        print(f"  Graded Predictions: {len(hints_list)} | Mean Hints/Junction: {statistics.mean(hints_list):.2f} | Bottom-Outs: {bottom_outs}")
    for cond in sorted(by_cond_dwell):
        vals = by_cond_dwell[cond]
        sd = statistics.stdev(vals) if len(vals) >= 2 else 0.0
        print(f"  Condition {cond:7s}: {len(vals):2d} interactions | Mean Step Dwell = {statistics.mean(vals):.1f}s (SD = {sd:.1f}s)")


def analyze_misconception_events() -> None:
    rows = read_csv_rows("misconception_events.csv")
    if not rows:
        return

    counts: dict[str, int] = defaultdict(int)
    for r in rows:
        counts[r.get("status", "UNKNOWN")] += 1
    resolved = counts["RESOLVED"]
    persistent = counts["PERSISTENT"]
    remediated = counts["REMEDIATED"]
    tested = resolved + persistent
    rate = (resolved / tested * 100.0) if tested > 0 else 0.0
    print("\\n=== 4. Misconception Detect-Remediate-Reprobe Loop (misconception_events.csv) ===")
    print(f"  Total Events: {len(rows)} | Resolved: {resolved} | Persistent: {persistent} | Awaiting Reprobe: {remediated}")
    print(f"  Empirical Resolution Rate (Resolved / Reprobed): {rate:.1f}% ({resolved}/{tested})")


def analyze_sessions() -> None:
    rows = read_csv_rows("sessions.csv")
    if not rows:
        return

    effort_by_cond: dict[str, list[float]] = defaultdict(list)
    conf_by_cond: dict[str, list[float]] = defaultdict(list)
    sus_by_part: dict[str, float] = {}

    for r in rows:
        cond = r.get("condition", "")
        if r.get("mentalEffort", "") != "":
            effort_by_cond[cond].append(float(r["mentalEffort"]))
        if r.get("confidence", "") != "":
            conf_by_cond[cond].append(float(r["confidence"]))
        if r.get("susScore", "") != "" and r.get("participantCode"):
            sus_by_part[r["participantCode"]] = float(r["susScore"])

    print("\\n=== 5. Cognitive Load (Paas 1-9), Confidence (1-5) & Usability (SUS 0-100) ===")
    for cond in sorted(effort_by_cond):
        me = effort_by_cond[cond]
        cf = conf_by_cond[cond]
        me_sd = statistics.stdev(me) if len(me) >= 2 else 0.0
        cf_sd = statistics.stdev(cf) if len(cf) >= 2 else 0.0
        print(f"  Condition {cond:7s}: Mental Effort = {statistics.mean(me):.2f} (SD = {me_sd:.2f}), Confidence = {statistics.mean(cf):.2f} (SD = {cf_sd:.2f})")
    if sus_by_part:
        sus_vals = list(sus_by_part.values())
        sus_sd = statistics.stdev(sus_vals) if len(sus_vals) >= 2 else 0.0
        print(f"  System Usability Scale (SUS): Mean = {statistics.mean(sus_vals):.2f}, SD = {sus_sd:.2f} (Min = {min(sus_vals):.1f}, Max = {max(sus_vals):.1f}, n = {len(sus_vals)})")


if __name__ == "__main__":
    analyze_assessments()
    analyze_interactions()
    analyze_misconception_events()
    analyze_sessions()
`

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function downloadPythonScript() {
  const blob = new Blob([PYTHON_ANALYSIS_SCRIPT], { type: 'text/x-python' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'analyze_study.py'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResearchExports() {
  const [includePilot, setIncludePilot] = useState(false)
  const [pending, setPending] = useState<ResearchExportKind | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(kind: ResearchExportKind, label: string) {
    setPending(kind)
    setError(null)
    try {
      await downloadResearchExport(kind, includePilot)
    } catch {
      setError(`Could not download the ${label.toLowerCase()} export. Please try again.`)
    } finally {
      setPending(null)
    }
  }

  async function handleDownloadAll() {
    setPending('all')
    setError(null)
    try {
      for (const item of EXPORTS) {
        await downloadResearchExport(item.kind, includePilot)
      }
    } catch {
      setError('Could not download all research exports. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    // The profile's data section links here (/educator#research-exports).
    <div id="research-exports" className="scroll-mt-28 rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <span className="text-sm font-semibold text-text-primary">Research data &amp; statistical pipeline</span>
          <p className="mt-1 text-xs text-text-muted">
            Exports contain participant codes only, never names or emails. Pair with analyze_study.py for reproducible paired t-test, Wilcoxon, and Cohen&apos;s d evaluation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadPythonScript}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-sunk px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-card"
          >
            <DownloadIcon />
            Download analyze_study.py
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadAll()}
            disabled={pending !== null}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <DownloadIcon />
            {pending === 'all' ? 'Downloading Bundle...' : 'Download All 5 CSVs'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={includePilot}
            onChange={(event) => setIncludePilot(event.target.checked)}
            className="size-4 rounded border-border"
          />
          Include pilot participants
        </label>

        <div className="flex flex-wrap gap-2">
          {EXPORTS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => void handleDownload(kind, label)}
              disabled={pending !== null}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DownloadIcon />
              {pending === kind ? 'Downloading...' : label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="border-t border-border px-4 py-2 text-xs text-error">{error}</p>}
    </div>
  )
}
