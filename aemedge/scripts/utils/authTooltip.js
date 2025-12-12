/* eslint-disable import/prefer-default-export */
export function createAuthTooltip(props, children) {
  const {
    color,
    icon,
    anchorTitle,
    external,
    id: propId,
    handleRegister,
    // placement = 'top',
    isLoggedIn,
    containerClass,
    className,
    tooltipClass,
    tooltipText,
    tooltipButtonText,
    customWrapper = 'a',
    preventEvent,
    eventHandler = 'onClick',
    disabled,
    ...rest
  } = props;

  // const uniqueId = `auth-tooltip-${propId || randomId()}`;
  const uniqueId = `auth-tooltip-${propId}`;

  // const handleClick = (event) => {
  //   if (handleRegister) {
  //     handleRegister(event);
  //     return;
  //   }
  //   event.preventDefault();
  // };

  // --- 3. Anchor Element Setup (Replaces the Wrapper logic)
  // const itemClass = color ? getButtonColorClass(color, 'primary', 'btn') : '';
  const WrapperTag = customWrapper;

  const anchorElement = document.createElement(WrapperTag);
  anchorElement.setAttribute('id', uniqueId);
  // anchorElement.className = cx(itemClass, className, { disabled });

  Object.keys(rest).forEach((key) => {
    if (typeof rest[key] !== 'function') {
      anchorElement.setAttribute(key, rest[key]);
    }
  });

  if (WrapperTag === 'a') {
    anchorElement.setAttribute('rel', 'noopener noreferrer');
    anchorElement.setAttribute('role', 'button');
  }
  if (WrapperTag !== 'a' && disabled) {
    anchorElement.setAttribute('disabled', 'true');
  }
  if (anchorTitle) {
    anchorElement.setAttribute('title', anchorTitle);
  }

  const eventPropName = eventHandler.toLowerCase();
  let attachOriginalHandler = true;
  if (preventEvent && !isLoggedIn && rest[eventHandler]) {
    attachOriginalHandler = false;
  }

  // Attach the main click/specified handler if not disabled or if it's the `href` attribute for <a>
  if (eventPropName.startsWith('on') && rest[eventHandler] && attachOriginalHandler) {
    // Attach the function passed in props (e.g., the original onClick)
    anchorElement[eventPropName] = rest[eventHandler];
  }

  // --- Anchor Content (Replaces conditional rendering of children)
  if (color) {
    // Fragment equivalent: append multiple elements
    if (icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
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

    if (external) {
      const newIconSpan = document.createElement('span');
      newIconSpan.className = 'icon new-icon';
      newIconSpan.setAttribute('title', 'Open in a new window');
      anchorElement.appendChild(newIconSpan);
    }
  } else {
    // Render raw children
    // eslint-disable-next-line no-lonely-if
    if (children instanceof HTMLElement) {
      anchorElement.appendChild(children);
    } else {
      anchorElement.textContent = children;
    }
  }

  // --- 4. Tooltip Logic (Replaces conditional <Tooltip> rendering)
  const container = document.createElement('div');
  container.className = 'auth-tooltip-container';
  container.appendChild(anchorElement);

  if (disabled || !isLoggedIn) {
    // Tooltip Content structure
    const tooltipContentDiv = document.createElement('div');

    const tooltipTextDiv = document.createElement('div');
    // Assuming 'styles' are imported or available, otherwise use plain strings
    tooltipTextDiv.className = 'tooltipText'; // styles.tooltipText
    tooltipTextDiv.textContent = tooltipText || 'An account is required to continue';
    tooltipContentDiv.appendChild(tooltipTextDiv);

    if (!disabled) {
      // Button element (Replaces <Button>)
      const buttonElement = document.createElement('button');
      buttonElement.textContent = tooltipButtonText || 'Sign up or Log in';
      // buttonElement({ onClick: handleClick }
      tooltipContentDiv.appendChild(buttonElement);
    }

    // Tooltip Initialization (Replaces <Tooltip>)
    // This is a placeholder for your actual Tooltip library/framework JS call.
    // It must target the anchor element by its uniqueId.
    // const tooltipElement = tooltipElement(
    //   uniqueId,
    //   {
    //     placement,
    //     className: cx('authTooltip', tooltipClass, { disabled }),
    //   },
    //   tooltipContentDiv,
    // );
    container.appendChild(tooltipContentDiv);
  }

  return container;
}
