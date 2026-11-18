"""CI: Modrinth에서 L_Ender's Cataclysm(NeoForge 1.21.1) 최신판과 필수 의존 모드를 run/mods 에 받는다."""
import json, os, sys, urllib.parse, urllib.request

API = "https://api.modrinth.com/v2"
LOADERS = json.dumps(["neoforge"])
GAME = json.dumps(["1.21.1"])
OUT = sys.argv[1] if len(sys.argv) > 1 else "run/mods"
HEADERS = {"User-Agent": "royalpeak58649/fixercity-ci"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return json.load(r)


def latest(project):
    q = urllib.parse.urlencode({"loaders": LOADERS, "game_versions": GAME})
    versions = get(f"{API}/project/{project}/version?{q}")
    releases = [v for v in versions if v["version_type"] == "release"] or versions
    return releases[0] if releases else None


def download(version, seen):
    if version["id"] in seen:
        return
    seen.add(version["id"])
    f = next((f for f in version["files"] if f["primary"]), version["files"][0])
    path = os.path.join(OUT, f["filename"])
    print(f"download {version['project_id']} {version['version_number']} -> {f['filename']}")
    req = urllib.request.Request(f["url"], headers=HEADERS)
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as out:
        out.write(r.read())
    for dep in version.get("dependencies", []):
        if dep.get("dependency_type") != "required":
            continue
        v = get(f"{API}/version/{dep['version_id']}") if dep.get("version_id") else latest(dep["project_id"])
        if v:
            download(v, seen)


os.makedirs(OUT, exist_ok=True)
v = latest("l_enders-cataclysm")
if not v:
    sys.exit("no Cataclysm version for NeoForge 1.21.1")
download(v, set())
