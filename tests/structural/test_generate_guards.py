"""Regression coverage for generate.sh's refuse-to-write guards.

This generator has written a collapsed 6-node artefact over a good 244-node one
three times: fixed at the artefact level in d9e56df (2026-07-23), recurred in
bb3725e (2026-07-24), and again on 2026-07-27. Each fix repaired the file and
left the cause in place, so it came back.

These tests cover the cause instead of the artefact. They must keep failing
loudly if either guard is removed or weakened.
"""

import json
import subprocess

MONOREPO_MARKERS = ("interverse", "os")


def _run(script, *args, env=None):
    return subprocess.run(
        ["bash", str(script), *[str(a) for a in args]],
        capture_output=True,
        text=True,
        env=env,
    )


def _make_sparse_root(tmp_path, plugin_src):
    """A root that passes the marker check but has an almost empty estate.

    This is the git-worktree shape: interverse/ and os/ exist, but nearly none
    of the ~115 nested repos are materialised.
    """
    root = tmp_path / "sparse"
    (root / "interverse").mkdir(parents=True)
    (root / "os").mkdir(parents=True)
    subprocess.run(
        ["cp", "-R", str(plugin_src), str(root / "interverse" / plugin_src.name)],
        check=True,
    )
    subprocess.run(
        ["rm", "-rf", str(root / "interverse" / plugin_src.name / ".git")],
        check=True,
    )
    return root


def test_refuses_a_root_that_is_not_the_monorepo(project_root, tmp_path):
    """Passing a plugin directory as the root must fail, not silently rescope.

    The historical failure: one wrong argument narrowed the scan to a single
    plugin *and* redirected the output into that plugin's own docs/, because
    the output path is derived from the root.
    """
    out = tmp_path / "should-not-exist.html"
    result = _run(project_root / "scripts" / "generate.sh", project_root, out)

    assert result.returncode == 2, result.stderr
    assert "not the Sylveste monorepo root" in result.stderr
    assert not out.exists(), "refused run must not create the output"


def test_refuses_a_collapsed_scan_below_the_absolute_floor(project_root, tmp_path):
    """A sparse root passes the marker check; the node floor must catch it.

    The floor exists because a ratio check alone is not enough: it needs a
    trustworthy baseline, and data/scan.json was itself poisoned to 6 nodes in
    HEAD, so a cache-relative comparison would have compared 6 to 6 and passed.
    """
    root = _make_sparse_root(tmp_path, project_root)
    out = tmp_path / "floor.html"
    result = _run(project_root / "scripts" / "generate.sh", root, out)

    assert result.returncode == 3, result.stderr
    assert "below the absolute floor" in result.stderr
    assert not out.exists(), "refused run must not create the output"


def test_refuses_a_collapse_against_an_existing_artefact(project_root, tmp_path):
    """With the floor disabled, the ratio guard must still refuse and preserve.

    The prior artefact has to survive byte-for-byte — the whole point is that a
    failed run cannot destroy a good diagram.
    """
    root = _make_sparse_root(tmp_path, project_root)
    good = project_root / "docs" / "diagrams" / "ecosystem.html"
    out = tmp_path / "existing.html"
    out.write_bytes(good.read_bytes())
    before = out.read_bytes()

    import os

    env = {**os.environ, "INTERCHART_MIN_NODES": "1"}
    result = _run(project_root / "scripts" / "generate.sh", root, out, env=env)

    assert result.returncode == 3, result.stderr
    assert "scan collapsed" in result.stderr
    assert out.read_bytes() == before, "the existing artefact must be untouched"


def test_threshold_derivation_is_recorded_next_to_the_threshold(project_root):
    """The ratio must ship with its derivation, not a bare number.

    0.5 was chosen because the largest legitimate decrease in this artefact's
    12-commit history is -22.9% (188 -> 145, 2026-04-05) while the failure mode
    is -97.6% (249 -> 6). Anyone retuning it needs those numbers in front of
    them, so they live in the script.
    """
    script = (project_root / "scripts" / "generate.sh").read_text(encoding="utf-8")

    assert "THRESHOLD DERIVATION" in script
    assert "188 -> 145" in script
    assert "COLLAPSE_RATIO" in script


def test_repeat_runs_do_not_rewrite_an_unchanged_artefact(project_root):
    """A correct run must be idempotent.

    Previously the HTML was written unconditionally with a fresh timestamp, so
    every run dirtied the repo even when nothing changed. The scan cache was
    already guarded against exactly this; the artefact anyone actually looks at
    was not.
    """
    script = (project_root / "scripts" / "generate.sh").read_text(encoding="utf-8")

    assert "canonical_hash" in script
    assert "Unchanged:" in script


def test_generated_artifact_is_a_full_estate_scan(project_root):
    """The checked-in artefact and scan cache must both reflect the whole estate.

    data/scan.json sat at 6 nodes in HEAD while ecosystem.html sat at 244 — the
    two halves of one artefact disagreeing by 40x, with nothing reporting it.
    """
    scan = json.loads((project_root / "data" / "scan.json").read_text())
    html = (project_root / "docs" / "diagrams" / "ecosystem.html").read_text(
        encoding="utf-8"
    )

    assert scan["stats"]["nodes"] >= 100, (
        f"scan cache has only {scan['stats']['nodes']} nodes — it was generated "
        "against a subtree, not the monorepo"
    )
    assert f'"nodes": {scan["stats"]["nodes"]}' in html, (
        "ecosystem.html and data/scan.json disagree on node count; they must be "
        "generated by the same run"
    )
