/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this, no-await-in-loop */
import { EDS_DOMAIN } from './utils.js';

const jsonMap = {
  '/education/courses/cme-institute-live/chapter-1-introduction-to-cme-group-and-fundamentals-of-financial-futures-and-options.html': '/education/courses/cme-institute-live/chapter-1-introduction-to-cme-group-and-fundamentals-of-financial-futures-and-options/introduction-to-options.html',
  '/education/courses/cme-institute-live/chapter-2-practical-applications-and-strategies-of-financial-futures-and-options.html': '/education/courses/cme-institute-live/chapter-2-practical-applications-and-strategies-of-financial-futures-and-options/equity-index-futures-and-options-20.html',
  '/education/courses/hedging-with-grain-and-oilseed-futures-and-options/risk-management-for-sellers-of-commoditities.html': '/education/courses/hedging-with-grain-and-oilseed-futures-and-options/risk-management-for-sellers-of-commoditities/comparing-grain-selling-strategies.html',
  '/education/courses/hedging-with-grain-and-oilseed-futures-and-options/risk-management-strategies-for-buyers-of-commodities.html': '/education/courses/hedging-with-grain-and-oilseed-futures-and-options/risk-management-strategies-for-buyers-of-commodities/comparing-grain-buying-strategies.html',
  '/education/courses/introduction-to-agriculture/grains-oilseeds.html': '/education/courses/introduction-to-agriculture/grains-oilseeds/understanding-the-soybean-oil-delivery-process.html',
  '/education/courses/introduction-to-agriculture/livestock.html': '/education/courses/introduction-to-agriculture/livestock/understanding-seasonality-livestock.html',
  '/education/courses/introduction-to-crude-oil/crude-oil-fundamentals.html': '/education/courses/introduction-to-crude-oil/crude-oil-fundamentals/economic-data-and-crude-oil.html',
  '/education/courses/introduction-to-crude-oil/product-overview.html': '/education/courses/introduction-to-crude-oil/product-overview/monday-and-wednesday-weekly-options-on-wti-crude-oil-futures.html',
  '/education/courses/introduction-to-cryptocurrency-futures/bitcoin.html': '/education/courses/introduction-to-cryptocurrency-futures/bitcoin/btic-on-cryptocurrency-futures.html',
  '/education/courses/introduction-to-cryptocurrency-futures/ether.html': '/education/courses/introduction-to-cryptocurrency-futures/ether/how-to-trade-ether-bitcoin-ratio-futures.html',
  '/education/courses/introduction-to-cryptocurrency-futures/micro-crypto-options.html': '/education/courses/introduction-to-cryptocurrency-futures/micro-crypto-options/managing-expiration-and-exercise-for-micro-cryptocurrency-options.html',
  '/education/courses/introduction-to-cryptocurrency-futures/micro-cryptocurrency-futures.html': '/education/courses/introduction-to-cryptocurrency-futures/micro-cryptocurrency-futures/micro-ether-futures-product-overview.html',
  '/education/courses/introduction-to-cryptocurrency-futures/options-on-cryptocurrency-futures.html': '/education/courses/introduction-to-cryptocurrency-futures/options-on-cryptocurrency-futures/options-on-bitcoin-futures.html',
  '/education/courses/introduction-to-energy/introduction-to-crude-oil.html': '/education/courses/introduction-to-energy/introduction-to-crude-oil/wti-overview.html',
  '/education/courses/introduction-to-energy/introduction-to-natural-gas.html': '/education/courses/introduction-to-energy/introduction-to-natural-gas/henry-hub-options-rfq-on-cme-direct.html',
  '/education/courses/introduction-to-energy/introduction-to-power.html': '/education/courses/introduction-to-energy/introduction-to-power/managing-risk-in-the-capacity-market.html',
  '/education/courses/introduction-to-energy/introduction-to-refined-products.html': '/education/courses/introduction-to-energy/introduction-to-refined-products/learn-about-the-1-1-crack-spread.html',
  '/education/courses/market-regulation/block-trades.html': '/education/courses/market-regulation/block-trades/block-trades-tas-tam-and-btic.html',
  '/education/courses/market-regulation/cme-globex-operator-id-requirements.html': '/education/courses/market-regulation/cme-globex-operator-id-requirements/cme-globex-tag-50-id-requirements-individual-and-team-tag-50s.html',
  '/education/courses/market-regulation/disruptive-practices-prohibited.html': '/education/courses/market-regulation/disruptive-practices-prohibited/disruptive-practice-prohibited-frequently-asked-questions.html',
  '/education/courses/market-regulation/efrp.html': '/education/courses/market-regulation/efrp/efrp-prohibited-transitory-efrps.html',
  '/education/courses/market-regulation/enforcement-process.html': '/education/courses/market-regulation/enforcement-process/enforcement-process-appeals.html',
  '/education/courses/market-regulation/overview.html': '/education/courses/market-regulation/overview/market-regulation-meet-the-team.html',
  '/education/courses/market-regulation/position-limits.html': '/education/courses/market-regulation/position-limits/position-limits-position-accountability-levels.html',
  '/education/courses/market-regulation/pre-execution-communications.html': '/education/courses/market-regulation/pre-execution-communications/pre-execution-communications-overview-crossing-protocols.html',
  '/education/courses/market-regulation/rule-524-tas-tam-btic-and-taco.html': '/education/courses/market-regulation/rule-524-tas-tam-btic-and-taco/rule-524-tas-tam-btic-and-taco.html',
  '/education/courses/market-regulation/wash-trades.html': '/education/courses/market-regulation/wash-trades/wash-trades-freshening.html',
  '/education/courses/master-the-trade-futures/expanding-your-futures-knowledge.html': '/education/courses/master-the-trade-futures/expanding-your-futures-knowledge/master-the-trade-economic-events.html',
  '/education/courses/master-the-trade-futures/practice-what-youve-learned.html': '/education/courses/master-the-trade-futures/practice-what-youve-learned/master-the-trade-entering-a-trade-using-moving-averages.html',
  '/education/courses/master-the-trade-futures/take-your-trade-plan-to-the-next-level.html': '/education/courses/master-the-trade-futures/take-your-trade-plan-to-the-next-level/master-the-trade-utilizing-stop-orders.html',
  '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-bitcoin.html': '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-bitcoin/btic-on-cryptocurrency-futures.html',
  '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-ether.html': '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-ether/micro-ether-futures-product-overview.html',
  '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-options.html': '/education/courses/micro-cryptocurrency-futures-and-options-fundamentals/micro-options/strikes-and-listings-for-micro-cryptocurrency-options.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-crude-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-crude-futures/micro-henry-hub-natural-gas-futures-product-overview.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-crude-options.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-crude-options/understanding-options-on-henry-hub-natural-gas-futures.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-cryptocurrency-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-cryptocurrency-futures/managing-micro-bitcoin-futures-expiration.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-cryptocurrency-options.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-cryptocurrency-options/strikes-and-listings-for-micro-cryptocurrency-options.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-futures/managing-micro-e-mini-futures-expiration.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-options.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-options/micro-e-mini-options-strategies.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-fx-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-fx-futures/micro-fx-futures-product-overview.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-gold-and-silver-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-gold-and-silver-futures/understanding-options-on-micro-gold-futures.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-rates-products.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-rates-products/yield-futures-overview.html',
  '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-ag-futures.html': '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-ag-futures/micro-ag-futures-product-overview.html',
};

