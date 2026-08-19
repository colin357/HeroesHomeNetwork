#!/usr/bin/env python3
"""Build js/bah-rates-<year>.js from the published DoD BAH rate tables.

The calculator serves exact published rates, so this script is the only thing
that should ever write that data file. It downloads the two annual rate table
PDFs (with dependents / without dependents), parses every military housing area
row, checks the table's invariants, and emits the JavaScript data file.

Usage:
    pip install pypdf
    python3 tools/build-bah-rates.py                       # rebuild 2026
    python3 tools/build-bah-rates.py --year 2027 \\
        --with-url <pdf> --without-url <pdf>

DoD publishes the tables through the rate lookup at
https://www.travel.dod.mil/Allowances/Basic-Allowance-for-Housing/ — pass the
current year's PDF URLs when they change.
"""

import argparse
import io
import json
import os
import re
import sys
import urllib.request

# Column order of the published tables. O-8 through O-10 are paid at the O-7
# rate and so have no column of their own.
GRADE_KEYS = ("E01 E02 E03 E04 E05 E06 E07 E08 E09 W01 W02 W03 W04 W05 "
              "O01E O02E O03E O01 O02 O03 O04 O05 O06 O07").split()
GRADE_LABELS = ["E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9",
                "W-1", "W-2", "W-3", "W-4", "W-5",
                "O-1E", "O-2E", "O-3E", "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7"]

DEFAULT_YEAR = 2026
DEFAULT_WITH = ("https://static0.mltimages.com/wordpress/wp-content/uploads/"
                "2025-12/2026%20BAH%20Rates%20With%20Dependents.pdf")
DEFAULT_WITHOUT = ("https://static0.mltimages.com/wordpress/wp-content/uploads/"
                   "2025-12/2026%20BAH%20Rates%20Without%20Dependents.pdf")

ACRONYMS = {"AFB", "SFB", "NAS", "MCB", "MCAS", "JB", "MR", "NWS", "NAVTRACEN", "NAVORDSTA", "PT", "CO"}
STATES = set(("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV "
              "NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY").split())

# Spelling cleanups applied after title-casing the all-caps official names.
SPELLING = [("Mcclellan", "McClellan"), ("Mcconnell", "McConnell"), ("Mcguire", "McGuire"),
            ("Mccoy", "McCoy"), ("ST. Louis", "St. Louis"), ("ST Paul", "St. Paul"),
            ("ST Mary", "St. Mary"), ("Essex CO,", "Essex County,"),
            ("Fort A.p. Hill", "Fort A.P. Hill"), ("Wichita Fls", "Wichita Falls"),
            ("Twenty Nine Palms", "Twentynine Palms")]

# Names the official file gets wrong or abbreviates, plus the Army installations
# that were renamed in 2025 — shown both ways so either name finds the area.
NAME_OVERRIDE = {
    "GA073": "Fort Gordon (Fort Eisenhower), GA",   # published file labels this MHA "AL"
    "VA368": "Dahlgren/Fort A.P. Hill, VA",         # published file omits the state
    "AL002": "Fort Rucker (Fort Novosel), AL",
    "LA115": "Fort Polk (Fort Johnson), LA",
    "VA301": "Richmond/Fort Lee (Fort Gregg-Adams), VA",
}

