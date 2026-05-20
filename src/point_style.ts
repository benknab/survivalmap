export const pointEmojiValues = [
  "📍",
  "⛺",
  "🔥",
  "💧",
  "🌲",
  "🏠",
  "⚠️",
  "💎",
  "🧰",
  "🦌",
] as const;

export const pointColorValues = [
  "#d9a6a0",
  "#e6c27a",
  "#cfd58f",
  "#a8d3b1",
  "#9ed4cf",
  "#a9c8e8",
  "#b9b0e6",
  "#d7a8d8",
  "#d3b291",
  "#b9c2a3",
] as const;

export const defaultPointEmoji = pointEmojiValues[0];
export const defaultPointColor = pointColorValues[0];

export const pointEmojiOptions = [
  { value: pointEmojiValues[0], label: "Pin" },
  { value: pointEmojiValues[1], label: "Camp" },
  { value: pointEmojiValues[2], label: "Fire" },
  { value: pointEmojiValues[3], label: "Water" },
  { value: pointEmojiValues[4], label: "Woods" },
  { value: pointEmojiValues[5], label: "Shelter" },
  { value: pointEmojiValues[6], label: "Warning" },
  { value: pointEmojiValues[7], label: "Loot" },
  { value: pointEmojiValues[8], label: "Tools" },
  { value: pointEmojiValues[9], label: "Animal" },
] as const;

export const pointColorOptions = [
  { value: pointColorValues[0], label: "Rose" },
  { value: pointColorValues[1], label: "Amber" },
  { value: pointColorValues[2], label: "Sage" },
  { value: pointColorValues[3], label: "Mint" },
  { value: pointColorValues[4], label: "Seafoam" },
  { value: pointColorValues[5], label: "Sky" },
  { value: pointColorValues[6], label: "Lavender" },
  { value: pointColorValues[7], label: "Mauve" },
  { value: pointColorValues[8], label: "Clay" },
  { value: pointColorValues[9], label: "Moss" },
] as const;
