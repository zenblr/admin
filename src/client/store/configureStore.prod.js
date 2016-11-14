import { compose, createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import rootReducer from '../reducers'
import { browserHistory } from 'react-router'
import { syncHistoryWithStore, routerMiddleware } from 'react-router-redux'

export default function configureStore(initialState) {
  //let history = browserHistory
  //const reduxRouterMiddleware = syncHistory(history)

  const finalCreateStore = compose(
    applyMiddleware(routerMiddleware(browserHistory), thunk)
  )(createStore)

  const store = finalCreateStore(rootReducer)
  const history = syncHistoryWithStore(browserHistory, store)

  return [store, history]
}
