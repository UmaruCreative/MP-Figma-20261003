#!/usr/bin/env python3
"""Point every absolute self reference at a different host.

The site carries 675 absolute URLs on https://www.mpdoors.com: canonical links,
og:url, og:image, twitter:image, DC.identifier, and the @id, url and image
fields inside every JSON-LD graph. Those are correct for production and wrong
anywhere else, because a canonical pointing at another host tells Google the
real page lives there, and an og:image that 404s renders a blank social card.

Run this once after cloning, before the first deploy to a staging host, and
again with the production host at cutover.

    python3 set-host.py https://yourname.github.io/mp-doors-website --staging
    python3 set-host.py https://www.mpdoors.com --production

--staging   also writes a robots.txt that disallows everything, so a preview
            build cannot compete with the real site in search.
--production restores the robots.txt from the metadata spec.

The current host is remembered in .deploy-host, so the script always knows
what to replace and can be run repeatedly without damage.
"""
import pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent
STATE = ROOT / ".deploy-host"
DEFAULT = "https://www.mpdoors.com"
TARGETS = ["*.html", "robots.txt", "sitemap.xml", "llms.txt"]

PROD_ROBOTS = """User-agent: *
Allow: /
Disallow: /assets/product/diagram/
Disallow: /*?utm_

Sitemap: {host}/sitemap.xml

# AI and LLM crawlers are deliberately not blocked. MP Doors sells through one
# retailer and competes on being findable, and every fact on this site is
# already public on homedepot.com. See spec file 04 for the levers if that
# position changes.
"""

STAGING_ROBOTS = """# STAGING BUILD. Not for indexing.
# Restore the production file with:  python3 set-host.py <host> --production
User-agent: *
Disallow: /
"""


def current_host():
    if STATE.exists():
        return STATE.read_text(encoding="utf-8").strip()
    return DEFAULT


def main():
    args = [a for a in sys.argv[1:]]
    mode = None
    for flag in ("--staging", "--production"):
        if flag in args:
            mode = flag.lstrip("-")
            args.remove(flag)
    if len(args) != 1 or not args[0].startswith(("http://", "https://")):
        print(__doc__)
        sys.exit(1)

    new = args[0].rstrip("/")
    old = current_host().rstrip("/")

    if new == old:
        print("Host is already %s" % new)
    else:
        changed = 0
        hits = 0
        for pattern in TARGETS:
            for p in sorted(ROOT.glob(pattern)):
                s = p.read_text(encoding="utf-8")
                n = s.count(old)
                if n:
                    p.write_text(s.replace(old, new), encoding="utf-8")
                    changed += 1
                    hits += n
        STATE.write_text(new + "\n", encoding="utf-8")
        print("Rewrote %d references across %d files" % (hits, changed))
        print("  from %s" % old)
        print("    to %s" % new)

    if mode == "staging":
        (ROOT / "robots.txt").write_text(STAGING_ROBOTS, encoding="utf-8")
        print("robots.txt set to disallow all, this build will not be indexed")
    elif mode == "production":
        (ROOT / "robots.txt").write_text(PROD_ROBOTS.format(host=new), encoding="utf-8")
        print("robots.txt restored to the production directives")

    # a self check, so a bad run is caught immediately
    stale = 0
    for pattern in TARGETS:
        for p in sorted(ROOT.glob(pattern)):
            stale += p.read_text(encoding="utf-8").count(old) if old != new else 0
    print("stale references left: %d" % stale)


if __name__ == "__main__":
    main()
