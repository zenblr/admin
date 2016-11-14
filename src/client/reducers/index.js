// Root reducer for app, combines other reducers.
import { combineReducers } from 'redux'
import { reducer as formReducer } from 'redux-form'
import { routerReducer } from 'react-router-redux'
//import user from './user'

const rootReducer = combineReducers({
  //user: user,
  routing: routerReducer,
  form: formReducer // Should be last.
})

export default rootReducer