# Installations served by each MHA. Covers every base guide under bases/ except
# Arnold AFB (Tullahoma, TN) and NAS Kingsville (TX), which fall in county cost
# groups rather than a named MHA — those members must use the DoD lookup.
BASES = {
    "AK404": "JB Elmendorf-Richardson",
    "AK405": "Eielson AFB, Fort Wainwright",
    "AL001": "Anniston Army Depot",
    "AL002": "Fort Novosel (Fort Rucker)",
    "AL003": "Redstone Arsenal",
    "AL005": "Maxwell AFB",
    "AR010": "Little Rock AFB",
    "AR012": "Fort Chaffee",
    "AZ013": "Luke AFB",
    "AZ014": "Fort Huachuca",
    "AZ015": "Davis-Monthan AFB",
    "AZ016": "MCAS Yuma, Yuma Proving Ground",
    "CA018": "Coast Guard Base Alameda",
    "CA021": "NAWS China Lake",
    "CA023": "NAS Lemoore",
    "CA024": "Camp Pendleton",
    "CA025": "NAS Point Mugu, Naval Base Ventura County",
    "CA026": "Vandenberg SFB",
    "CA028": "Fort Irwin",
    "CA032": "MCAGCC Twentynine Palms",
    "CA033": "Beale AFB",
    "CA036": "Travis AFB",
    "CA037": "Los Angeles AFB",
    "CA038": "Naval Base San Diego, NAS North Island, NAB Coronado, MCAS Miramar, MCRD San Diego",
    "CA039": "Presidio of Monterey, Naval Postgraduate School",
    "CA393": "MCMWTC Bridgeport",
    "CA420": "NAF El Centro",
    "CA457": "Edwards AFB",
    "CO045": "Buckley SFB",
    "CO046": "Fort Carson, Peterson SFB, Schriever SFB, Air Force Academy",
    "CT049": "Naval Submarine Base New London",
    "DC053": "Pentagon, Fort Belvoir, Fort Myer, JB Myer-Henderson Hall, JB Andrews, JB Anacostia-Bolling, Fort Meade area",
    "DE054": "Dover AFB",
    "FL056": "Eglin AFB, Hurlburt Field, Duke Field",
    "FL058": "NAS Jacksonville, NS Mayport",
    "FL059": "Patrick SFB, Cape Canaveral SFS",
    "FL061": "Coast Guard Base Miami Beach, US Southern Command",
    "FL063": "Tyndall AFB",
    "FL064": "NAS Pensacola, NAS Whiting Field",
    "FL066": "MacDill AFB, Coast Guard Air Station Clearwater",
    "FL069": "NAS Key West",
    "GA073": "Fort Eisenhower (Fort Gordon)",
    "GA074": "NSB Kings Bay",
    "GA075": "Fort Benning",
    "GA076": "Robins AFB",
    "GA080": "Fort Stewart, Hunter AAF",
    "GA081": "Moody AFB",
    "HI408": "JB Pearl Harbor-Hickam, Schofield Barracks, MCB Hawaii, Camp H.M. Smith, Coast Guard Base Honolulu",
    "ID086": "Mountain Home AFB",
    "IL089": "Rock Island Arsenal",
    "IL092": "Naval Station Great Lakes",
    "IL093": "Scott AFB",
    "KS100": "Fort Riley",
    "KS101": "McConnell AFB",
    "KS102": "Fort Leavenworth",
    "KY106": "Fort Campbell",
    "KY110": "Fort Knox",
    "LA115": "Fort Johnson (Fort Polk)",
    "LA116": "NAS JRB New Orleans, Coast Guard Base New Orleans",
    "LA117": "Barksdale AFB",
    "MA120": "Coast Guard Base Boston, Natick Soldier Systems Center",
    "MA124": "JB Cape Cod",
    "MA377": "Hanscom AFB",
    "MD127": "Aberdeen Proving Ground",
    "MD128": "Naval Academy, NSA Annapolis",
    "MD130": "Fort Detrick",
    "MD133": "Fort Meade",
    "MD134": "NSF Indian Head",
    "MD135": "NAS Patuxent River",
    "ME136": "Brunswick Landing",
    "MI145": "Coast Guard Sault Ste. Marie",
    "MO162": "Whiteman AFB",
    "MO163": "Fort Leonard Wood",
    "MS168": "Keesler AFB, Naval Construction Battalion Center Gulfport",
    "MS169": "Columbus AFB",
    "MS171": "NAS Meridian",
    "MT175": "Malmstrom AFB",
    "NC177": "MCAS Cherry Point",
    "NC178": "Camp Lejeune, MCAS New River",
    "NC181": "Coast Guard Base Elizabeth City",
    "NC182": "Fort Bragg, Pope Field",
    "NC183": "Seymour Johnson AFB",
    "ND190": "Grand Forks AFB",
    "ND191": "Minot AFB",
    "NE192": "Offutt AFB",
    "NH194": "Portsmouth Naval Shipyard",
    "NJ198": "Coast Guard Training Center Cape May",
    "NJ200": "Naval Weapons Station Earle",
    "NJ202": "Picatinny Arsenal",
    "NJ204": "JB McGuire-Dix-Lakehurst",
    "NM205": "Holloman AFB",
    "NM206": "Kirtland AFB",
    "NM207": "Cannon AFB",
    "NM209": "White Sands Missile Range",
    "NV211": "NAS Fallon",
    "NV212": "Nellis AFB, Creech AFB",
    "NY217": "West Point",
    "NY219": "Fort Hamilton",
    "NY222": "Griffiss Business Park (former Griffiss AFB)",
    "NY225": "Fort Drum",
    "OH231": "Wright-Patterson AFB",
    "OK235": "Altus AFB",
    "OK236": "Vance AFB",
    "OK237": "Fort Sill",
    "OK239": "Tinker AFB",
    "OR241": "Coast Guard Astoria",
    "PA247": "Carlisle Barracks, Army War College",
    "PA249": "Willow Grove",
    "RI256": "Naval Station Newport",
    "SC258": "MCRD Parris Island, MCAS Beaufort",
    "SC259": "JB Charleston",
    "SC260": "Fort Jackson",
    "SC263": "Shaw AFB",
    "SD264": "Ellsworth AFB",
    "TN268": "NSA Mid-South Millington",
    "TX270": "Dyess AFB",
    "TX275": "NAS Corpus Christi",
    "TX278": "Laughlin AFB",
    "TX279": "Fort Bliss",
    "TX284": "Goodfellow AFB",
    "TX285": "JB San Antonio: Fort Sam Houston, Lackland, Randolph",
    "TX286": "Fort Hood",
    "TX288": "Sheppard AFB",
    "TX356": "NAS Fort Worth JRB",
    "UT291": "Hill AFB",
    "VA296": "MCB Quantico",
    "VA297": "JB Langley-Eustis",
    "VA298": "Naval Station Norfolk, NAS Oceana, JEB Little Creek, Coast Guard Base Portsmouth",
    "VA301": "Fort Gregg-Adams (Fort Lee)",
    "VA368": "NSF Dahlgren, Fort A.P. Hill (Fort Walker)",
    "WA306": "Naval Base Kitsap, Puget Sound Naval Shipyard",
    "WA309": "Coast Guard Base Seattle",
    "WA310": "Fairchild AFB",
    "WA311": "JB Lewis-McChord",
    "WA312": "NAS Whidbey Island",
    "WI318": "Fort McCoy",
    "WY324": "F.E. Warren AFB",
}

