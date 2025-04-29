import { createElement, i18n } from '../../scripts/utils.js';

async function checkQuizCompletion(block, questions) {
  const allAnsweredCorrectly = questions.every((q) => q.classList.contains('answered-correctly'));
  if (allAnsweredCorrectly && !block.querySelector('.message')) {
    const [
      quizLabel,
    ] = await Promise.all([
      i18n('Quiz complete!'),
    ]);
    const completionMessage = createElement(
      'div',
      { class: 'message' },
      createElement(
        'div',
        { class: 'message-label' },
        createElement('i', { class: 'icon' }),
      ),
      createElement('div', { class: 'message-text' }, quizLabel),
    );
    block.insertBefore(completionMessage, block.firstChild);
    block.classList.add('complete');
  }
}

function showQuestion(index, questionsWrapper, prevButton, nextButton, pag, questionsLength) {
  questionsWrapper.style.transform = `translateX(-${index * 100}%)`;

  if (prevButton) {
    prevButton.classList.toggle('arrow-disabled', index === 0);
  }
  if (nextButton) {
    nextButton.classList.toggle('arrow-disabled', index === questionsLength - 1);
  }
  if (pag) {
    pag.textContent = `${index + 1} OF ${questionsLength}`;
  }
}

export default async function decorate(block) {
  const questions = Array.from(block.querySelectorAll(':scope > div'));
  let currentIndex = 0;

  let prevButton;
  let nextButton;
  let pag;

  questions.forEach((q) => {
    const questionText = q.querySelector('p');
    if (questionText) questionText.classList.add('question-text');

    const table = q.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr')).slice(1);
    if (rows.length === 0) return;

    const optionsWrapper = createElement('div', { class: 'options-wrapper' });

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      const answer = cells[0]?.textContent?.trim();
      const isCorrect = cells[1]?.textContent?.trim().toLowerCase() === 'true';
      const snippet = cells[2]?.textContent?.trim() || '';

      const optionButton = createElement(
        'button',
        {
          type: 'button',
          class: 'option-content-answer',
          'data-index': index,
        },
        createElement('span', { class: 'option-text' }, answer),
        createElement('span', { class: 'option-icon' }),
      );

      const messageContainer = createElement('span', {
        class: 'question-message',
        style: 'display: none;',
      });

      const optionItem = createElement(
        'div',
        { class: 'option-item' },
        createElement('div', { class: 'option-content' }, optionButton),
        messageContainer,
      );

      optionButton.addEventListener('click', async () => {
        if (q.classList.contains('answered-correctly')) return;

        const allButtons = q.querySelectorAll('.option-content-answer');
        const allMessages = q.querySelectorAll('.question-message');

        allMessages.forEach((msg) => {
          msg.style.display = 'none';
          msg.classList.remove('correct', 'incorrect');
        });

        allButtons.forEach((btn) => btn.classList.remove('pressed', 'incorrect', 'correct'));

        optionButton.classList.add('pressed');

        if (isCorrect) {
          const [
            correctLabel,
          ] = await Promise.all([
            i18n('Correct'),
          ]);
          optionButton.classList.add('correct');
          q.classList.add('answered-correctly');

          allButtons.forEach((btn) => btn.disabled);

          messageContainer.classList.add('correct');
          messageContainer.innerHTML = `<span class="result">${correctLabel}</span><span class="snippet">${snippet}</span>`;
          messageContainer.style.display = 'block';

          checkQuizCompletion(block, questions);
        } else {
          const [
            incorrectLabel,
          ] = await Promise.all([
            i18n('Incorrect'),
          ]);
          optionButton.classList.add('incorrect');
          messageContainer.classList.add('incorrect');
          messageContainer.innerHTML = `<span class="result">${incorrectLabel}</span><span class="snippet">${snippet}</span>`;
          messageContainer.style.display = 'block';
        }
      });

      optionsWrapper.appendChild(optionItem);
    });

    q.innerHTML = '';
    if (questionText) q.appendChild(questionText);
    q.appendChild(optionsWrapper);
  });

  const questionsWrapper = createElement('div', { class: 'questions-wrapper' });
  questions.forEach((q) => questionsWrapper.appendChild(q));
  block.innerHTML = '';
  block.appendChild(questionsWrapper);

  if (questions.length > 1) {
    const [
      ofLabel,
    ] = await Promise.all([
      i18n('OF'),
    ]);

    prevButton = createElement('button', {
      type: 'button',
      'data-role': 'none',
      class: 'arrow arrow-prev',
      style: 'display: block;',
    });

    nextButton = createElement('button', {
      type: 'button',
      'data-role': 'none',
      class: 'arrow arrow-next',
      style: 'display: block;',
    });

    pag = createElement('span', { class: 'custom-paging-counter' });
    pag.textContent = `1 ${ofLabel} ${questions.length}`;

    prevButton.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
      }
    });

    const nav = createElement('div', { class: 'quiz-navigation' }, prevButton, pag, nextButton);
    block.appendChild(nav);
  }

  showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
  block.classList.add('showed');
}
