'use strict';
G.createFamilyExclusions = (host, families, onChange) => {
  const details = document.createElement('details');
  details.className = 'family-exclusions';
  const summary = document.createElement('summary');
  const hint = document.createElement('p');
  hint.textContent = 'Check any families you want to hide. Exclusions combine with all other filters.';
  const list = document.createElement('div'); list.className = 'family-checks';
  const boxes = [];
  const values = () => {
    const excluded = new Set(boxes.filter(box => box.checked).map(box => box.value));
    summary.textContent = `Exclude move families (${excluded.size} excluded)`;
    return excluded;
  };
  for (const family of [...new Set(families)].sort()) {
    const label = document.createElement('label'), box = document.createElement('input');
    box.type = 'checkbox'; box.value = family; box.checked = false;
    box.addEventListener('change', () => { values(); onChange(); });
    boxes.push(box);
    const text = document.createElement('span');
    text.textContent = family[0].toUpperCase() + family.slice(1);
    label.append(box, text); list.append(label);
  }
  const clear = () => { for (const box of boxes) box.checked = false; values(); };
  const button = document.createElement('button'); button.type = 'button';
  button.textContent = 'Clear exclusions';
  button.addEventListener('click', () => { clear(); onChange(); });
  details.append(summary, hint, list, button); host.append(details); values();
  return { values, clear };
};