ROW = re.compile(r"^([A-Z]{2}\d{3})\s+(.+?)\s+((?:\d+\s+){%d}\d+)$" % (len(GRADE_KEYS) - 1))


def fetch(url):
    if os.path.exists(url):
        return open(url, "rb").read()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def parse_pdf(blob):
    import pypdf
    reader = pypdf.PdfReader(io.BytesIO(blob))
    text = "\n".join(page.extract_text() for page in reader.pages)
    rates = {}
    for line in text.splitlines():
        match = ROW.match(line.strip())
        if not match:
            continue
        code, name, numbers = match.group(1), match.group(2), match.group(3).split()
        rates[code] = (name, [int(n) for n in numbers])
    if len(rates) < 250:
        sys.exit("only %d rows parsed — the PDF layout probably changed" % len(rates))
    return rates


def title_case(name):
    parts = []
    for token in re.split(r"(\s+|/|-)", name):
        if not token.strip() or token in ("/", "-"):
            parts.append(token)
            continue
        core = token.strip(",.")
        suffix = token[len(core):]
        if core.upper() in ACRONYMS or core.upper() in STATES:
            parts.append(core.upper() + suffix)
        elif core.upper() in ("OF", "AND", "THE"):
            parts.append(core.lower() + suffix)
        else:
            parts.append(core.capitalize() + suffix)
    out = "".join(parts)
    for old, new in SPELLING:
        out = out.replace(old, new)
    return out


