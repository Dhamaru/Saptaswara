import json
import os
from flask import Flask, render_template, request, redirect, url_for
from jinja2 import DictLoader

app = Flask(__name__)

# --- CONFIGURATION ---
CATALOGUE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raga_catalogue.json"))

# --- HTML TEMPLATES ---
BASE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Saptaswara Validator</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; }
        .progress { text-align: center; color: #7f8c8d; margin-bottom: 20px; font-weight: bold; }
        .card { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .field { margin-bottom: 10px; }
        .label { font-weight: bold; color: #34495e; min-width: 150px; display: inline-block; }
        .value { color: #2980b9; }
        .array-val { display: inline-block; background: #ecf0f1; padding: 2px 8px; border-radius: 4px; margin-right: 5px; font-size: 0.9em; }
        .actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
        button, .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; text-decoration: none; display: inline-block; text-align: center; }
        .btn-accept { background: #27ae60; color: white; }
        .btn-edit { background: #2980b9; color: white; }
        .btn-reject { background: #c0392b; color: white; }
        .btn-save { background: #27ae60; color: white; }
        .btn-cancel { background: #95a5a6; color: white; border: 1px solid #7f8c8d; }
        input[type="text"], textarea { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        textarea { height: 80px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Saptaswara Raga Validator</h1>
        <div class="progress">{{ reviewed }} / {{ total }} reviewed</div>
        {% block content %}{% endblock %}
    </div>
</body>
</html>
"""

VIEW_TEMPLATE = """
{% extends "base" %}
{% block content %}
<div class="card">
    <div class="field"><span class="label">Name:</span> <span class="value" style="font-size: 1.5em; font-weight: bold;">{{ raga.name }}</span></div>
    <div class="field"><span class="label">Thaat:</span> <span class="value">{{ raga.thaat }}</span></div>
    <div class="field"><span class="label">Jati:</span> <span class="value">{{ raga.jati }}</span></div>
    <div class="field"><span class="label">Time:</span> <span class="value">{{ raga.time_of_day }}</span></div>
    <div class="field"><span class="label">Vadi:</span> <span class="value">{{ raga.vadi }}</span></div>
    <div class="field"><span class="label">Samvadi:</span> <span class="value">{{ raga.samvadi }}</span></div>
    <div class="field">
        <span class="label">Aroha:</span>
        {% for s in raga.aroha %}<span class="array-val">{{ s }}</span>{% endfor %}
    </div>
    <div class="field">
        <span class="label">Avaroha:</span>
        {% for s in raga.avaroha %}<span class="array-val">{{ s }}</span>{% endfor %}
    </div>
    <div class="field"><span class="label">Pakad:</span> <span class="value" style="font-family: monospace;">{{ raga.pakad }}</span></div>
    <div class="field"><span class="label">Mood:</span> <span class="value">{{ raga.mood }}</span></div>
    <div class="field"><span class="label">Vishranti:</span> <span class="value">{{ raga.vishranti_sthan }}</span></div>
</div>

<div class="actions">
    <form action="{{ url_for('action', idx=idx, act='accept') }}" method="POST">
        <button type="submit" class="btn-accept">Accept & Next</button>
    </form>
    <a href="{{ url_for('edit', idx=idx) }}" class="btn btn-edit">Edit</a>
    <form action="{{ url_for('action', idx=idx, act='reject') }}" method="POST" onsubmit="return confirm('Delete this raga?');">
        <button type="submit" class="btn-reject">Reject / Delete</button>
    </form>
</div>
{% endblock %}
"""

EDIT_TEMPLATE = """
{% extends "base" %}
{% block content %}
<form action="{{ url_for('save', idx=idx) }}" method="POST">
    <div class="card">
        <div class="field"><span class="label">Name:</span> <input type="text" name="name" value="{{ raga.name }}"></div>
        <div class="field"><span class="label">Thaat:</span> <input type="text" name="thaat" value="{{ raga.thaat }}"></div>
        <div class="field"><span class="label">Jati:</span> <input type="text" name="jati" value="{{ raga.jati }}"></div>
        <div class="field"><span class="label">Time:</span> <input type="text" name="time_of_day" value="{{ raga.time_of_day }}"></div>
        <div class="field"><span class="label">Vadi:</span> <input type="text" name="vadi" value="{{ raga.vadi }}"></div>
        <div class="field"><span class="label">Samvadi:</span> <input type="text" name="samvadi" value="{{ raga.samvadi }}"></div>
        <div class="field"><span class="label">Aroha (comma-sep):</span> <input type="text" name="aroha" value="{{ raga.aroha|join(', ') }}"></div>
        <div class="field"><span class="label">Avaroha (comma-sep):</span> <input type="text" name="avaroha" value="{{ raga.avaroha|join(', ') }}"></div>
        <div class="field"><span class="label">Pakad:</span> <input type="text" name="pakad" value="{{ raga.pakad }}"></div>
        <div class="field"><span class="label">Mood:</span> <textarea name="mood">{{ raga.mood }}</textarea></div>
        <div class="field"><span class="label">Vishranti:</span> <input type="text" name="vishranti_sthan" value="{{ raga.vishranti_sthan }}"></div>
    </div>
    <div class="actions">
        <button type="submit" class="btn-save">Save Changes</button>
        <a href="{{ url_for('index') }}" class="btn btn-cancel">Cancel</a>
    </div>
</form>
{% endblock %}
"""

COMPLETE_HTML = """
{% extends "base" %}
{% block content %}
<div class="card" style="text-align: center;">
    <h2 style="color: #27ae60;">Complete!</h2>
    <p>All ragas in <code>raga_catalogue.json</code> have been reviewed and verified.</p>
    <p>The catalogue is now ready for the Saptaswara app.</p>
</div>
{% endblock %}
"""

app.jinja_loader = DictLoader({
    'base': BASE_HTML,
    'view': VIEW_TEMPLATE,
    'edit': EDIT_TEMPLATE,
    'complete': COMPLETE_HTML
})

def load_catalogue():
    if not os.path.exists(CATALOGUE_PATH):
        return []
    with open(CATALOGUE_PATH, 'r') as f:
        return json.load(f)

def save_catalogue(data):
    with open(CATALOGUE_PATH, 'w') as f:
        json.dump(data, f, indent=4)

def get_next_index(data):
    """Finds the first unverified raga index."""
    for i, raga in enumerate(data):
        if not raga.get("verified", False):
            return i
    return None

# --- ROUTES ---

@app.route('/')
def index():
    data = load_catalogue()
    idx = get_next_index(data)
    reviewed_count = sum(1 for r in data if r.get("verified", False))
    if idx is None:
        return render_template('complete', reviewed=reviewed_count, total=len(data))
    
    return render_template('view', raga=data[idx], idx=idx, reviewed=reviewed_count, total=len(data))

@app.route('/action/<int:idx>/<act>', methods=['POST'])
def action(idx, act):
    data = load_catalogue()
    if idx >= len(data): return redirect(url_for('index'))
    
    if act == 'accept':
        data[idx]['verified'] = True
        save_catalogue(data)
    elif act == 'reject':
        data.pop(idx)
        save_catalogue(data)
    
    return redirect(url_for('index'))

@app.route('/edit/<int:idx>')
def edit(idx):
    data = load_catalogue()
    reviewed_count = sum(1 for r in data if r.get("verified", False))
    return render_template('edit', raga=data[idx], idx=idx, reviewed=reviewed_count, total=len(data))

@app.route('/save/<int:idx>', methods=['POST'])
def save(idx):
    data = load_catalogue()
    raga = data[idx]
    
    raga['name'] = request.form['name']
    raga['thaat'] = request.form['thaat']
    raga['jati'] = request.form['jati']
    raga['time_of_day'] = request.form['time_of_day']
    raga['vadi'] = request.form['vadi']
    raga['samvadi'] = request.form['samvadi']
    raga['pakad'] = request.form['pakad']
    raga['mood'] = request.form['mood']
    raga['vishranti_sthan'] = request.form['vishranti_sthan']
    
    # Process arrays
    raga['aroha'] = [s.strip() for s in request.form['aroha'].split(',') if s.strip()]
    raga['avaroha'] = [s.strip() for s in request.form['avaroha'].split(',') if s.strip()]
    
    # Recalculate semitones if notes changed (optional but good)
    # Mapping for semitones
    SEMITONE_MAP = {"S": 0, "r": 1, "R": 2, "g": 3, "G": 4, "m": 5, "M": 6, "P": 7, "d": 8, "D": 9, "n": 10, "N": 11}
    unique_swaras = set(raga['aroha'] + raga['avaroha'])
    offsets = [0]
    for s in unique_swaras:
        root_s = s.replace("'", "").replace(",", "")
        if root_s == "S": continue
        if root_s in SEMITONE_MAP:
            val = SEMITONE_MAP[root_s]
            if val not in offsets: offsets.append(val)
    raga['semitones'] = sorted(offsets)
    
    # Recalculate hz_map
    hz_sa = raga.get('hz_sa', 261.63)
    hz_map = {"S": round(hz_sa, 2)}
    for s in set(raga['aroha'] + raga['avaroha']):
        root_s = s.replace("'", "").replace(",", "")
        if root_s in SEMITONE_MAP:
            offset = SEMITONE_MAP[root_s]
            hz_map[root_s] = round(hz_sa * (2 ** (offset / 12)), 2)
    raga['hz_map'] = hz_map
    
    raga['verified'] = True # Auto-verify on manual edit/save
    save_catalogue(data)
    return redirect(url_for('index'))

if __name__ == '__main__':
    print("Saptaswara Validator running on http://localhost:4000")
    app.run(host='0.0.0.0', port=4000)
