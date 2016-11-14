import { compose, createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import DevTools from '../components/DevTools'
import rootReducer from '../reducers'
import { browserHistory } from 'react-router'
import { syncHistoryWithStore, routerMiddleware } from 'react-router-redux'

export default function configureStore(initialState) {
  //let history = browserHistory
  //const reduxRouterMiddleware = syncHistory(history)

  const finalCreateStore = compose(
    applyMiddleware(routerMiddleware(browserHistory), thunk),
    DevTools.instrument()
  )(createStore)

  const store = finalCreateStore(rootReducer)
  const history = syncHistoryWithStore(browserHistory, store)


  // Required for replaying actions from devtools to work
  //reduxRouterMiddleware.listenForReplays(store)
  //history.listenForReplays(store)

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers', () => {
      store.replaceReducer(rootReducer)
    })
  }

  return [store, history]
}
