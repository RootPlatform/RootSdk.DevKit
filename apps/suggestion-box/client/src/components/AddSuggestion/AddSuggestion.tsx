import React, { useState, useEffect } from "react";
import { useSuggestionCacheContext } from "../../context/SuggestionContext";
import "./AddSuggestion.css";

export const AddSuggestion: React.FC = () => {
  const placeholder: string = "Enter suggestion";
  const [text, setText] = useState("");

  const { createSuggestion, error, clearError } = useSuggestionCacheContext();

  const handleAddSuggestionClick = async () => {
      await createSuggestion(text);
      setText("");
  };

  // Clear error when user starts typing
  useEffect(() => {
    if (error && text.trim() !== "") {
      clearError();
    }
  }, [text, error, clearError]);

  return (
    <div className="add-suggestion">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      <div className="input-wrapper">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <button
        onClick={handleAddSuggestionClick}
        disabled={!text.trim()}>
        Create new suggestion
      </button>
    </div>
  );
};
