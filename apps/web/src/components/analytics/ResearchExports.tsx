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
========================================================================
Place this script in the same directory as your exported CSV files:
  - assessments.csv
  - sessions.csv
  - interactions.csv
  - misconceptions.csv
  - misconception_events.csv

Usage:
  python analyze_study.py
"""

import math
import pathlib
import pandas as pd
from scipy import stats


def cohens_d_paired(diffs: pd.Series) -> float:
    std = diffs.std(ddof=1)
    if std == 0 or math.isnan(std):
        return 0.0
    return float(diffs.mean() / std)


def analyze_assessments() -> None:
    path = pathlib.Path("assessments.csv")
    if not path.exists():
        print("[skip] assessments.csv not found")
        return
    df = pd.read_csv(path)
    if df.empty:
        print("[info] assessments.csv has 0 rows")
        return

    item_scores = (
        df.groupby(["participantCode", "kind"])["correct"]
        .mean()
        .unstack()
        * 100.0
    )
    if "PRE" in item_scores.columns and "POST" in item_scores.columns:
        paired = item_scores.dropna(subset=["PRE", "POST"]).copy()
        paired["gain"] = paired["POST"] - paired["PRE"]
        paired["norm_gain"] = paired["gain"] / (100.0 - paired["PRE"]).replace(0, float("nan"))
        n = len(paired)
        print(f"=== 1. Pre/Post Learning Gains (n = {n}) ===")
        if n >= 2:
            t_stat, p_val = stats.ttest_rel(paired["POST"], paired["PRE"])
            w_stat, w_pval = stats.wilcoxon(paired["POST"], paired["PRE"], zero_method="zsplit")
            d_val = cohens_d_paired(paired["gain"])
            print(f"  Pre-test Mean (SD):  {paired['PRE'].mean():.2f}% ({paired['PRE'].std():.2f}%)")
            print(f"  Post-test Mean (SD): {paired['POST'].mean():.2f}% ({paired['POST'].std():.2f}%)")
            print(f"  Paired t-test:       t = {t_stat:.3f}, p = {p_val:.4f}, Cohen's d = {d_val:.3f}")
            print(f"  Wilcoxon signed:     W = {w_stat:.3f}, p = {w_pval:.4f}")
            print(f"  Normalized Gain <g>: {paired['norm_gain'].mean():.3f}")


def analyze_conditions() -> None:
    path = pathlib.Path("interactions.csv")
    if not path.exists():
        print("[skip] interactions.csv not found")
        return
    df = pd.read_csv(path)
    if df.empty or "condition" not in df.columns:
        print("[info] interactions.csv has 0 rows")
        return

    by_cond = (
        df.groupby(["participantCode", "condition"])["correct"]
        .mean()
        .unstack()
        * 100.0
    )
    print("\\n=== 2. Within-Subject Condition Comparison (TUTOR vs CLASSIC) ===")
    for col in by_cond.columns:
        series = by_cond[col].dropna()
        print(f"  Condition {col}: n = {len(series)}, Mean Accuracy = {series.mean():.2f}% (SD = {series.std():.2f}%)")

    if "TUTOR" in by_cond.columns and "CLASSIC" in by_cond.columns:
        both = by_cond.dropna(subset=["TUTOR", "CLASSIC"])
        if len(both) >= 2:
            diffs = both["TUTOR"] - both["CLASSIC"]
            t_stat, p_val = stats.ttest_rel(both["TUTOR"], both["CLASSIC"])
            d_val = cohens_d_paired(diffs)
            print(f"  Paired TUTOR vs CLASSIC: t = {t_stat:.3f}, p = {p_val:.4f}, Cohen's d = {d_val:.3f}")


def analyze_misconception_events() -> None:
    path = pathlib.Path("misconception_events.csv")
    if not path.exists():
        print("[skip] misconception_events.csv not found")
        return
    df = pd.read_csv(path)
    if df.empty:
        print("[info] misconception_events.csv has 0 rows")
        return

    print("\\n=== 3. Misconception Detect-Remediate-Reprobe Loop ===")
    counts = df["status"].value_counts().to_dict()
    resolved = counts.get("RESOLVED", 0)
    persistent = counts.get("PERSISTENT", 0)
    tested = resolved + persistent
    rate = (resolved / tested * 100.0) if tested > 0 else 0.0
    print(f"  Total Detected: {len(df)} | Resolved: {resolved} | Persistent: {persistent} | Resolution Rate: {rate:.1f}%")


def analyze_sessions() -> None:
    path = pathlib.Path("sessions.csv")
    if not path.exists():
        print("[skip] sessions.csv not found")
        return
    df = pd.read_csv(path)
    if df.empty:
        print("[info] sessions.csv has 0 rows")
        return

    print("\\n=== 4. Cognitive Load (Paas 1-9) & Usability (SUS 0-100) ===")
    if "mentalEffort" in df.columns:
        me = df["mentalEffort"].dropna()
        if not me.empty:
            print(f"  Mental Effort (1-9): Mean = {me.mean():.2f}, SD = {me.std():.2f} (n = {len(me)} sessions)")
    if "susScore" in df.columns:
        sus = df.groupby("participantCode")["susScore"].first().dropna()
        if not sus.empty:
            print(f"  System Usability Scale (SUS): Mean = {sus.mean():.2f}, SD = {sus.std():.2f} (n = {len(sus)} participants)")


if __name__ == "__main__":
    analyze_assessments()
    analyze_conditions()
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
