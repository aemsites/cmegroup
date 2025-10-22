import { createElement } from '../../../../scripts/utils.js';

function createFilterPills(options = {}) {
  const container = createElement('div', {
    class: 'pills-component',
  });
  const title = createElement('div', {
    class: 'filter-pills-title',
  });
  title.textContent = 'Currently filtering by:';
  const pillsWrapper = createElement('div', {
    class: 'filter-pills-wrapper',
  });

  container.appendChild(title);
  container.appendChild(pillsWrapper);

  const createPill = (text, id, type) => {
    const pill = createElement('div', {
      class: 'filter-pill',
    });
    pill.dataset.id = id;
    pill.dataset.type = type;
    const pillText = createElement('span', {
      class: 'filter-pill-text',
    });
    pillText.textContent = text;
    const removeButton = createElement('button', {
      class: 'pill-remove-btn',
    });
    removeButton.innerHTML = '×';

    pill.addEventListener('click', (e) => {
      e.stopPropagation();

      setTimeout(() => {
        pill.remove();

        if (options.onRemove) {
          options.onRemove({ text, id, type });
        }

        if (pillsWrapper.children.length === 0) {
          container.style.display = 'none';
        }
      }, 200);
    });

    pill.appendChild(pillText);
    pill.appendChild(removeButton);

    return pill;
  };

  container.addPill = (text, id, type = 'default') => {
    const pill = createPill(text, id, type);
    pillsWrapper.appendChild(pill);
    container.style.display = 'block';
  };

  container.addPills = (pills) => {
    pills.forEach((pill) => {
      container.addPill(pill.text || pill.name, pill.id, pill.type);
    });
  };

  container.removePill = (id) => {
    const pill = pillsWrapper.querySelector(`[data-id="${id}"]`);
    if (pill) {
      setTimeout(() => {
        pill.remove();
        if (pillsWrapper.children.length === 0) {
          container.style.display = 'none';
        }
      }, 200);
    }
  };

  container.clear = () => {
    while (pillsWrapper.firstChild) {
      pillsWrapper.removeChild(pillsWrapper.firstChild);
    }
    if (options.hideWhenEmpty) {
      container.style.display = 'none';
    }
  };

  container.getPills = () => Array.from(pillsWrapper.children).map((pill) => ({
    text: pill.querySelector('span').textContent,
    id: pill.dataset.id,
    type: pill.dataset.type,
  }));

  container.getPillCount = () => pillsWrapper.children.length;

  return container;
}

function createFilterPillsFromDropdowns(dropdownsContainer, options = {}) {
  const pillsContainer = createFilterPills({
    ...options,
    onRemove: (pill) => {
      if (options.onRemove) {
        options.onRemove(pill);
      }
    },
  });

  pillsContainer.syncWithDropdowns = (selections) => {
    Object.entries(selections).forEach(([type, items]) => {
      items.forEach((itemKey) => {
        const nameParts = itemKey.split('_');

        const name = nameParts.slice(0, -1).join('_');

        pillsContainer.addPill(name, itemKey, type);
      });
    });
  };
  return pillsContainer;
}

export { createFilterPills, createFilterPillsFromDropdowns };
