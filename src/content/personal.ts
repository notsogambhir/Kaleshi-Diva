export interface MilestoneNote {
  distance: number;
  title: string;
  message: string;
}

export interface OutfitOption {
  id: "sunflower" | "dino";
  name: string;
  description: string;
  icon: string;
  unlockedAt: number; // Sunflower score milestone
}

export const PERSONAL_CONTENT = {
  playerName: "Kaleshi Diva",
  boyfriendName: "Gambhir",

  outfits: [
    {
      id: "sunflower",
      name: "Sunflower Glow",
      description: "Her signature sunny yellow flower dress",
      icon: "🌻",
      unlockedAt: 0,
    },
    {
      id: "dino",
      name: "Brachio Explorer",
      description: "Prehistoric emerald green Brachiosaurus outfit",
      icon: "🦕",
      unlockedAt: 50,
    },
  ] as OutfitOption[],

  milestoneNotes: [
    {
      distance: 25,
      title: "🌻 Cute Start!",
      message: "You're already glowing! Keep running bbg ✨",
    },
    {
      distance: 50,
      title: "💖 Look At You Go!",
      message: "50 sunflowers! Gambhir is running out of breath back there 🏃‍♂️",
    },
    {
      distance: 100,
      title: "👑 Absolute Diva!",
      message: "Century reached! You're unmatched and unstoppable! 🌟",
    },
    {
      distance: 150,
      title: "🦕 Brachio Valley Conqueror!",
      message: "Even the Brachiosaurus is impressed by your speed! 🦕💛",
    },
  ] as MilestoneNote[],

  gameOverQuotes: [
    {
      quote: "I'll always catch you, won't let you run away bbg 💛",
      author: "Gambhir",
    },
    {
      quote: "Running this fast just to end up in my arms anyway? 🥰",
      author: "Gambhir",
    },
    {
      quote: "You can dodge obstacles, but you can't dodge my love! ✨",
      author: "Gambhir",
    },
    {
      quote: "Best runner in the universe, my forever diva! 🌻",
      author: "Gambhir",
    },
  ],
};
