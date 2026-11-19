import Tilt from "react-parallax-tilt";
import artworkPlaceholder from "../assets/artworkPlaceholder.png";

type TrackDetailsProps = {
  artwork: string | null;
  title: string;
  artist: string;
};

export default function TrackDetails({
  artwork,
  title,
  artist,
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
          />
        </div>
      </Tilt>
      <div className="flex flex-col justify-center items-center">
        <p className="font-bold text-lg">{title}</p>
        <hr className="w-full border-dashed" />
        <p>{artist}</p>
      </div>
    </div>
  );
}
