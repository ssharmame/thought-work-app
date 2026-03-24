import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #f7f4ea 0%, #e3efe6 100%)",
          border: "1.5px solid rgba(34, 36, 44, 0.18)",
          borderRadius: "9999px",
          color: "#20222b",
          display: "flex",
          fontSize: 14,
          fontStyle: "normal",
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.04em",
          width: "100%",
        }}
      >
        TL
      </div>
    ),
    size
  )
}