def check(code, name, with_rates, without_rates):
    """Invariants the published table always satisfies."""
    junior = with_rates[:4] + without_rates[:4]
    if len(set(with_rates[:4])) != 1 or len(set(without_rates[:4])) != 1:
        sys.exit("%s (%s): E-1 through E-4 should share one rate, got %s" % (code, name, junior))
    for i, label in enumerate(GRADE_LABELS):
        if with_rates[i] < without_rates[i]:
            sys.exit("%s (%s): %s with-dependents rate is below the without-dependents rate"
                     % (code, name, label))
        if not 200 < with_rates[i] < 20000:
            sys.exit("%s (%s): %s rate %d is outside any plausible range"
                     % (code, name, label, with_rates[i]))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--year", type=int, default=DEFAULT_YEAR)
    ap.add_argument("--with-url", default=DEFAULT_WITH, help="with-dependents rate table PDF (URL or local path)")
    ap.add_argument("--without-url", default=DEFAULT_WITHOUT, help="without-dependents rate table PDF")
    ap.add_argument("--out", default=None, help="output path (default js/bah-rates-<year>.js)")
    args = ap.parse_args()

    out_path = args.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "js", "bah-rates-%d.js" % args.year)

    with_dep = parse_pdf(fetch(args.with_url))
    without_dep = parse_pdf(fetch(args.without_url))

    # ZZ rows are county cost groups for locations outside any named MHA; they
    # can't be resolved without a member's ZIP code, so the picker omits them.
    codes = sorted(c for c in with_dep if not c.startswith("ZZ") and c in without_dep)
    dropped = sorted(set(with_dep) - set(without_dep) - {c for c in with_dep if c.startswith("ZZ")})
    if dropped:
        print("warning: no without-dependents row for %s — skipped" % ", ".join(dropped))

    missing = sorted(c for c in BASES if c not in codes)
    if missing:
        sys.exit("BASES references housing areas absent from the %d table: %s" % (args.year, missing))

    rows = []
    for code in codes:
        name, w = with_dep[code]
        _, n = without_dep[code]
        check(code, name, w, n)
        display = NAME_OVERRIDE.get(code, title_case(name))
        rows.append('    "%s": [%s, [%s], [%s]],'
                    % (code, json.dumps(display), ",".join(map(str, w)), ",".join(map(str, n))))

    header = '''/* %(year)d Basic Allowance for Housing (BAH) rate table.
 *
 * Source: Department of Defense %(year)d BAH rate tables (with and without
 * dependents), effective 1 January %(year)d — the same published tables behind
 * the official DoD rate lookup at travel.dod.mil. Values are exact published
 * monthly rates, not estimates.
 *
 * Each entry is [display name, with-dependents rates, without-dependents rates].
 * Rate arrays are ordered by GRADES below. E-1 through E-4 share one rate, and
 * O-8 through O-10 are paid at the O-7 rate, per DoD policy.
 *
 * Generated by tools/build-bah-rates.py — regenerate rather than hand-edit when
 * DoD publishes the next rate year.
 */
window.BAH_TABLE = {
  year: %(year)d,
  source: 'DoD %(year)d BAH rates, effective 1 Jan %(year)d',
  GRADES: %(grades)s,
  /* MHA code: [name, withDependents[], withoutDependents[]] */
  MHA: {''' % {"year": args.year, "grades": json.dumps(GRADE_LABELS)}

    body = [header]
    body.extend(rows)
    body.append("  },")
    body.append("  /* Installations served by each MHA — powers the duty-station search. */")
    body.append("  BASES: {")
    body.extend('    "%s": %s,' % (c, json.dumps(BASES[c])) for c in sorted(BASES))
    body.append("  }")
    body.append("};")

    with open(out_path, "w") as fh:
        fh.write("\n".join(body) + "\n")
    print("wrote %s — %d housing areas, %d installations mapped"
          % (out_path, len(rows), len(BASES)))


if __name__ == "__main__":
    main()
