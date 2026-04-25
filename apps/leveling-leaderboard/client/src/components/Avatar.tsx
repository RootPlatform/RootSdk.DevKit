import React, { useEffect, useState } from "react";
import { rootClient } from "@rootsdk/client-app";
import styles from "./Avatar.module.css";

// ============================================================================
// Avatar — profile picture via rootClient.assets.toImageUrl("small"), or a
// coloured initial fallback when the URI is missing OR the image fails to
// load (broken URL, network error, etc.).
// ============================================================================

interface Props {
  profilePictureUri: string | undefined;
  nickname: string;
  size?: 24 | 32 | 40 | 48;
}

export const Avatar: React.FC<Props> = ({ profilePictureUri, nickname, size = 40 }) => {
  const initial = nickname.trim()[0]?.toUpperCase() ?? "?";
  const src = profilePictureUri
    ? rootClient.assets.toImageUrl(profilePictureUri, "small")
    : undefined;

  // Fall back to the initial if the image ever fails to load. Reset the flag
  // when the URI changes so a subsequent profile update gets a fresh attempt.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showImage = !!src && !imgFailed;

  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {showImage ? (
        <img
          className={styles.img}
          alt=""
          src={src}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={styles.initial}>{initial}</span>
      )}
    </div>
  );
};
