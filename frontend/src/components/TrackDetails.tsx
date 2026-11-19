import Tilt from "react-parallax-tilt";
import artworkPlaceholder from "../assets/artworkPlaceholder.png";
import * as React from "react";

type TrackDetailsProps = {
  artwork: string | null;
  title: string;
  artist: string;
  imageRef: React.RefObject<HTMLImageElement | null>;
  handleTheme: (img: HTMLImageElement) => Promise<void>;
};

export default function TrackDetails({
  artwork,
  title,
  artist,
  imageRef,
  handleTheme,
}: TrackDetailsProps) {
  return (
    <div className="flex flex-col md:flex-row justify-center w-full items-center space-x-4">
      <Tilt
        tiltMaxAngleX={10}
        tiltMaxAngleY={10}
        perspective={1000}
        gyroscope={true}
      >
        <div className="select-none py-4">
          <img
            src={artwork ?? artworkPlaceholder}
            alt="artwork"
            className="rounded-2xl text-[0px] md:w-3xs w-screen select-none"
            crossOrigin="anonymous"
            ref={imageRef}
            onLoad={(event) => {
              void handleTheme(event.currentTarget);
            }}
          />
        </div>
      </Tilt>
      <div className="flex flex-col justify-center items-center">
        <p className="font-bold text-lg">{title}</p>
        <hr className="w-full border-dashed border-(--md-sys-color-outline-light) dark:border-(--md-sys-color-outline-dark)" />
        <p className="text-(--md-sys-color-on-surface-variant-light) dark:text-(--md-sys-color-on-surface-variant-dark)">
          {artist}
        </p>
      </div>
    </div>
  );
}
