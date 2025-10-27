// Minimal Product App MVP logic

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function showToast(message) {
  // Use existing toast styles from search app if present; otherwise fallback to alert
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.querySelector('.toast-message').textContent = message;
    existingToast.classList.remove('hidden');
    setTimeout(() => existingToast.classList.add('hidden'), 2500);
    return;
  }
  // Simple fallback
  alert(message);
}

function setAllTabs(checked) {
  $all('.tab-checkbox').forEach((cb) => {
    cb.checked = checked;
  });
}

function getSelectedTabs() {
  return $all('.tab-checkbox')
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function onCreateProduct() {
  const name = $('#product-name')?.value?.trim() || '';
  const id = $('#product-id')?.value?.trim() || '';
  const tabs = getSelectedTabs();

  if (!name) {
    showToast('Please enter Product Name');
    return;
  }
  if (!id) {
    showToast('Please enter Product ID');
    return;
  }
  if (tabs.length === 0) {
    showToast('Please select at least one tab');
    return;
  }

  // MVP: just echo the payload for now
  const payload = { name, id, tabs };
  console.log('Create Product payload:', payload);
  showToast(`Product created: ${JSON.stringify(payload)}`);
}

function init() {
  const selectAllBtn = $('#select-all-tabs');
  const unselectAllBtn = $('#unselect-all-tabs');
  const createBtn = $('#create-product');

  selectAllBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setAllTabs(true);
  });

  unselectAllBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setAllTabs(false);
  });

  createBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    onCreateProduct();
  });
}

document.addEventListener('DOMContentLoaded', init);
