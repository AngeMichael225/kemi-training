from __future__ import annotations
import json
import re
from pathlib import Path

seed = json.loads(Path('seed/kemi-training-program.json').read_text())
report = json.loads(Path('seed/import-report.json').read_text())

weeks = seed['program']['weeks']
days = [d for w in weeks for d in w['days']]
items = [i for d in days for s in d['sections'] for i in s['items']]
exercises = seed['exercises']
media = seed['exercise_media']
tests = seed['strength_tests']

checks = []
def check(name, condition, detail=''):
    checks.append((name, bool(condition), detail))

check('four workbook weeks', [w['week_number'] for w in weeks] == [1,2,3,4])
check('twelve workouts', len(days) == 12, str(len(days)))
check('140 workout items', len(items) == 140, str(len(items)))
check('33 exercises', len(exercises) == 33, str(len(exercises)))
check('27 media records', len(media) == 27, str(len(media)))
check('3 strength tests', len(tests) == 3, str(len(tests)))
check('all workout ids unique', len({i['id'] for i in items}) == len(items))
check('all exercises resolve', all(i['exercise_id'] in {e['id'] for e in exercises} for i in items))
check('source provenance retained', all(i.get('source_sheet') and i.get('source_cell') for i in items))
check('coach notes retained', any(i.get('notes') for i in items))
check('direct media retained', sum(m['media_type'] != 'external_reference' for m in media) == 10)
check('external references retained', sum(m['media_type'] == 'external_reference' for m in media) == 17)
check('program contradiction documented', any(a['code'] == 'PROGRAM_LENGTH_CONTRADICTION' for a in seed['anomalies']))
check('deadlift missing loads documented', any(a['code'] == 'DEADLIFT_TEST_WEIGHTS_MISSING' for a in seed['anomalies']))
check('Brzycki source formula present', any(t.get('formula_name') == 'Brzycki' and t.get('formula') for t in tests))
check('cardio durations normalized', any(i['item_kind']=='cardio' and i.get('prescribed_duration_sec') in (900,1200) for i in items))
check('report counts match seed', report['week_count']==len(weeks) and report['workout_day_count']==len(days) and report['workout_item_count']==len(items))

uuid_re = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
ids = [seed['program']['id']] + [w['id'] for w in weeks] + [d['id'] for d in days] + [i['id'] for i in items] + [e['id'] for e in exercises] + [m['id'] for m in media] + [t['id'] for t in tests]
check('generated ids are UUIDs', all(uuid_re.match(value) for value in ids))

failed = [entry for entry in checks if not entry[1]]
for name, ok, detail in checks:
    print(('PASS' if ok else 'FAIL'), '-', name, detail)
if failed:
    raise SystemExit(1)
print(f'PASS: {len(checks)} seed integrity checks.')
