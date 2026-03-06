"""Regression coverage for checked-in generated artifacts."""

import json


def test_scan_cache_tracks_intercheck_quality(project_root):
    """Cached scan output should use the canonical intercheck quality skill id."""
    scan_path = project_root / "data" / "scan.json"
    data = json.loads(scan_path.read_text())

    node_ids = {node["id"] for node in data["nodes"]}
    assert "intercheck:quality" in node_ids
    assert "intercheck:status" not in node_ids

    edge_targets = {edge["target"] for edge in data["edges"]}
    assert "intercheck:quality" in edge_targets
    assert "intercheck:status" not in edge_targets


def test_workflow_template_tracks_intercheck_quality(project_root):
    """Workflow overlays should point at the canonical intercheck quality skill."""
    template_path = project_root / "templates" / "ecosystem.html"
    template = template_path.read_text(encoding="utf-8")

    assert "intercheck:quality" in template
    assert "intercheck:status" not in template