const removeCourseSpecificItem = async (document, main) => {
  const fragments = main.querySelectorAll('.xf-content-height');
  if (fragments?.length) {
    for (let i = 0; i < fragments.length; i += 1) {
      const fragment = fragments[i];
      if (fragment.querySelector('#related-courses')) {
        fragment.remove();
      }
    }
  }

  const cards = document.querySelectorAll('.slick-track');
  if (cards?.length) {
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (!card.querySelector('.quiz-item')) {
        card.remove();
      }
    }
  }

  const loginSection = document.querySelector('.blur-background .login-teaser');
  if (loginSection) {
    loginSection.remove();
  }
};

const handleFragments = (document) => {
  const fragments = document.querySelectorAll('.xf-content-height');
  if (fragments?.length) {
    fragments.forEach((fragment) => {
      // Check for accredited course fragment
      const h4 = fragment.querySelector('h4');
      if (h4?.textContent.toLowerCase().includes('accredited course')) {
        if (fragment.textContent.includes('the CFA Institute')) {
          const anchor = document.createElement('a');
          anchor.href = `${EDS_DOMAIN}/fragments/courses-lessons/accredited-courses/cfa`;
          anchor.textContent = anchor.href;
          const cells = [['Fragment'], [anchor]];
          const table = WebImporter.DOMUtils.createTable(cells, document);
          fragment.replaceWith(table);
        } else if (fragment.textContent.includes('GARP continuing education')) {
          const anchor = document.createElement('a');
          anchor.href = `${EDS_DOMAIN}/fragments/courses-lessons/accredited-courses/garp`;
          anchor.textContent = anchor.href;
          const cells = [['Fragment'], [anchor]];
          const table = WebImporter.DOMUtils.createTable(cells, document);
          fragment.replaceWith(table);
        } else {
          const anchor = document.createElement('a');
          anchor.href = `${EDS_DOMAIN}/fragments/courses-lessons/accredited-courses/other`;
          anchor.textContent = anchor.href;
          const cells = [['Fragment'], [anchor]];
          const table = WebImporter.DOMUtils.createTable(cells, document);
          fragment.replaceWith(table);
        }
      }

      // Check for feedback fragment
      const feedbackH4 = fragment.querySelector('h4#what-did-you-think-of-this-course');
      if (feedbackH4) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/courses-lessons/feedback`;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        fragment.replaceWith(table);
      }

      // Check for extend your learning fragment
      const extendH4 = fragment.querySelector('h4#extend-your-learning');
      if (extendH4) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/courses-lessons/extend-your-learning`;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        fragment.replaceWith(table);
      }
    });
  }
};

