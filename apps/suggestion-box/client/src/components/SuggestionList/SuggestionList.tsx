import React, { useEffect, useState } from "react";
import { useSuggestionCacheContext } from "../../context/SuggestionContext";
import "./SuggestionList.css";
import { Timestamp } from "@suggestionbox/gen-shared";
import { rootClient } from "@rootsdk/client-app";

export const SuggestionList: React.FC = () => {
  const { suggestions, addVote, deleteSuggestion } = useSuggestionCacheContext();

  const [userVoteStatus, setUserVoteStatus] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const checkVotes = async () => {
      const statusMap = new Map<number, boolean>();

      for (const suggestion of suggestions.values()) {
        const hasVoted = suggestion.voterIds.includes(rootClient.users.getCurrentUserId());
        statusMap.set(suggestion.id, hasVoted);
      }

      setUserVoteStatus(statusMap);
    };

    checkVotes();
  }, [suggestions]);

  const handleDelete  = async (id: number) => { await deleteSuggestion(id); };
  const handleAddVote = async (id: number) => { await addVote(id); };

  return (
    <div className="suggestion-list-wrapper">
      <h2>Suggestions</h2>
      <ul className="suggestion-list">
        {Array.from(suggestions.values()).map((suggestion) => (
          <li
            key={suggestion.id}
            className="suggestion-item">
            <p className="suggestion-text">
              <strong>{suggestion.text}</strong>
            </p>
            <p className="suggestion-date">
              {Timestamp.toDate(suggestion.createdAt!).toDateString()}
            </p>
            <div className="suggestion-vote-container">
              <button
                className="vote-button"
                onClick={() => handleAddVote(suggestion.id)}
                disabled={userVoteStatus.get(suggestion.id) || false}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.2897 8.71047L6.69973 13.3005C6.30973 13.6905 6.30973 14.3205 6.69973 14.7105C7.08973 15.1005 7.71973 15.1005 8.10973 14.7105L11.9997 10.8305L15.8797 14.7105C16.2697 15.1005 16.8997 15.1005 17.2897 14.7105C17.6797 14.3205 17.6797 13.6905 17.2897 13.3005L12.6997 8.71047C12.3197 8.32047 11.6797 8.32047 11.2897 8.71047Z" fill="currentColor"/>
                </svg>
                <span className="sr-only">Vote</span>
              </button>

              <span>{suggestion.voterIds.length} votes</span>

              {suggestion.authorId === rootClient.users.getCurrentUserId() && (
                <button
                  className="delete-button"
                  onClick={() => handleDelete(suggestion.id)}
                  title="Delete Suggestion">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V9C18 7.9 17.1 7 16 7H8C6.9 7 6 7.9 6 9V19ZM9 9H15C15.55 9 16 9.45 16 10V18C16 18.55 15.55 19 15 19H9C8.45 19 8 18.55 8 18V10C8 9.45 8.45 9 9 9ZM15.5 4L14.79 3.29C14.61 3.11 14.35 3 14.09 3H9.91C9.65 3 9.39 3.11 9.21 3.29L8.5 4H6C5.45 4 5 4.45 5 5C5 5.55 5.45 6 6 6H18C18.55 6 19 5.55 19 5C19 4.45 18.55 4 18 4H15.5Z" fill="currentColor"/>
                  </svg>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
