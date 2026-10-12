import "./room.css";

export function WallScenery() {
  return (
    <div aria-hidden="true" className="room__wall">
      {/* Light from a window off the top-left, raked across the wall. */}
      <div className="room__shafts" />

      {/* Two notes pinned up where the wall is empty. */}
      <div className="room__pins">
        <span className="room__pin room__pin--one" />
        <span className="room__pin room__pin--two" />
      </div>

      {/* A print in a frame, hung slightly crooked because somebody hung it. */}
      <svg className="room__poster" viewBox="0 0 120 152">
        <rect className="room__poster-frame" height="146" rx="3" width="114" x="3" y="3" />
        <rect className="room__poster-sheet" height="134" width="102" x="9" y="9" />
        <circle className="room__poster-ink" cx="60" cy="50" r="17" />
        <path className="room__poster-rule room__poster-rule--soft" d="M17 88h86" />
        <path className="room__poster-rule" d="M17 106h86M17 118h86M17 130h58" />
      </svg>
    </div>
  );
}

export function DeskScenery() {
  return (
    <div aria-hidden="true" className="room__desk">
      {/* The mat the keyboard sits on. Most of it is behind the slab; what reads is
          the strip above it and the two ends, which is all a mat ever shows. */}
      <div className="room__mat" />

      {/* The shadow the monitor casts onto the wall behind it. This is what separates
          the hardware's silhouette from the wall — on the light theme the two sit
          about a stop and a half apart, which no amount of contrast tuning fixes but
          a soft occlusion does. */}
      <div className="room__shadow" />

      <div className="room__motes">
        {[0, 1, 2, 3, 4].map((index) => (
          <span className="room__mote" key={index} />
        ))}
      </div>

      {/* Last, so the light falls over the objects rather than under them: the pool
          the screen throws onto the wall and the desk. Behind the canvas, though —
          the DOM order here puts it after the props and before `.monitor__stage`. */}
      <div className="room__pool" />
      <div className="room__deskp" />
    </div>
  );
}
