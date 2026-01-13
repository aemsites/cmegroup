import { generateRandomId } from '../utils.js';
import { authentication } from '../modules/Authentication.js';

function getTooltipVerticalPosition(tooltip) {
  const inputRect = tooltip.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // Estimate tooltip height
  const estimatedDatepickerHeight = inputRect.height;
  // Calculate space below the tooltip
  const spaceBelow = viewportHeight - (inputRect.top + inputRect.height);
  // Calculate space above the tooltip
  const spaceAbove = inputRect.top;

  if (spaceBelow >= estimatedDatepickerHeight || spaceBelow > spaceAbove) {
    tooltip.classList.remove('on-top');
  } else if (spaceAbove >= estimatedDatepickerHeight) {
    tooltip.classList.add('on-top');
  }
}

export function createAuthTooltip(props, children, handleRegister) {
  const {
    color,
    icon,
    href,
    isLoggedIn,
    classNames,
    tooltipClass,
    tooltipText,
    tooltipButtonText,
  } = props;

  const uniqueId = `auth-tooltip-${generateRandomId()}`;
  const container = document.createElement('div');
  container.className = 'auth-tooltip-container';
  const anchorElement = document.createElement('a');
  anchorElement.setAttribute('rel', 'noopener noreferrer');
  anchorElement.setAttribute('role', 'button');
  anchorElement.setAttribute('id', uniqueId);
  anchorElement.classList.add('button', color, ...classNames);
  const tooltipContentDiv = document.createElement('div');
  tooltipContentDiv.classList.add('tooltip-container', tooltipClass);
  let scrollTimeout;

  if (color) {
    if (icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      iconSpan.classList.add(icon);
      anchorElement.appendChild(iconSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    if (children instanceof HTMLElement) {
      textSpan.appendChild(children);
    } else {
      textSpan.textContent = children;
    }
    anchorElement.appendChild(textSpan);
  } else {
    // eslint-disable-next-line no-lonely-if
    if (children instanceof HTMLElement) {
      anchorElement.appendChild(children);
    } else {
      anchorElement.textContent = children;
    }
  }

  container.appendChild(anchorElement);

  if (!isLoggedIn) {
    // Tooltip structure
    const tooltipTextDiv = document.createElement('div');
    tooltipTextDiv.className = 'tooltip-text';
    tooltipTextDiv.textContent = tooltipText || 'An account is required to continue';
    tooltipContentDiv.appendChild(tooltipTextDiv);
    const buttonElement = document.createElement('button');
    buttonElement.classList.add('btn', 'primary');
    buttonElement.textContent = tooltipButtonText || 'Sign up or Log in';
    buttonElement.addEventListener('click', (e) => {
      e.preventDefault();
      if (handleRegister) {
        authentication.registration();
      } else {
        authentication.login();
      }
    });
    tooltipContentDiv.appendChild(buttonElement);
    container.appendChild(tooltipContentDiv);

    anchorElement.addEventListener('mouseenter', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        getTooltipVerticalPosition(tooltipContentDiv);
      }, 50);
    });

    anchorElement.addEventListener('mouseleave', () => {
      clearTimeout(scrollTimeout);
    });
  } else {
    anchorElement.setAttribute('href', href);
  }

  return container;
}

export function createSimpleAuthTooltip(container, tooltipText, handleRegister) {
  const tooltipContentDiv = document.createElement('div');
  tooltipContentDiv.classList.add('tooltip-container');
  const tooltipTextDiv = document.createElement('div');
  tooltipTextDiv.className = 'tooltip-text';
  tooltipTextDiv.textContent = tooltipText || 'An account is required to continue';
  tooltipContentDiv.appendChild(tooltipTextDiv);
  const buttonElement = document.createElement('button');
  buttonElement.classList.add('btn', 'primary');
  buttonElement.textContent = 'Sign up or Log in';
  buttonElement.addEventListener('click', (e) => {
    e.preventDefault();
    if (handleRegister) {
      authentication.registration();
    } else {
      authentication.login();
    }
  });
  tooltipContentDiv.appendChild(buttonElement);
  container.classList.add('auth-tooltip-container');
  container.appendChild(tooltipContentDiv);
  let scrollTimeout;

  container.addEventListener('mouseenter', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      getTooltipVerticalPosition(tooltipContentDiv);
    }, 50);
  });

  container.addEventListener('mouseleave', () => {
    clearTimeout(scrollTimeout);
  });
}
