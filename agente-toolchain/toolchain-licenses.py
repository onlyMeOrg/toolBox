#!/usr/bin/env python3
"""Write the license notices for the Rust toolchain /agente/ ships (rustc.wasm, wild.wasm and the
standard library), using the reference project's own generator (scripts/licenses.py of
rust-playground-inbrowser), limited to what we take from it: not its interface, not its crates.

Usage: toolchain-licenses.py <rust-playground-inbrowser checkout, built> <out.html>
"""

import importlib.util
import pathlib
import subprocess
import sys

root = pathlib.Path(sys.argv[1]).resolve()
spec = importlib.util.spec_from_file_location("licenses", root / "scripts/licenses.py")
licenses = importlib.util.module_from_spec(spec)
spec.loader.exec_module(licenses)

# The generator asks cargo for metadata offline, with every feature: that needs each workspace's
# packages for every platform in cargo's cache, more than a build downloads.
for workspace in (licenses.RUST, licenses.RUST / "library", licenses.WILD):
    subprocess.run([*licenses.CARGO, "fetch"], cwd=workspace, check=True)

KEEP = {"rustc", "wild", "sysroot"}
cargo_packages = licenses.cargo_packages
components = licenses.components
# The interface's npm packages and the prebuilt crates are not shipped by us: don't look them up.
licenses.npm_packages = lambda: []
licenses.cargo_packages = lambda path, *args: [] if pathlib.Path(path) == root / "crates" else cargo_packages(path, *args)
licenses.components = lambda: [c for c in components() if c[0] in KEEP]
sys.argv = [sys.argv[0], sys.argv[2]]
licenses.main()
