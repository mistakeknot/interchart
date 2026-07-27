"""Shared fixtures for structural tests.

The shared fixture base lives in ``interverse/_shared``, which is a SEPARATE
repo. A standalone checkout of this plugin — an ``actions/checkout`` in CI, or
anyone cloning it without the monorepo layout — therefore does not contain it,
and an unconditional import here aborted collection for this whole directory,
including tests that need nothing shared.

That is not hypothetical. It is why the ``generate.sh refuses bad input`` gate
was red from the moment it was added: the guard tests pass locally, where
``_shared`` is a sibling directory, and could never have passed in CI. The tests
were fine; the conftest next to them was the thing that failed.

So the import is optional. When ``_shared`` is unavailable the fixtures it
provides become explicit skips, which keeps the failure attributable to the
fixture that is genuinely missing rather than silently widening into "nothing in
this directory can run".
"""

import sys
from pathlib import Path

import pytest

# Add interverse/ to path so the _shared package is importable.
_interverse = Path(__file__).resolve().parents[3]
if str(_interverse) not in sys.path:
    sys.path.insert(0, str(_interverse))

PROJECT_ROOT = Path(__file__).resolve().parents[2]

_SHARED_FIXTURES = (
    "project_root",
    "plugin_json",
    "skills_dir",
    "commands_dir",
    "agents_dir",
    "scripts_dir",
)

try:
    from _shared.tests.structural.conftest_base import create_structural_fixtures
except ModuleNotFoundError:
    _SHARED_AVAILABLE = False
else:
    _SHARED_AVAILABLE = True


def _skip_fixture(name):
    """A stand-in fixture that skips, naming what is actually missing."""

    @pytest.fixture(name=name)
    def _missing():
        pytest.skip(
            f"fixture '{name}' comes from interverse/_shared, which is not "
            "present in a standalone checkout of this plugin"
        )

    return _missing


if _SHARED_AVAILABLE:
    fixtures = create_structural_fixtures(PROJECT_ROOT)

    # Register fixtures in this module's namespace so pytest discovers them
    project_root = fixtures["project_root"]
    plugin_json = fixtures["plugin_json"]
    skills_dir = fixtures["skills_dir"]
    commands_dir = fixtures["commands_dir"]
    agents_dir = fixtures["agents_dir"]
    scripts_dir = fixtures["scripts_dir"]
else:
    for _name in _SHARED_FIXTURES:
        globals()[_name] = _skip_fixture(_name)
