import zipfile, xml.etree.ElementTree as ET, json, re
from datetime import datetime, timedelta

path = r'Leetcode Solution Tracker Sheet.xlsx'

def excel_date(n):
    try:
        n = float(n)
        if n > 0:
            base = datetime(1899, 12, 30)
            return (base + timedelta(days=n)).strftime('%Y-%m-%d')
    except:
        pass
    return ''

def title_to_slug(title):
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")

with zipfile.ZipFile(path) as z:
    with z.open('xl/sharedStrings.xml') as f:
        ss_tree = ET.parse(f)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = []
    for si in ss_tree.findall('.//ns:si', ns):
        parts = [t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
        strings.append(''.join(parts))

    with z.open('xl/_rels/workbook.xml.rels') as f:
        rels_tree = ET.parse(f)
    rels = {r.get('Id'): r.get('Target') for r in rels_tree.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}

    with z.open('xl/workbook.xml') as f:
        wb_tree = ET.parse(f)
    sheets = []
    for s in wb_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
        rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        sheets.append((s.get('name'), rels.get(rid)))

    all_problems = []
    uid = 1
    seen = {}  # track (problemNo, category) combos

    for sheet_name, sheet_path in sheets:
        if sheet_name == 'Instructions':
            continue
        try:
            with z.open('xl/' + sheet_path) as f:
                ws_tree = ET.parse(f)
            for row in ws_tree.findall('.//ns:row', ns):
                row_idx = int(row.get('r', 0))
                if row_idx == 1:
                    continue
                cells_dict = {}
                for c in row.findall('ns:c', ns):
                    ref = c.get('r', '')
                    col = ''.join(filter(str.isalpha, ref))
                    t = c.get('t', '')
                    v_el = c.find('ns:v', ns)
                    if v_el is not None and v_el.text:
                        val = v_el.text
                        if t == 's':
                            val = strings[int(val)]
                    else:
                        val = ''
                    cells_dict[col] = val

                prob_num = cells_dict.get('B', '').strip()
                title = cells_dict.get('C', '').strip()
                if not prob_num or not title:
                    continue

                date_solved_raw = cells_dict.get('A', '')
                date_solved = excel_date(date_solved_raw) if date_solved_raw else ''
                solved_first = cells_dict.get('F', '').strip().upper()
                competent = cells_dict.get('K', '').strip()
                notes = cells_dict.get('E', '').strip()
                difficulty = cells_dict.get('D', '').strip()

                slug = title_to_slug(title)
                url = 'https://leetcode.com/problems/' + slug + '/'

                problem = {
                    'id': uid,
                    'problemNo': prob_num,
                    'title': title,
                    'category': sheet_name.strip(),
                    'difficulty': difficulty,
                    'url': url,
                    'dateSolved': date_solved,
                    'solvedFirstTime': 'Y' if solved_first == 'Y' else ('N' if solved_first == 'N' else ''),
                    'holeInOne': '',
                    'isCompetent': 'Y' if competent else '',
                    'notes': notes,
                    'solved': bool(date_solved)
                }
                all_problems.append(problem)
                uid += 1
        except Exception as e:
            print(f'Error {sheet_name}: {e}')

    print(f'Total problems: {len(all_problems)}')
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_problems, f, indent=2)
    print('Written to data.json')
    for p in all_problems[:3]:
        print(p)
