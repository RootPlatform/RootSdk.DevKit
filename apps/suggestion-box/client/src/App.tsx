import React from "react";
import { SuggestionCacheProvider } from "./context/SuggestionContext";
import { AddSuggestion } from "./components/AddSuggestion/AddSuggestion";
import { SuggestionList } from "./components/SuggestionList/SuggestionList";
import "./App.css";

const App: React.FC = () => {
  return (
    <SuggestionCacheProvider>
      <header className="app-navbar">
        <h1>Suggestion Box</h1>
      </header>
      <main className="app-container">
        <AddSuggestion />
        <SuggestionList />
      </main>
    </SuggestionCacheProvider>
  );
};

export default App;
