export type CharacterId =
  | "coco"
  | "marta"
  | "nico"
  | "beto"
  | "cami"
  | "chofer"
  | "rosa"
  | "sergio"
  | "sofia"
  | "tere"

export type Mood = "neutral" | "happy" | "surprised" | "sad" | "curious"

export type Species = "human" | "parrot"

export type HairStyle = "short" | "bun" | "long" | "curly" | "bald" | "crest"

export type Accessory = "none" | "glasses" | "beard" | "earrings" | "cap"

export type CharacterConfig = {
  name: string
  species: Species
  skin: string
  hair: string
  shirt: string
  background: string
  hairStyle: HairStyle
  accessory: Accessory
}
