import json

with open('data.json', 'r', encoding='utf-8') as f:
    problems = json.load(f)

for p in problems:
    p['solved'] = False
    p['dateSolved'] = ''
    p['solvedFirstTime'] = ''
    p['holeInOne'] = ''
    p['isCompetent'] = ''
    p['notes'] = p.get('notes', '')  # keep notes if any

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(problems, f, indent=2)

print(f"Reset {len(problems)} problems to unsolved.")
