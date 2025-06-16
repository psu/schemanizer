import { Switch, Route } from 'wouter'

function App() {
  return (
    <Switch>
      {/* Redirect to converter.html for the main functionality */}
      <Route
        path="/"
        component={() => {
          window.location.href = '/converter.html'
          return null
        }}
      />
    </Switch>
  )
}

export default App