const quizBlock = (document) => {
  const quizTopDivs = document.querySelectorAll('.quiz.multipaneleditor');
  quizTopDivs.forEach((quizTopDiv) => {
    const quizzes = quizTopDiv.querySelectorAll('.quiz-item');
    const completeMessage = quizTopDiv.getAttribute('data-complete-msg');
    const inlineQuiz = quizTopDiv.getAttribute('data-is-inline-quiz') === 'true';

    if (quizzes?.length) {
      const cells = [['Quiz']];
      if (completeMessage) {
        cells.push(['Complete Message', completeMessage, '', '']);
      }
      if (inlineQuiz) {
        cells.push(['Do Not Mark Lesson As Completed', true, '', '']);
      }
      quizzes.forEach((quiz) => {
        const questionText = quiz.getAttribute('data-question');
        const questionTextWithoutQuotes = questionText.replace(/^['"]|['"]$/g, '').trim();
        const answersItems = quiz.getAttribute('data-answers-items') ? JSON.parse(quiz.getAttribute('data-answers-items')) : [];

        cells.push(['Questions', 'Options', 'Correct', 'Snippet']);
        cells.push([questionTextWithoutQuotes, answersItems[0].answerOpt,
          answersItems[0].correctAnswer || '', answersItems[0].answerSnip || '']);

        for (let i = 1; i < answersItems.length; i += 1) {
          const answer = answersItems[i];
          cells.push(['', answer.answerOpt, answer.correctAnswer || '', answer.answerSnip || '']);
        }
      });

      const table = WebImporter.DOMUtils.createTable(cells, document);
      document.querySelector('.quiz')?.replaceWith(table);
    }
  });

  // Currently multiple quizzes are not present under /education so not handling those cases
};

const moduleOrder = async (document, meta, url1) => {
  const url = new URL(url1);
  const exactURL = url.pathname;
  if (meta.Template !== 'course' && !jsonMap[exactURL]) {
    return;
  }

  try {
    let tempUrl = url1;
    if (jsonMap[exactURL]) {
      /* eslint-disable no-param-reassign */
      tempUrl = jsonMap[exactURL];
    }

    const match = tempUrl.match(/\/education\/courses\/([^/]+)/);
    if (!match) {
      return;
    }
    const coursePath = match[1]?.replace('.html', '')?.split('?')[0];
    const apiUrl = `https://www.cmegroup.com/content/cmegroup/en/education/courses/${coursePath}/jcr:content/main-content-section/section/section-elements/education_header/course-nav.courseNav.json?isProtected`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.log('Failed to fetch module data: ', response.statusText);
      return;
    }

    const data = await response.json();
    if (data?.course?.modules) {
      let tempArr = [];
      if (jsonMap[exactURL]) {
        const tempData = data.course.modules.filter((item) => item.url.includes(exactURL));
        if (tempData?.length) {
          tempArr = tempData[0]?.modules;
        }
      } else {
        tempArr = data?.course?.modules;
      }

      const order = tempArr.map((item) => item.url?.split('/').pop().replace('.html', ''));
      if (order.length > 0) {
        const ul = document.createElement('ol');
        order.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });

        meta['Modules Order'] = ul;
      }
    }
  } catch (error) {
    console.log('Error in getting module order: ', error);
  }
};

const coursesColumnsBlock = (document) => {
  const rows = document.querySelectorAll('.row');
  if (rows?.length) {
    rows.forEach((row) => {
      const columns = row.querySelectorAll('.col-md-6');
      if (columns?.length === 2) {
        const cells = [['Columns']];
        const tempArr = [];
        columns.forEach((column) => {
          tempArr.push(column.innerHTML);
        });
        cells.push(tempArr);
        const table = WebImporter.DOMUtils.createTable(cells, document);
        row.replaceWith(table);
      }
    });
  }
};

export {
  // eslint-disable-next-line import/prefer-default-export
  removeCourseSpecificItem,
  handleFragments,
  moduleOrder,
  quizBlock,
  coursesColumnsBlock,
};
