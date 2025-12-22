import { authInitState, authReducer } from '../reducers/auth.js';
import { courseInitState, courseReducer } from '../reducers/course.js';
import { quizInitState, quizReducer } from '../reducers/quiz.js';
import { floatingElementsInitState, floatingElementsReducer } from '../reducers/floatingElements.js';
import {
  productDataInitState,
  productTabInitState,
  tabSelectionsInitState,
  globalOptionSelectionInitState,
  navigationInitState,
  productDataReducer,
  productTabReducer,
  tabSelectionsReducer,
  globalOptionSelectionReducer,
  navigationReducer,
} from '../reducers/product.js';
import { heatMapInitState, heatMapReducer } from '../reducers/heatMap.js';

class Store {
  constructor(reducer, initialState = {}) {
    this.state = initialState;
    this.reducer = reducer;
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  dispatch(action) {
    const prevState = this.state;
    const newState = this.reducer(prevState, action);

    if (JSON.stringify(newState) !== JSON.stringify(prevState)) {
      this.state = newState;

      this.listeners.forEach((listener) => {
        const { selector, callback } = listener;
        const newValue = selector(this.state);
        if (JSON.stringify(newValue) !== JSON.stringify(listener.lastValue)) {
          callback(newValue);
          listener.lastValue = newValue;
        }
      });
    }
  }

  subscribe(selector, callback) {
    const initialValue = selector(this.state);
    const listener = { selector, callback, lastValue: initialValue };
    this.listeners.push(listener);

    callback(initialValue);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

function combineReducers(reducers) {
  // eslint-disable-next-line default-param-last
  return (state = {}, action) => {
    // eslint-disable-next-line prefer-const
    let newState = {};
    let hasChanged = false;

    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in reducers) {
      const prevStateForKey = state[key];
      const nextStateForKey = reducers[key](prevStateForKey, action);
      newState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== prevStateForKey;
    }

    return hasChanged ? newState : state;
  };
}

const rootReducer = combineReducers({
  authentication: authReducer,
  courseData: courseReducer,
  quiz: quizReducer,
  floatingElements: floatingElementsReducer,
  productData: productDataReducer,
  productTab: productTabReducer,
  tabSelections: tabSelectionsReducer,
  globalOptionSelection: globalOptionSelectionReducer,
  navigation: navigationReducer,
  heatMap: heatMapReducer,
});

// eslint-disable-next-line import/prefer-default-export
export const store = new Store(rootReducer, {
  authentication: authInitState,
  courseData: courseInitState,
  quiz: quizInitState,
  floatingElements: floatingElementsInitState,
  productData: productDataInitState,
  productTab: productTabInitState,
  tabSelections: tabSelectionsInitState,
  globalOptionSelection: globalOptionSelectionInitState,
  navigation: navigationInitState,
  heatMap: heatMapInitState,
});
